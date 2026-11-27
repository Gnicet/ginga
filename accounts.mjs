import { DatabaseSync } from "node:sqlite";
import { initializeCommunity, communityAction, removeAccount } from "./community.mjs";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";
import {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const derive = promisify(scrypt);
const lifetime = 60 * 60 * 24 * 14;
let connection;
export function db() {
  if (connection) return connection;
  const dir = resolve(process.env.PRACA_DATA_DIR || join(homedir(), ".praca"));
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const store = new DatabaseSync(join(dir, "contas.sqlite"));
  store.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,city TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,account TEXT NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS recovery_codes(account TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,digest TEXT NOT NULL);`);
  initializeCommunity(store);
  connection = store;
  return store;
}
const digest = (token) => createHash("sha256").update(token).digest("hex");
const tokenFrom = (req) =>
  req.headers.cookie?.match(
    /(?:^|;\s*)praca_session=([a-f0-9]{64})(?:;|$)/,
  )?.[1];
export function currentAccount(req) {
  const token = tokenFrom(req);
  return token
    ? db()
        .prepare(
          "SELECT a.id,a.name,a.email,a.city FROM sessions s JOIN accounts a ON s.account=a.id WHERE s.digest=? AND s.expires>?",
        )
        .get(digest(token), Date.now())
    : null;
}
function cookie(req, value, age) {
  const secure = req.socket.encrypted || process.env.PRACA_HTTPS === "1";
  return (
    "praca_session=" +
    value +
    "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" +
    age +
    (secure ? "; Secure" : "")
  );
}
function revoke(req) {
  const previous = tokenFrom(req);
  if (previous)
    db().prepare("DELETE FROM sessions WHERE digest=?").run(digest(previous));
}
function startSession(req, res, account) {
  const token = randomBytes(32).toString("hex");
  revoke(req);
  db().prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .run(digest(token), account.id, Date.now() + lifetime * 1000);
  res.setHeader("Set-Cookie", cookie(req, token, lifetime));
}
function problem(status, message) {
  return Object.assign(new Error(message), { status });
}
async function input(req) {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw problem(415, "Use JSON.");
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 8192) throw problem(413, "Formulário muito grande.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (value && typeof value === "object" && !Array.isArray(value))
      return value;
  } catch {}
  throw problem(400, "Formulário inválido.");
}
const attempts = new Map();
function limit(req) {
  const now = Date.now(),
    ip = req.socket.remoteAddress;
  for (const [k, v] of attempts) if (v.until <= now) attempts.delete(k);
  const bucket = attempts.get(ip) ?? { count: 0, until: now + 600000 };
  attempts.set(ip, bucket);
  if (++bucket.count > 40)
    throw problem(429, "Muitas tentativas. Tente novamente em alguns minutos.");
}
function publicFields(row) {
  return { id: row.id, email: row.email, name: row.name, city: row.city };
}
const dummySalt = randomBytes(16).toString("hex");
async function handle(req, res, route) {
  if (route === "sessao" && req.method === "GET")
    return { account: currentAccount(req) ?? null };
  if (req.method !== "POST") throw problem(405, "Método indisponível.");
  if (
    req.headers.origin &&
    !["http://" + req.headers.host, "https://" + req.headers.host].includes(
      req.headers.origin,
    )
  )
    throw problem(403, "Origem inválida.");
  const fields = await input(req);
  if (["denunciar","bloquear","desbloquear","bloqueados"].includes(route)) {
    const user = currentAccount(req);
    if (!user) throw problem(401,"Entre novamente.");
    return communityAction(db(),user.id,route,fields);
  }
  if (route === "excluir") {
    limit(req);
    const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
    const password = fields.password;
    if (fields.confirm !== "EXCLUIR" || typeof password !== "string" || !password || password.length > 256)
      throw problem(400,"Confirme a exclusão e informe sua senha.");
    const store = db();
    const row = store.prepare("SELECT id,salt,hash FROM accounts WHERE email=?").get(email);
    const candidate = await derive(password,row?.salt ?? dummySalt,64);
    if (!row || !timingSafeEqual(candidate,Buffer.from(row.hash,"hex")))
      throw problem(403,"Confira o e-mail e a senha.");
    store.exec("BEGIN IMMEDIATE");
    try {
      if (!store.prepare("SELECT id FROM accounts WHERE id=? AND hash=?").get(row.id,row.hash))
        throw problem(403,"Confira os dados da conta.");
      const ownSession = currentAccount(req)?.id === row.id;
      removeAccount(store,row.id);
      store.exec("COMMIT");
      if (ownSession) res.setHeader("Set-Cookie",cookie(req,"",0));
    } catch (err) {
      if (store.isTransaction) store.exec("ROLLBACK");
      throw err;
    }
    return {account:null,deletedId:row.id};
  }
  if (route === "codigo") {
    limit(req);
    const account = currentAccount(req);
    if (!account) throw problem(401, "Entre novamente.");
    const row = db().prepare("SELECT salt,hash FROM accounts WHERE id=?").get(account.id);
    if (typeof fields.password !== "string" || fields.password.length > 256)
      throw problem(400, "Informe a senha atual.");
    const candidate = await derive(fields.password, row.salt, 64);
    if (!timingSafeEqual(candidate, Buffer.from(row.hash, "hex")) || !currentAccount(req))
      throw problem(403, "Confira a senha atual e a sessão.");
    const code = randomBytes(16).toString("hex");
    db().prepare("INSERT OR REPLACE INTO recovery_codes(account,digest) VALUES(?,?)").run(account.id, digest(code));
    return { code };
  }
  if (route === "recuperar") {
    limit(req);
    const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
    const code = typeof fields.code === "string" ? fields.code.trim().toLowerCase() : "";
    if (typeof fields.password !== "string" || fields.password.length < 10 || fields.password.length > 256)
      throw problem(400, "Use uma nova senha de 10 a 256 caracteres.");
    const invalidCode = () => problem(400, "Confira o e-mail e o código de recuperação.");
    if (!/^[0-9a-f]{32}$/.test(code)) throw invalidCode();
    const key = digest(code);
    const row = db().prepare("SELECT a.id FROM accounts a JOIN recovery_codes r ON a.id=r.account WHERE a.email=? AND r.digest=?").get(email, key);
    if (!row) throw invalidCode();
    const salt = randomBytes(16).toString("hex");
    const hash = await derive(fields.password, salt, 64);
    const store = db();
    store.exec("BEGIN IMMEDIATE");
    try {
      if (!store.prepare("DELETE FROM recovery_codes WHERE account=? AND digest=?").run(row.id, key).changes)
        throw invalidCode();
      store.prepare("UPDATE accounts SET salt=?,hash=? WHERE id=?").run(salt, hash.toString("hex"), row.id);
      store.prepare("DELETE FROM sessions WHERE account=?").run(row.id);
      store.exec("COMMIT");
    } catch (error) {
      store.exec("ROLLBACK");
      throw error;
    }
    return { account: null };
  }
  if (route === "sair") {
    revoke(req);
    res.setHeader("Set-Cookie", cookie(req, "", 0));
    return { account: null };
  }
  if (route === "perfil") {
    const current = currentAccount(req);
    if (!current) throw problem(401, "Entre novamente.");
    const name = String(fields.name ?? "").trim();
    if (!name || name.length > 40)
      throw problem(400, "Informe um nome de até 40 caracteres.");
    db().prepare("UPDATE accounts SET name=? WHERE id=?").run(name, current.id);
    return { account: { ...current, name } };
  }
  if (!["entrar", "cadastro"].includes(route))
    throw problem(404, "Página indisponível.");
  limit(req);
  const email =
      typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "",
    password = fields.password;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    !password ||
    password.length > 256
  )
    throw problem(400, "Confira o e-mail e a senha.");
  let account;
  if (route === "cadastro") {
    const name = typeof fields.name === "string" ? fields.name.trim() : "",
      city = typeof fields.city === "string" ? fields.city.trim() : "";
    if (
      !name ||
      name.length > 40 ||
      !city ||
      city.length > 50 ||
      password.length < 10
    )
      throw problem(
        400,
        "Informe nome, cidade e uma senha com pelo menos 10 caracteres.",
      );
    const salt = randomBytes(16).toString("hex"),
      hash = await derive(password, salt, 64);
    account = { id: randomUUID(), email, name, city };
    const inserted = db()
      .prepare(
        "INSERT INTO accounts VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING",
      )
      .run(account.id, email, name, city, salt, hash.toString("hex"));
    if (!inserted.changes)
      throw problem(409, "Esse e-mail já tem cadastro. Entre com sua senha.");
  } else {
    const row = db().prepare("SELECT * FROM accounts WHERE email=?").get(email);
    const candidate = await derive(password, row?.salt ?? dummySalt, 64);
    if (!row || !timingSafeEqual(candidate, Buffer.from(row.hash, "hex")) ||
        !db().prepare("SELECT 1 FROM accounts WHERE id=? AND hash=?").get(row.id, row.hash))
      throw problem(401, "E-mail ou senha incorretos.");
    account = publicFields(row);
  }
  startSession(req, res, account);
  return { account };
}
export function accountApi(req, res, next) {
  const path = req.url.split("?")[0];
  if (!path.startsWith("/api/conta/")) return next();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  handle(req, res, path.slice("/api/conta/".length))
    .then((data) => res.end(JSON.stringify(data)))
    .catch((e) => {
      res.statusCode = e.status || 500;
      res.end(
        JSON.stringify({
          error: e.status ? e.message : "Falha ao acessar o serviço de contas.",
        }),
      );
    });
}

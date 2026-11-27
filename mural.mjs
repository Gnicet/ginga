import { randomUUID } from "node:crypto";
import { db, currentAccount, acceptedRules } from "./accounts.mjs";
import { hiddenAccounts, restricted, friendList } from "./community.mjs";
import examples from "./src/data/postais.json" with { type: "json" };

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const tribes = new Set(examples.map((c) => c.tribe));
let initialized = false;
function store() {
  const s = db();
  if (!initialized) {
    const insert = s.prepare("INSERT OR IGNORE INTO cards VALUES (?,NULL,?)");
    for (const card of [...examples].reverse())
      insert.run(card.id, JSON.stringify(card));
    initialized = true;
  }
  return s;
}
function invalid(message = "Dados inválidos.", status = 400) {
  throw Object.assign(Error(message), { status });
}
function field(value, max) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    invalid();
  return value.trim();
}
function mediaFile(s, uri, kind) {
  if (typeof uri !== "string") invalid("Arquivo inválido.");
  const comma = uri.indexOf(","),
    prefix = uri.slice(0, comma);
  const match =
    /^data:(image\/(?:jpeg|png|webp|gif)|audio\/(?:webm|ogg|mp4|wav|x-wav|mpeg|aac))(?:;codecs=[a-z0-9.,-]+)?;base64$/i.exec(
      prefix,
    );
  if (!match || !match[1].startsWith(kind + "/"))
    invalid("Formato de mídia inválido.");
  const mime = match[1].toLowerCase(),
    bytes = Buffer.from(uri.slice(comma + 1), "base64");
  if (!bytes.length || bytes.length > (kind === "image" ? 8 : 3) * 1024 * 1024)
    invalid("Tamanho de arquivo inválido.");
  const ascii = bytes.subarray(0, 12).toString("latin1"),
    hex = bytes.subarray(0, 8).toString("hex");
  const signature = {
    "image/jpeg": hex.startsWith("ffd8ff"),
    "image/png": hex === "89504e470d0a1a0a",
    "image/webp": ascii.startsWith("RIFF") && ascii.endsWith("WEBP"),
    "image/gif": /^GIF8[79]a/.test(ascii),
    "audio/webm": hex.startsWith("1a45dfa3"),
    "audio/ogg": ascii.startsWith("OggS"),
    "audio/mp4": ascii.slice(4, 8) === "ftyp",
    "audio/wav": ascii.endsWith("WAVE"),
    "audio/x-wav": ascii.endsWith("WAVE"),
    "audio/aac": bytes[0] === 255,
    "audio/mpeg": ascii.startsWith("ID3") || bytes[0] === 255,
  };
  if (!signature[mime])
    invalid("O conteúdo do arquivo não corresponde ao formato.");
  const id = randomUUID();
  s.prepare("INSERT INTO mural_files VALUES(?,?,?)").run(id, bytes, mime);
  return "/api/mural/midia/" + id;
}
function snapshot(s, account) {
  const hidden = hiddenAccounts(s, account.id);
  const rows = s
    .prepare(
      "SELECT cards.*,accounts.name FROM cards LEFT JOIN accounts ON accounts.id=cards.owner ORDER BY cards.rowid DESC",
    )
    .all();
  const cards = new Map(
    rows.filter(r => !hidden.has(r.owner)).map((r) => {
      const c = JSON.parse(r.body);
      return [
        r.id,
        {
          ...c,
          mine: r.owner === account.id,
          shared: true,
          owner: r.owner,
          author: r.name ?? c.author,
        },
      ];
    }),
  );
  const saved = [];
  for (const m of s.prepare("SELECT * FROM marks").iterate()) {
    const c = cards.get(m.card);
    if (!c || hidden.has(m.account)) continue;
    if (m.vote !== null) c.media.counts[m.vote]++;
    if (m.sticker) c.counts[m.sticker] = (c.counts[m.sticker] ?? 0) + 1;
    if (m.account === account.id) {
      if (m.saved) saved.push(c.id);
      if (m.vote !== null) c.media.vote = m.vote;
      if (m.sticker) c.sticker = m.sticker;
    }
  }
  for (const n of s
    .prepare(
      "SELECT n.id,n.card,n.text,n.audio,n.author,a.name FROM notes n JOIN accounts a ON n.author=a.id ORDER BY n.rowid",
    )
    .iterate()) {
    if (!cards.has(n.card) || hidden.has(n.author)) continue;
    cards
      .get(n.card)
      .notes.push({
        id: n.id,
        owner: n.author,
        text: n.text,
        name: n.name,
        audio: n.audio || undefined,
      });
  }
  return { cards: [...cards.values()], saved, friends: friendList(s,account.id) };
}
function publish(s, actor, c) {
  if (!c || !uuid.test(c.id)) invalid();
  const existing = s.prepare("SELECT owner FROM cards WHERE id=?").get(c.id);
  if (existing) {
    if (existing.owner !== actor.id) invalid("Identificador já usado.", 409);
    return;
  }
  const title = field(c.title, 100),
    city = field(c.city, 50);
  if (
    !tribes.has(c.tribe) ||
    !["creme", "sol", "rosa", "azul"].includes(c.paper) ||
    ![0, 1, 2].includes(c.track)
  )
    invalid();
  const m = c.media;
  let media;
  if (m?.kind === "enquete") {
    if (
      !Array.isArray(m.options) ||
      m.options.length < 2 ||
      m.options.length > 4
    )
      invalid();
    const options = m.options.map((o) => field(o, 50));
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length)
      invalid();
    media = { kind: m.kind, options, counts: options.map(() => 0) };
  } else if (m?.kind === "visual")
    media = { kind: m.kind, image: mediaFile(s, m.image, "image"), alt: title };
  else if (m?.kind === "voz")
    media = { kind: m.kind, audio: mediaFile(s, m.audio, "audio") };
  else invalid();
  s.prepare("INSERT INTO cards VALUES(?,?,?)").run(
    c.id,
    actor.id,
    JSON.stringify({
      id: c.id,
      title,
      city,
      tribe: c.tribe,
      paper: c.paper,
      track: c.track,
      media,
      counts: {},
      notes: [],
    }),
  );
}
function interact(s, actor, action) {
  const row = s
    .prepare("SELECT owner,body FROM cards WHERE id=?")
    .get(field(action.id, 80));
  if (!row || hiddenAccounts(s,actor.id).has(row.owner)) invalid("Cartão indisponível.", 404);
  if (action.type === "note") {
    const n = action.value;
    if (!n || !uuid.test(n.id)) invalid();
    const previous = s
      .prepare("SELECT author,card FROM notes WHERE id=?")
      .get(n.id);
    if (previous) {
      if (previous.author !== actor.id || previous.card !== action.id)
        invalid();
      return;
    }
    const text = typeof n.text === "string" ? n.text.trim() : "";
    if (text.length > 1000 || (!text && !n.audio)) invalid();
    const audio = n.audio ? mediaFile(s, n.audio, "audio") : null;
    s.prepare("INSERT INTO notes VALUES(?,?,?,?,?)").run(
      n.id,
      action.id,
      actor.id,
      text,
      audio,
    );
    return;
  }
  const column = action.type,
    value = action.value;
  if (column === "vote") {
    const m = JSON.parse(row.body).media;
    if (
      m.kind !== "enquete" ||
      !(
        value === null ||
        (Number.isInteger(value) && value >= 0 && value < m.options.length)
      )
    )
      invalid();
  } else if (column === "sticker") {
    if (![null, "brabo", "rachei", "salve", "palmas"].includes(value))
      invalid();
  } else if (column === "saved") {
    if (typeof value !== "boolean") invalid();
  } else invalid();
  s.prepare(
    "INSERT INTO marks(card,account," +
      column +
      ") VALUES(?,?,?) ON CONFLICT(card,account) DO UPDATE SET " +
      column +
      "=excluded." +
      column,
  ).run(action.id, actor.id, column === "saved" ? Number(value) : value);
}
async function handle(req, path) {
  const actor = currentAccount(req);
  if (!actor) invalid("Entre para acessar o mural compartilhado.", 401);
  const s = store();
  if (req.method === "GET") {
    if (path === "/api/mural") return snapshot(s, actor);
    const id = path.slice("/api/mural/midia/".length);
    const hidden = hiddenAccounts(s,actor.id);
    const ref = s.prepare(`SELECT owner,NULL AS author FROM cards WHERE coalesce(json_extract(body,'$.media.image'),json_extract(body,'$.media.audio'))=?
      UNION ALL SELECT c.owner,n.author FROM notes n JOIN cards c ON c.id=n.card WHERE n.audio=?`).get(path,path);
    const f = ref && !hidden.has(ref.owner) && !hidden.has(ref.author) &&
      path.startsWith("/api/mural/midia/") &&
      uuid.test(id) &&
      s.prepare("SELECT * FROM mural_files WHERE id=?").get(id);
    if (!f) invalid("Mídia indisponível.", 404);
    return {
      src:
        "data:" + f.mime + ";base64," + Buffer.from(f.body).toString("base64"),
    };
  }
  if (req.method !== "POST" || path !== "/api/mural")
    invalid("Rota indisponível.", 405);
  if (!req.headers["content-type"]?.startsWith("application/json"))
    invalid("Use JSON.", 415);
  if (
    req.headers.origin &&
    !["http://" + req.headers.host, "https://" + req.headers.host].includes(
      req.headers.origin,
    )
  )
    invalid("Origem inválida.", 403);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) invalid("Arquivo muito grande.", 413);
    chunks.push(chunk);
  }
  let action;
  try {
    action = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    invalid();
  }
  if (!action || typeof action !== "object") invalid();
  if (!currentAccount(req)) invalid("Entre novamente.",401);
  if (action.type !== "saved" && !acceptedRules(actor.id)) invalid("Aceite as regras da comunidade antes de publicar.",428);
  if (action.type !== "saved" && restricted(s,actor.id)) invalid("Sua conta está impedida de publicar.",403);
  s.exec("BEGIN IMMEDIATE");
  try {
    if (action.type === "publish") publish(s, actor, action.value);
    else interact(s, actor, action);
    s.exec("COMMIT");
  } catch (e) {
    s.exec("ROLLBACK");
    throw e;
  }
  return snapshot(s, actor);
}
export function muralApi(req, res, next) {
  const path = req.url.split("?")[0];
  if (path !== "/api/mural" && !path.startsWith("/api/mural/")) return next();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  handle(req, path)
    .then((body) => res.end(JSON.stringify(body)))
    .catch((e) => {
      res.statusCode = e.status || 500;
      res.end(
        JSON.stringify({
          error: e.status ? e.message : "Não foi possível acessar o Mural.",
        }),
      );
    });
}

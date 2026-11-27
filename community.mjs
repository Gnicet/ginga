import { randomUUID } from "node:crypto";

export function initializeCommunity(s) {
  s.exec(`CREATE TABLE IF NOT EXISTS cards(id TEXT PRIMARY KEY,owner TEXT REFERENCES accounts(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS marks(card TEXT NOT NULL REFERENCES cards(id),account TEXT NOT NULL REFERENCES accounts(id),vote INTEGER,sticker TEXT,saved INTEGER DEFAULT 0,PRIMARY KEY(card,account));
    CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,card TEXT NOT NULL REFERENCES cards(id),author TEXT NOT NULL REFERENCES accounts(id),text TEXT NOT NULL,audio TEXT);
    CREATE TABLE IF NOT EXISTS mural_files(id TEXT PRIMARY KEY,body BLOB NOT NULL,mime TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS room_events(room TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL,size INTEGER NOT NULL,PRIMARY KEY(room,id));
    CREATE TABLE IF NOT EXISTS blocks(actor TEXT REFERENCES accounts(id) ON DELETE CASCADE,target TEXT REFERENCES accounts(id) ON DELETE CASCADE,PRIMARY KEY(actor,target));
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,reporter TEXT REFERENCES accounts(id) ON DELETE CASCADE,kind TEXT,target TEXT,room TEXT,reason TEXT,created INTEGER,UNIQUE(reporter,kind,target,room));
    CREATE TABLE IF NOT EXISTS restrictions(account TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE);`);
}

export function hiddenAccounts(s, actor) {
  return new Set(s.prepare("SELECT target AS id FROM blocks WHERE actor=? UNION SELECT actor AS id FROM blocks WHERE target=?").all(actor, actor).map(r => r.id));
}
export function restricted(s, actor) {
  return !!s.prepare("SELECT 1 FROM restrictions WHERE account=?").get(actor);
}
function reject(status, message) {
  throw Object.assign(Error(message), { status });
}
export function targetInfo(s, kind, id, room) {
  switch (kind) {
    case "perfil": return s.prepare("SELECT id AS owner,name AS description FROM accounts WHERE id=?").get(id);
    case "cartao": return s.prepare("SELECT owner,json_extract(body,'$.title') AS description FROM cards WHERE id=? AND owner IS NOT NULL").get(id);
    case "bilhete": return s.prepare("SELECT n.author AS owner,c.owner AS parent,n.text AS description FROM notes n JOIN cards c ON c.id=n.card WHERE n.id=?").get(id);
    case "recado": return s.prepare("SELECT json_extract(body,'$.owner') AS owner,json_extract(body,'$.text') AS description FROM room_events WHERE room=? AND id=?").get(room,id);
  }
}
export function communityAction(s, actor, route, fields) {
  const id = fields.target;
  if (route === "bloqueados")
    return { accounts: s.prepare("SELECT a.id,a.name FROM blocks b JOIN accounts a ON a.id=b.target WHERE b.actor=? ORDER BY a.name").all(actor) };
  if (typeof id !== "string" || !id || id.length > 80) reject(400,"Alvo inválido.");
  if (route === "desbloquear") {
    s.prepare("DELETE FROM blocks WHERE actor=? AND target=?").run(actor,id);
    return { ok: true };
  }
  const kind = route === "bloquear" ? "perfil" : fields.kind;
  const room = kind === "recado" && typeof fields.room === "string" ? fields.room : "";
  const info = targetInfo(s,kind,id,room);
  if (!info || info.owner === actor) reject(400,"Escolha conteúdo de outra pessoa.");
  if (route === "bloquear") {
    s.prepare("INSERT OR IGNORE INTO blocks VALUES(?,?)").run(actor,id);
  } else {
    const hidden = hiddenAccounts(s, actor);
    if (hidden.has(info.owner) || hidden.has(info.parent)) reject(404,"Conteúdo indisponível.");
    if (!["Assédio ou ameaça","Spam ou golpe","Segurança infantil","Outro conteúdo abusivo"].includes(fields.reason))
      reject(400,"Selecione o motivo.");
    s.prepare("INSERT OR IGNORE INTO reports VALUES(?,?,?,?,?,?,?)").run(randomUUID(),actor,kind,id,room,fields.reason,Date.now());
  }
  return { ok: true };
}
function unusedMedia(s) {
  s.exec(`DELETE FROM mural_files WHERE '/api/mural/midia/' || id NOT IN (
    SELECT coalesce(json_extract(body,'$.media.image'),json_extract(body,'$.media.audio'),'') FROM cards
    UNION SELECT audio FROM notes WHERE audio IS NOT NULL)`);
}
export function removeCard(s,id) {
  s.prepare("DELETE FROM reports WHERE (kind='cartao' AND target=?) OR (kind='bilhete' AND target IN (SELECT id FROM notes WHERE card=?))").run(id,id);
  s.prepare("DELETE FROM notes WHERE card=?").run(id);
  s.prepare("DELETE FROM marks WHERE card=?").run(id);
  s.prepare("DELETE FROM cards WHERE id=?").run(id);
}
export function removeAccount(s,id) {
  for (const card of s.prepare("SELECT id FROM cards WHERE owner=?").all(id)) removeCard(s,card.id);
  s.prepare(`DELETE FROM reports WHERE (kind='perfil' AND target=?) OR
    (kind='bilhete' AND target IN (SELECT id FROM notes WHERE author=?)) OR
    (kind='recado' AND EXISTS(SELECT 1 FROM room_events e WHERE e.id=reports.target AND e.room=reports.room AND json_extract(e.body,'$.owner')=?))`).run(id,id,id);
  s.prepare("DELETE FROM room_events WHERE json_extract(body,'$.owner')=?").run(id);
  s.prepare("DELETE FROM notes WHERE author=?").run(id);
  s.prepare("DELETE FROM marks WHERE account=?").run(id);
  s.prepare("DELETE FROM sessions WHERE account=?").run(id);
  s.prepare("DELETE FROM accounts WHERE id=?").run(id);
  unusedMedia(s);
}
export function resolveReport(s,id,action) {
  const r = s.prepare("SELECT * FROM reports WHERE id=?").get(id);
  if (!r) throw Error("Denúncia indisponível.");
  if (action === "agir") {
    if (r.kind === "perfil") s.prepare("INSERT OR IGNORE INTO restrictions SELECT id FROM accounts WHERE id=?").run(r.target);
    if (r.kind === "cartao") removeCard(s,r.target);
    if (r.kind === "bilhete") s.prepare("DELETE FROM notes WHERE id=?").run(r.target);
    if (r.kind === "recado") s.prepare("DELETE FROM room_events WHERE room=? AND id=?").run(r.room,r.target);
    unusedMedia(s);
    s.prepare("DELETE FROM reports WHERE kind=? AND room=? AND target=?").run(r.kind,r.room,r.target);
  } else if (action === "arquivar") s.prepare("DELETE FROM reports WHERE id=?").run(id);
  else throw Error("Ação inválida.");
}

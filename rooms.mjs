import { muralApi } from "./mural.mjs";
import { hiddenAccounts, restricted } from "./community.mjs";
import { accountApi, currentAccount, db } from "./accounts.mjs";
const desks = new Map(
  ["cafe", "bola", "som", "causos"].map((id) => [id, { guests: new Map() }]),
);
function visibleGuests(desk,hidden) {
  const exists = db().prepare("SELECT 1 FROM accounts WHERE id=?");
  return [...desk.guests.values()].filter(p => Date.now()-p.seen <= 20000 && !hidden.has(p.owner) && exists.get(p.owner))
    .map(({id,name,owner}) => ({id,name,owner}));
}
const MAX_BYTES = 1500000;
export function roomApi(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/api/rodas" && !url.pathname.startsWith("/api/rodas/"))
    return next();
  const account = currentAccount(req);
  if (!account) {
    res.writeHead(401, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ error: "Entre para participar das Rodas." }));
    return;
  }
  if (url.pathname === "/api/rodas" && req.method === "GET") {
    const hidden = hiddenAccounts(db(),account.id);
    const rooms = Object.fromEntries(
      [...desks].map(([id, desk]) => [
        id,
        visibleGuests(desk,hidden),
      ]),
    );
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(rooms));
    return;
  }
  if (!url.pathname.startsWith("/api/rodas/")) return next();
  const room = url.pathname.split("/")[3],
    desk = desks.get(room);
  const send = (code, body) => {
    res.writeHead(code, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(body));
  };
  if (!desk) return send(404, { error: "Roda inexistente" });
  if (
    req.method !== "POST" ||
    !req.headers["content-type"]?.startsWith("application/json")
  )
    return send(405, { error: "Envie JSON via POST" });
  if (
    req.headers.origin &&
    req.headers.origin !== "http://" + req.headers.host &&
    req.headers.origin !== "https://" + req.headers.host
  )
    return send(403, { error: "Origem inválida" });
  let chunks = [],
    size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size <= MAX_BYTES) chunks.push(chunk);
  });
  req.on("end", () => {
    if (!currentAccount(req)) return send(401,{error:"Entre novamente."});
    if (size > MAX_BYTES) return send(413, { error: "Gravação muito grande" });
    let data;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return send(400, { error: "JSON inválido" });
    }
    if (
      !data ||
      typeof data.id !== "string" ||
      !/^[a-zA-Z0-9-]{10,64}$/.test(data.id) ||
      typeof data.name !== "string" ||
      !data.name.trim()
    )
      return send(400, { error: "Participante inválido" });
    const seatId = account.id + ":" + data.id;
    const name = account.name,
      now = Date.now();
    for (const [id, p] of desk.guests)
      if (now - p.seen > 20000) desk.guests.delete(id);
    if (data.leave) {
      desk.guests.delete(seatId);
      return send(200, { ok: true });
    }
    desk.guests.set(seatId, { id: seatId, name, seen: now, owner: account.id });
    if (data.message) {
      if (restricted(db(),account.id)) return send(403,{error:"Sua conta está impedida de publicar."});
      const m = data.message,
        text = typeof m.text === "string" ? m.text.trim().slice(0, 1000) : "",
        audio =
          typeof m.audio === "string" &&
          /^data:audio\/[\w.+;-]+(?:=[\w.-]+)?;base64,[A-Za-z0-9+/=]+$/.test(
            m.audio,
          )
            ? m.audio
            : undefined;
      const reaction = ["✌️", "👏", "🤣", "🔥"].includes(m.reaction)
        ? m.reaction
        : undefined;
      if (!text && !audio && !reaction)
        return send(400, { error: "Recado vazio" });
      if (typeof m.id !== "string" || m.id.length > 64)
        return send(400, { error: "Bilhete inválido" });
      const s = db(),
        body = JSON.stringify({ id: m.id, owner: account.id, name, text, audio, reaction });
      s.exec("BEGIN IMMEDIATE");
      try {
        s.prepare("INSERT OR IGNORE INTO room_events VALUES(?,?,?,?)").run(
          room,
          m.id,
          body,
          Buffer.byteLength(body),
        );
        s.prepare(
          `DELETE FROM room_events WHERE rowid IN (SELECT seq FROM (
          SELECT rowid AS seq, row_number() OVER (ORDER BY rowid DESC) AS pos,
          sum(size) OVER (ORDER BY rowid DESC) AS bytes FROM room_events WHERE room=?
        ) WHERE pos>60 OR bytes>5000000)`,
        ).run(room);
        s.exec("COMMIT");
      } catch {
        s.exec("ROLLBACK");
        return send(503, { error: "Não foi possível salvar o recado." });
      }
    }
    const hidden = hiddenAccounts(db(),account.id);
    const visibleIds = db().prepare("SELECT id,json_extract(body,'$.owner') AS owner FROM room_events WHERE room=?")
      .all(room).filter(row => !hidden.has(row.owner)).map(row => row.id);
    const messages = db()
      .prepare(
        "SELECT body FROM room_events WHERE room=? AND rowid>coalesce((SELECT rowid FROM room_events WHERE room=? AND id=?),0) ORDER BY rowid",
      )
      .all(room, room, typeof data.after === "string" ? data.after : "")
      .map((row) => JSON.parse(row.body)).filter(m => !hidden.has(m.owner));
    send(200, {
      visibleIds,
      guests: visibleGuests(desk,hidden),
      messages,
    });
  });
}
export default function roomsPlugin() {
  return {
    name: "praca-rodas",
    configureServer(server) {
      server.middlewares.use(accountApi);
      server.middlewares.use(muralApi);
      server.middlewares.use(roomApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(accountApi);
      server.middlewares.use(muralApi);
      server.middlewares.use(roomApi);
    },
  };
}

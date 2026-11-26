const desks = new Map(
  ["cafe", "bola", "som", "causos"].map((id) => [
    id,
    { guests: new Map(), messages: [] },
  ]),
);
const MAX_BYTES = 1500000;
export function roomApi(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/rodas" && req.method === "GET") {
    const rooms = Object.fromEntries(
      [...desks].map(([id, desk]) => [
        id,
        [...desk.guests.values()]
          .filter((p) => Date.now() - p.seen <= 20000)
          .map(({ id, name }) => ({ id, name })),
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
  const desk = desks.get(url.pathname.split("/")[3]);
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
    const name = data.name.trim().slice(0, 60),
      now = Date.now();
    for (const [id, p] of desk.guests)
      if (now - p.seen > 20000) desk.guests.delete(id);
    if (data.leave) {
      desk.guests.delete(data.id);
      return send(200, { ok: true });
    }
    desk.guests.set(data.id, { id: data.id, name, seen: now });
    if (data.message) {
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
      if (!desk.messages.some((x) => x.id === m.id))
        desk.messages.push({ id: m.id, name, text, audio, reaction });
      while (
        desk.messages.length > 60 ||
        desk.messages.reduce((n, m) => n + (m.audio?.length || 0), 0) > 5000000
      )
        desk.messages.shift();
    }
    const after = desk.messages.findIndex((m) => m.id === data.after);
    send(200, {
      guests: [...desk.guests.values()].map(({ id, name }) => ({ id, name })),
      messages: desk.messages.slice(after + 1),
    });
  });
}
export default function roomsPlugin() {
  return {
    name: "praca-rodas",
    configureServer(server) {
      server.middlewares.use(roomApi);
    },
    configurePreviewServer(server) {
      server.middlewares.use(roomApi);
    },
  };
}

import { useAccess } from "./Access";
import { apiRequest } from "../roomRequest";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Send } from "lucide-react";
import { rooms } from "../data/praca";
import { usePlaza } from "../context/Praca";
import type { RoomEvent, RoomSnapshot, Guest } from "../types/praca";
import { Player, Recorder } from "./Audio";
import { CommunityActions } from "./Community";
type Room = (typeof rooms)[number];
export function Rodas() {
  const { account, exit } = useAccess();
  const [room, enter] = useState<Room>(),
    { set } = usePlaza();
  const [seats, seat] = useState<Record<string, Guest[]>>({});
  useEffect(() => {
    if (room || !account) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const r = await apiRequest("/api/rodas", { signal: controller.signal });
        if (r.ok) seat(await r.json());
      } catch {
        /* The lobby remains navigable while reconnecting. */
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [room, account]);
  if (room) return <Sala room={room} leave={() => enter(undefined)} />;
  return (
    <div className="tables">
      {rooms.map((r) => (
        <article key={r.id} className={"table-card " + r.paper}>
          <div className="table-art">
            <div className="mesa">{r.icon}</div>
            {(seats[r.id]?.length
              ? seats[r.id].slice(0, 3).map((g) => g.name)
              : r.hosts
            ).map((h, i) => (
              <div className={"avatar seat seat" + i} key={i} aria-label={h}>
                {h.slice(0, 1)}
              </div>
            ))}
          </div>
          <div className="table-text">
            <span className="live">
              <i />{" "}
              {seats[r.id]?.length
                ? seats[r.id].length + " na mesa"
                : "Roda aberta"}
            </span>
            <h2>{r.name}</h2>
            <p>{r.topic}</p>
            <small>Anfitriões · {r.hosts.join(", ")}</small>
            <button
              className="outline"
              onClick={() => {
                if (!account) {
                  void exit();
                  return;
                }
                set((s) => ({
                  ...s,
                  profile: {
                    ...s.profile,
                    visited: [...new Set([...s.profile.visited, r.id])],
                  },
                }));
                enter(r);
              }}
            >
              {account ? "Sentar na roda" : "Entrar para conversar"}{" "}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
function Sala({ room, leave }: { room: Room; leave: () => void }) {
  const { state } = usePlaza(),
    name = state.profile.name;
  const [id] = useState(() => crypto.randomUUID()),
    [messages, update] = useState<RoomEvent[]>([]),
    [guests, present] = useState<Guest[]>([]),
    [text, write] = useState(""),
    [audio, voice] = useState(""),
    [error, fail] = useState(""),
    [busy, wait] = useState(false),
    [floating, float] = useState<RoomEvent[]>([]);
  const cursor = useRef(""),
    alive = useRef(false),
    pending = useRef(false),
    initialized = useRef(false);
  async function sync(message?: Partial<RoomEvent>) {
    const response = await apiRequest("/api/rodas/" + room.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, id, after: cursor.current, message }),
    });
    if (!response.ok) throw Error("Falha na conexão");
    const data: RoomSnapshot = await response.json();
    if (!alive.current) return;
    present(data.guests);
    fail("");
    if (data.visibleIds) {
      const visible = new Set(data.visibleIds);
      update(old => old.filter(m => visible.has(m.id)));
      float(old => old.filter(m => visible.has(m.id)));
    }
    if (data.messages.length) {
      const last = data.messages.at(-1)!;
      cursor.current = last.id;
      update((old) =>
        [
          ...new Map([...old, ...data.messages].map((m) => [m.id, m])).values(),
        ].slice(-60),
      );
      if (initialized.current && data.messages.some((m) => m.reaction))
        float(data.messages.filter((m) => m.reaction).slice(-5));
    }
    initialized.current = true;
  }
  useEffect(() => {
    alive.current = true;
    const poll = () => {
      if (pending.current) return;
      pending.current = true;
      void sync()
        .catch(() => {
          if (alive.current) fail("Conexão interrompida. Tentando de novo…");
        })
        .finally(() => {
          pending.current = false;
        });
    };

    poll();
    window.addEventListener("praca-block",poll);
    const timer = setInterval(poll, 1800);
    return () => {
      alive.current = false;
      clearInterval(timer);
      window.removeEventListener("praca-block",poll);
      void apiRequest("/api/rodas/" + room.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, leave: true }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [room.id, id, name]);
  async function send(reaction?: string) {
    if (busy || (!reaction && !audio && !text.trim())) return;
    wait(true);
    try {
      await sync({
        id: crypto.randomUUID(),
        text: reaction ? "" : text.trim(),
        audio: reaction ? undefined : audio,
        reaction,
      });
      if (!reaction) {
        write("");
        voice("");
      }
    } catch {
      fail("Falha no envio. Seu recado continua aqui.");
    } finally {
      wait(false);
    }
  }
  return (
    <section className="room">
      <button className="outline" onClick={leave}>
        <ArrowLeft size={15} /> Mesas
      </button>
      <h2>
        {room.icon} {room.name}
      </h2>
      <p>{room.topic}</p>
      <div className="live">
        <i />
        {guests.length} na mesa · {guests.map((g) => g.name).join(", ")}
      </div>
      <small>Esta roda guarda até 60 recados recentes.</small>
      <details><summary>Participantes</summary>{guests.map(g => <div key={g.id}>{g.name}
        {g.owner && <CommunityActions kind="perfil" target={g.owner} owner={g.owner} />}
      </div>)}</details>
      <div className="conversation" aria-live="polite">
        {messages
          .filter((m) => !m.reaction)
          .map((m) => (
            <div className="note" key={m.id}>
              <b>{m.name}</b>
              <p>{m.text}</p>
              {m.audio && <Player src={m.audio} label="Recado de voz" wave />}
              <CommunityActions kind="recado" target={m.id} owner={m.owner} room={room.id} />
            </div>
          ))}
        {!messages.some((m) => !m.reaction) && (
          <p>Puxe a primeira cadeira e comece a conversa.</p>
        )}
      </div>
      <div className="floating" aria-live="polite">
        {floating.map((m) => (
          <span
            key={m.id}
            onAnimationEnd={() =>
              float((list) => list.filter((v) => v.id !== m.id))
            }
          >
            {m.reaction}
          </span>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label>
          Seu recado
          <input
            maxLength={1000}
            value={text}
            onChange={(e) => write(e.target.value)}
          />
        </label>
        <Recorder limit={15} onAudio={voice} />
        {audio && <Player src={audio} label="Sua gravação" />}
        <button className="primary" disabled={busy || (!text.trim() && !audio)}>
          <Send size={15} /> Enviar
        </button>
      </form>
      <div className="stickers">
        {["✌️", "👏", "🤣", "🔥"].map((r) => (
          <button
            disabled={busy}
            key={r}
            onClick={() => void send(r)}
            aria-label={"Reagir " + r}
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

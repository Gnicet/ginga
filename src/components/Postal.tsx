import { useState } from "react";
import { Bookmark, Mail, MapPin, MessageSquare, Vote, Mic } from "lucide-react";
import { usePlaza } from "../context/Praca";
import { tracks, trackUrl } from "../data/praca";
import { stickers, type Card, type Sticker } from "../types/praca";
import { Player, Recorder } from "./Audio";
import { Dialog } from "./shared/Dialog";
export const formatName = {
  visual: "Cartão visual",
  voz: "Recado de voz",
  enquete: "Enquete de rua",
};
export function Stamp({ city }: { city: string }) {
  return (
    <span className="stamp">
      <MapPin size={10} />
      {city}
    </span>
  );
}
function Ballot({ card }: { card: Card }) {
  const { edit } = usePlaza();
  const media = card.media;
  if (media.kind !== "enquete") return null;
  const total = media.counts.reduce((a, b) => a + b, 0);
  return (
    <div className="ballot">
      {media.options.map((option, i) => {
        const pct = total ? Math.round((100 * media.counts[i]) / total) : 0;
        return (
          <button
            key={i}
            aria-pressed={media.vote === i}
            onClick={() =>
              edit(card.id, (c) => {
                if (c.media.kind !== "enquete") return c;
                const prev = c.media,
                  counts = [...prev.counts];
                if (prev.vote !== undefined) counts[prev.vote]--;
                const vote = prev.vote === i ? undefined : i;
                if (vote !== undefined) counts[vote]++;
                return { ...c, media: { ...prev, vote, counts } };
              })
            }
          >
            <i style={{ width: pct + "%" }} />
            <span>
              {media.vote === i ? "✓ " : ""}
              {option}
            </span>
            <b>{pct}%</b>
          </button>
        );
      })}
      <small>{total} votos</small>
    </div>
  );
}
export function Postal({
  card,
  open,
  detail = false,
}: {
  card: Card;
  open?: (id: string) => void;
  detail?: boolean;
}) {
  const { state, edit, save } = usePlaza(),
    m = card.media;
  const Icon = m.kind === "voz" ? Mic : m.kind === "enquete" ? Vote : Mail;
  const [adhesives, show] = useState(false);
  function stick(type: Sticker) {
    edit(card.id, (c) => {
      const counts = { ...c.counts };
      if (c.sticker) counts[c.sticker] = (counts[c.sticker] ?? 1) - 1;
      const sticker = c.sticker === type ? undefined : type;
      if (sticker) counts[sticker] = (counts[sticker] ?? 0) + 1;
      return { ...c, sticker, counts };
    });
    show(false);
  }
  return (
    <article
      className={
        "postal " + card.paper + " " + m.kind + (detail ? " opened" : "")
      }
      onClick={(e) => {
        if (!detail && !(e.target as HTMLElement).closest("button,input,audio"))
          open?.(card.id);
      }}
    >
      <div className="postal-top">
        <span className="format">
          <Icon size={13} />
          {formatName[m.kind]}
        </span>
        <button
          className="bookmark"
          aria-label="Guardar cartão"
          aria-pressed={state.saved.includes(card.id)}
          onClick={() => save(card.id)}
        >
          <Bookmark
            size={16}
            fill={state.saved.includes(card.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      {m.kind === "visual" && (
        <div className="picture">
          <img src={m.image} alt={m.alt} />
          <Stamp city={card.city} />
        </div>
      )}
      <div className="postal-body">
        {m.kind !== "visual" && <Stamp city={card.city} />}
        <h2>
          {detail ? (
            card.title
          ) : (
            <button onClick={() => open?.(card.id)}>{card.title}</button>
          )}
        </h2>
        {m.kind === "voz" ? (
          <Player src={m.audio} label="Ouvir recado" wave />
        ) : m.kind === "enquete" ? (
          <Ballot card={card} />
        ) : (
          <Player src={trackUrl(card.track)} label={tracks[card.track]} />
        )}
        {detail && m.kind !== "visual" && (
          <Player src={trackUrl(card.track)} label={tracks[card.track]} />
        )}
        <div className="byline">
          <b>{card.author}</b>
          <span>{card.tribe}</span>
        </div>
      </div>
      <footer>
        <button aria-expanded={adhesives} onClick={() => show(!adhesives)}>
          {stickers[card.sticker ?? "salve"].split(" ")[0]}{" "}
          <b>{Object.values(card.counts).reduce((a, b) => a + b, 0)}</b>
          <span> adesivos</span>
        </button>
        {!detail && (
          <button aria-label="Abrir bilhetes" onClick={() => open?.(card.id)}>
            <MessageSquare size={14} />
            {card.notes.length}
          </button>
        )}
      </footer>
      {adhesives && (
        <div className="stickers">
          {(Object.keys(stickers) as Sticker[]).map((k) => (
            <button
              key={k}
              aria-pressed={card.sticker === k}
              onClick={() => stick(k)}
            >
              {stickers[k]}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
export function OpenPostal({ card, close }: { card: Card; close: () => void }) {
  const { edit, state } = usePlaza(),
    [text, write] = useState(""),
    [audio, record] = useState("");
  return (
    <Dialog title="Cartão postal aberto" onClose={close}>
      <div className="split">
        <Postal card={card} detail />
        <section className="notes">
          <h3>
            Bilhetes <small>{card.notes.length}</small>
          </h3>
          {card.notes.map((n) => (
            <div className="note" key={n.id}>
              <b>{n.name}</b>
              <p>{n.text}</p>
              {n.audio && <Player src={n.audio} label="Bilhete de voz" wave />}
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim() && !audio) return;
              const note = {
                id: crypto.randomUUID(),
                name: state.profile.name,
                text: text.trim(),
                audio,
              };
              edit(card.id, (c) => ({ ...c, notes: [...c.notes, note] }));
              write("");
              record("");
            }}
          >
            <label>
              Seu bilhete
              <textarea
                maxLength={1000}
                value={text}
                onChange={(e) => write(e.target.value)}
              />
            </label>
            <Recorder limit={15} onAudio={record} />
            {audio && <Player src={audio} label="Sua gravação" />}
            <button className="primary" disabled={!text.trim() && !audio}>
              Colar bilhete
            </button>
          </form>
        </section>
      </div>
    </Dialog>
  );
}

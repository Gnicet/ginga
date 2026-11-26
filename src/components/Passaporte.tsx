import { useAccess } from "./Access";
import { useState } from "react";
import { Moon, Sun, Disc3, Stamp as StampIcon } from "lucide-react";
import { usePlaza } from "../context/Praca";
import { rooms, tracks, trackUrl } from "../data/praca";
import { Postal, Stamp } from "./Postal";
import { Player } from "./Audio";
export function Passaporte({ open }: { open: (id: string) => void }) {
  const { account, exit, rename } = useAccess();
  const [accountError, report] = useState("");
  const { state, set } = usePlaza(),
    p = state.profile,
    [saved, tab] = useState(false),
    [name, write] = useState(p.name);
  const cards = state.cards.filter((c) =>
    saved ? state.saved.includes(c.id) : c.mine,
  );
  const cities = [
    ...new Set([
      p.city,
      ...state.cards.filter((c) => c.mine).map((c) => c.city),
    ]),
  ];
  return (
    <>
      <div className="passport">
        <section className="identity">
          <StampIcon size={26} />
          <h2>{p.name}</h2>
          <Stamp city={p.city} />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const next = name.trim();
              if (account && next) {
                try {
                  await rename(next);
                  report("");
                } catch {
                  report("Não foi possível salvar o nome da conta.");
                  return;
                }
              }
              if (next)
                set((s) => ({
                  ...s,
                  profile: { ...s.profile, name: next },
                  cards: s.cards.map((c) =>
                    c.mine ? { ...c, author: next } : c,
                  ),
                }));
            }}
          >
            <label>
              Nome na Praça
              <input
                value={name}
                maxLength={40}
                required
                onChange={(e) => write(e.target.value)}
              />
            </label>
            {name.trim() !== p.name && (
              <button className="outline" disabled={!name.trim()}>
                Salvar nome
              </button>
            )}
          </form>
          {account && <small>{account.email}</small>}
          <button
            className="outline"
            onClick={() =>
              void exit().catch(() =>
                report(
                  "Não foi possível sair. Confira a conexão e tente novamente.",
                ),
              )
            }
          >
            {account ? "Sair da conta" : "Entrar ou criar conta"}
          </button>
          {accountError && <p role="alert">{accountError}</p>}
          <button
            className="outline"
            onClick={() => set((s) => ({ ...s, night: !s.night }))}
          >
            {state.night ? <Sun size={16} /> : <Moon size={16} />}{" "}
            {state.night ? "Modo Dia" : "Modo Noite"}
          </button>
        </section>
        <section>
          <h3>
            <Disc3 /> Minha Vitrola
          </h3>
          <label>
            Assinatura musical
            <select
              value={p.track}
              onChange={(e) => {
                const track = +e.target.value;
                set((s) => ({ ...s, profile: { ...s.profile, track } }));
              }}
            >
              {tracks.map((t, i) => (
                <option key={t} value={i}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Player
            key={p.track}
            label={tracks[p.track]}
            src={trackUrl(p.track)}
          />
        </section>
        <section>
          <h3>Carimbos do passaporte</h3>
          <div className="collection">
            {cities.map((c) => (
              <Stamp key={c} city={c} />
            ))}
            {rooms
              .filter((r) => p.visited.includes(r.id))
              .map((r) => (
                <span className="stamp" key={r.id}>
                  {r.icon} {r.name}
                </span>
              ))}
          </div>
        </section>
      </div>
      <div className="segments tabs">
        <button aria-pressed={!saved} onClick={() => tab(false)}>
          Mural pessoal
        </button>
        <button aria-pressed={saved} onClick={() => tab(true)}>
          Baú de guardados
        </button>
      </div>
      {cards.length ? (
        <div className="grid">
          {cards.map((c) => (
            <Postal key={c.id} card={c} open={open} />
          ))}
        </div>
      ) : (
        <p className="empty">
          {saved
            ? "Use o marcador de um cartão para guardá-lo no baú."
            : "Cole seu primeiro cartão no Mural."}
        </p>
      )}
    </>
  );
}

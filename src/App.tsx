import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Armchair,
  BookOpen,
  Plus,
  Flower2,
  Sun,
  Moon,
  SlidersHorizontal,
} from "lucide-react";
import { usePlaza } from "./context/Praca";
import { tribes, type Tribe } from "./types/praca";
import { OpenPostal, Postal } from "./components/Postal";
import { Composer } from "./components/Composer";
import { Passaporte } from "./components/Passaporte";
import { Rodas } from "./components/Rodas";
const nav = [
  { id: "mural", label: "Mural", icon: LayoutGrid },
  { id: "rodas", label: "Rodas", icon: Armchair },
  { id: "passaporte", label: "Passaporte", icon: BookOpen },
] as const;
type Place = (typeof nav)[number]["id"];
const headings = {
  mural: "Mural da Praça",
  rodas: "Rodas da Praça",
  passaporte: "Meu passaporte",
};
export default function App() {
  const { state, set } = usePlaza(),
    [place, go] = useState<Place>("mural"),
    [filter, choose] = useState<Tribe | "">(""),
    [creating, compose] = useState(false),
    [id, select] = useState(""),
    [notice, notify] = useState("");
  useEffect(() => {
    const read = () =>
      select(location.hash.match(/^#cartao\/(.+)$/)?.[1] ?? "");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);
  const open = (key: string) => {
    location.hash = "cartao/" + key;
  };
  const close = () => {
    history.replaceState(
      history.state,
      "",
      location.pathname + location.search,
    );
    select("");
  };
  const switchTo = (p: Place) => {
    go(p);
    window.scrollTo(0, 0);
  };
  const cards = state.cards.filter((c) => !filter || c.tribe === filter),
    current = state.cards.find((c) => c.id === id);
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  return (
    <>
      <header className="mast">
        <div className="mast-inner">
          <button className="brand" onClick={() => switchTo("mural")}>
            <Flower2 />
            Praça<span>.</span>
          </button>
          <span className="tag">Onde o Brasil se encontra</span>
          <div className="mast-actions">
            <button
              className="theme"
              aria-label="Alternar modo dia e noite"
              onClick={() => set((s) => ({ ...s, night: !s.night }))}
            >
              {state.night ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="avatar"
              aria-label="Meu passaporte"
              onClick={() => switchTo("passaporte")}
            >
              {state.profile.name.slice(0, 1)}
            </button>
          </div>
        </div>
      </header>
      <main className="shell">
        <div className="heading">
          <div>
            <div className="date">
              <span /> {date}
            </div>
            <h1>
              {headings[place]}
              <em>.</em>
            </h1>
          </div>
          <div className="tiles" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </div>
        {place === "mural" ? (
          <>
            <div className="filter-title">
              <SlidersHorizontal size={14} /> Tribos & Bairros
            </div>
            <div className="chips">
              {(["", ...tribes] as const).map((t) => (
                <button
                  key={t}
                  aria-pressed={t === filter}
                  onClick={() => choose(t)}
                >
                  {t || "Tudo na Praça"}
                </button>
              ))}
            </div>
            <div className="grid mural">
              {cards.map((c, i) => (
                <div
                  className={i === 0 && c.media.kind === "visual" ? "lead" : ""}
                  key={c.id}
                >
                  <Postal card={c} open={open} />
                </div>
              ))}
            </div>
          </>
        ) : place === "rodas" ? (
          <Rodas />
        ) : (
          <Passaporte open={open} />
        )}
      </main>
      <nav className="dock" aria-label="Ambientes da Praça">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-current={place === id ? "page" : undefined}
            onClick={() => switchTo(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
        <button
          className="add"
          aria-label="Colar no Mural"
          title="Colar no Mural"
          onClick={() => compose(true)}
        >
          <Plus />
        </button>
      </nav>
      {creating && (
        <Composer
          close={() => compose(false)}
          published={() => {
            compose(false);
            choose("");
            switchTo("mural");
            notify("Seu cartão está no Mural.");
          }}
        />
      )}
      {current && <OpenPostal key={id} card={current} close={close} />}{" "}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );
}

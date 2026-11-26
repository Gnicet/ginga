import { useState } from "react";
import { ImagePlus, Mic, Vote } from "lucide-react";
import {
  papers,
  tribes,
  type Paper,
  type Tribe,
  type Media,
  type Card,
} from "../types/praca";
import { tracks } from "../data/praca";
import { usePlaza } from "../context/Praca";
import { Dialog } from "./shared/Dialog";
import { asData, Player, Recorder } from "./Audio";
export function Composer({
  close,
  published,
}: {
  close: () => void;
  published: () => void;
}) {
  const { state, set } = usePlaza();
  const [kind, mode] = useState<Media["kind"]>("visual"),
    [title, headline] = useState(""),
    [city, place] = useState(state.profile.city),
    [paper, tint] = useState<Paper>("creme"),
    [tribe, choose] = useState<Tribe>(tribes[0]),
    [track, music] = useState(0);
  const [image, photo] = useState(""),
    [audio, voice] = useState(""),
    [options, answers] = useState(["", ""]),
    [error, fail] = useState("");
  async function read(file?: File) {
    photo("");
    if (!file) return;
    try {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error("Escolha uma imagem JPG, PNG, WebP ou GIF de até 8 MB.");
      const data = await asData(file);
      const test = new Image();
      test.src = data;
      await test.decode();
      photo(data);
      fail("");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    }
  }
  const names = options.map((s) => s.trim());
  const valid =
    title.trim() &&
    city.trim() &&
    (kind === "visual"
      ? image
      : kind === "voz"
        ? audio
        : names.every(Boolean) &&
          new Set(names.map((x) => x.toLocaleLowerCase("pt-BR"))).size ===
            names.length);
  function publish() {
    if (!valid) return;
    const media: Media =
      kind === "visual"
        ? { kind, image, alt: title.trim() }
        : kind === "voz"
          ? { kind, audio }
          : { kind, options: names, counts: names.map(() => 0) };
    const card: Card = {
      id: crypto.randomUUID(),
      title: title.trim(),
      city: city.trim(),
      tribe,
      paper,
      track,
      author: state.profile.name,
      mine: true,
      media,
      notes: [],
      counts: {},
    };
    set((s) => ({ ...s, cards: [card, ...s.cards] }));
    published();
  }
  return (
    <Dialog title="Colar no Mural" onClose={close}>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          publish();
        }}
      >
        <div className="segments">
          {(
            [
              { id: "visual", label: "Colar foto", Icon: ImagePlus },
              { id: "voz", label: "Gravar áudio", Icon: Mic },
              { id: "enquete", label: "Abrir enquete", Icon: Vote },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              aria-pressed={kind === id}
              onClick={() => mode(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <label>
          {kind === "enquete"
            ? "Pergunta"
            : kind === "voz"
              ? "Resumo do recado"
              : "Manchete do cartão"}
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => headline(e.target.value)}
          />
        </label>
        {kind === "visual" ? (
          <label>
            Fotografia ou arte
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void read(e.target.files?.[0])}
            />
            {image && (
              <img className="preview" src={image} alt="Foto escolhida" />
            )}
          </label>
        ) : kind === "voz" ? (
          <>
            <Recorder limit={30} onAudio={voice} />
            {audio && <Player src={audio} label="Prévia do recado" wave />}
          </>
        ) : (
          <fieldset>
            <legend>Alternativas diferentes</legend>
            {options.map((s, i) => (
              <label key={i}>
                Opção {i + 1}
                <input
                  required
                  value={s}
                  maxLength={50}
                  onChange={(e) =>
                    answers(
                      options.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />
              </label>
            ))}
            {options.length < 4 && (
              <button
                type="button"
                className="outline"
                onClick={() => answers([...options, ""])}
              >
                Adicionar opção
              </button>
            )}
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => answers(options.slice(0, -1))}
              >
                Retirar última opção
              </button>
            )}
          </fieldset>
        )}
        <div className="form-row">
          <label>
            Carimbo da cidade
            <input
              value={city}
              required
              maxLength={50}
              onChange={(e) => place(e.target.value)}
            />
          </label>
          <label>
            Tribo
            <select
              value={tribe}
              onChange={(e) => choose(e.target.value as Tribe)}
            >
              {tribes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Trilha de fundo
          <select value={track} onChange={(e) => music(+e.target.value)}>
            {tracks.map((t, i) => (
              <option key={t} value={i}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Cor do papel</legend>
          <div className="swatches">
            {(Object.keys(papers) as Paper[]).map((k) => (
              <button
                type="button"
                className={k}
                aria-pressed={k === paper}
                key={k}
                onClick={() => tint(k)}
              >
                {papers[k]}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={!valid}>
          Colar no Mural
        </button>
      </form>
    </Dialog>
  );
}

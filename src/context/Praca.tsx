import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAccess } from "../components/Access";
import { seed } from "../data/praca";
import type { Card, Plaza } from "../types/praca";
const database = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("praca-cultural", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("mural");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
function usePlazaModel() {
  const { account } = useAccess();
  const key = account ? "conta:" + account.id : "estado";
  const [state, set] = useState<Plaza>(() =>
    account
      ? {
          ...seed,
          profile: { ...seed.profile, name: account.name, city: account.city },
          cards: seed.cards.map((c) => ({ ...c, mine: false })),
        }
      : seed,
  );
  const [db, connect] = useState<IDBDatabase>();
  const [ready, start] = useState(false);
  const [error, report] = useState("");
  useEffect(() => {
    let active = true;
    let connection: IDBDatabase | undefined;
    database()
      .then((value) => {
        connection = value;
        if (!active) {
          value.close();
          return;
        }
        const request = value
          .transaction("mural")
          .objectStore("mural")
          .get(key);
        request.onsuccess = () => {
          if (active) {
            if (request.result) {
              const cached: Plaza = request.result;
              set(
                account
                  ? {
                      ...cached,
                      profile: {
                        ...cached.profile,
                        name: account.name,
                        city: account.city,
                      },
                      cards: cached.cards.map((c) =>
                        c.mine ? { ...c, author: account.name } : c,
                      ),
                    }
                  : cached,
              );
            }
            connect(value);
            start(true);
          }
        };
        request.onerror = () => {
          if (active) {
            report("O mural ficará salvo apenas nesta sessão.");
            start(true);
          }
        };
      })
      .catch(() => {
        if (active) {
          report("O mural ficará salvo apenas nesta sessão.");
          start(true);
        }
      });
    return () => {
      active = false;
      connection?.close();
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.night ? "noite" : "dia";
    if (db) {
      const tx = db.transaction("mural", "readwrite");
      tx.objectStore("mural").put(state, key);
      tx.onabort = () =>
        report("Sem espaço para salvar esta alteração no dispositivo.");
    }
  }, [state, db]);
  const edit = (id: string, fn: (card: Card) => Card) =>
    set((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === id ? fn(c) : c)),
    }));
  const save = (id: string) =>
    set((s) => ({
      ...s,
      saved: s.saved.includes(id)
        ? s.saved.filter((x) => x !== id)
        : [...s.saved, id],
    }));
  return { state, set, edit, save, ready, error };
}
const Context = createContext<ReturnType<typeof usePlazaModel> | null>(null);
export function PlazaProvider({ children }: { children: ReactNode }) {
  const model = usePlazaModel();
  return (
    <Context.Provider value={model}>
      {model.ready ? children : <p role="status">Abrindo a Praça…</p>}
      {model.error && <p role="alert">{model.error}</p>}
    </Context.Provider>
  );
}
export function usePlaza() {
  const model = useContext(Context);
  if (!model) throw Error("Praça precisa de PlazaProvider");
  return model;
}

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccess } from "../components/Access";
import { apiRequest } from "../roomRequest";
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
  const { account, confirmRules } = useAccess();
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
                      cards: cached.cards.filter(c => !c.shared).map((c) =>
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
      tx.objectStore("mural").put(account ? {...state,cards:state.cards.filter(c=>!c.shared)} : state, key);
      tx.onabort = () =>
        report("Sem espaço para salvar esta alteração no dispositivo.");
    }
  }, [state, db]);
  const localEdit = (id: string, fn: (card: Card) => Card) =>
    set((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === id ? fn(c) : c)),
    }));
  const localSave = (id: string) =>
    set((s) => ({
      ...s,
      saved: s.saved.includes(id)
        ? s.saved.filter((x) => x !== id)
        : [...s.saved, id],
    }));
  const queue = useRef(Promise.resolve()),
    active = useRef(true),
    pending = useRef(0);
  const [busy, working] = useState(false);
  type Action = {
    type: "vote" | "sticker" | "note" | "publish" | "saved";
    value: unknown;
    id?: string;
  };
  function sync(action?: Action) {
    if (action) {
      pending.current++;
      working(true);
    }
    const task = queue.current.then(async () => {
      if (!active.current) return false;
      try {
        if (action && action.type !== "saved" && !await confirmRules()) return false;
        const response = await apiRequest(
          "/api/mural",
          action
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(action),
              }
            : {},
        );
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error || "Mural indisponível.");
        if (active.current) {
          set((previous) => {
            const remoteIds = new Set(payload.cards.map((c: Card) => c.id));
            const local = previous.cards.filter(
              (c) => c.mine && !c.shared && !remoteIds.has(c.id),
            );
            return {
              ...previous,
              cards: [...payload.cards, ...local],
              saved: [
                ...payload.saved,
                ...previous.saved.filter((id) =>
                  local.some((c) => c.id === id),
                ),
              ],
            };
          });
          report("");
        }
        return true;
      } catch (e) {
        if (active.current)
          report(
            e instanceof Error ? e.message : "Falha de conexão com a Praça.",
          );
        return false;
      } finally {
        if (action) {
          pending.current--;
          if (active.current) working(pending.current > 0);
        }
      }
    });
    queue.current = task.then(() => {});
    return task;
  }
  useEffect(() => {
    active.current = true;
    if (!ready || !account) return;
    let fetching = false;
    const refresh = () => {
      if (fetching || pending.current || document.hidden) return;
      fetching = true;
      void sync().finally(() => {
        fetching = false;
      });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [ready, account?.id]);
  const isRemote = (id: string) =>
    !!account &&
    (state.cards.find((c) => c.id === id)?.shared ||
      seed.cards.some((c) => c.id === id));
  function edit(id: string, fn: (card: Card) => Card, action: Action) {
    if (isRemote(id)) return sync({ ...action, id });
    localEdit(id, fn);
    return Promise.resolve(true);
  }
  function save(id: string) {
    if (isRemote(id))
      void sync({ id, type: "saved", value: !state.saved.includes(id) });
    else localSave(id);
  }
  function publishCard(card: Card) {
    if (account) return sync({ type: "publish", value: card });
    set((s) => ({ ...s, cards: [card, ...s.cards] }));
    return Promise.resolve(true);
  }
  return { state, set, edit, save, publishCard, refresh: () => sync(), busy, ready, error };
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

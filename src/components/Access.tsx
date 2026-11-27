import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Flower2, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../roomRequest";
import { PolicyLinks } from "./Policies";
import rules from "../data/regras.json";
export interface Account {
  acceptedRules: string | null;
  id: string;
  name: string;
  city: string;
  email: string;
}
export async function accountRequest(
  route: string,
  form?: Record<string, string>,
) {
  const res = await apiRequest(
    "/api/conta/" + route,
    form
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      : {},
  );
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Não foi possível concluir.");
  return data;
}
async function accountCall(route: string, form?: Record<string, string>): Promise<Account | null> {
  return (await accountRequest(route, form)).account;
}
export async function issueRecoveryCode(password: string): Promise<string> {
  return (await accountRequest("codigo", { password })).code;
}
const AccessContext = createContext<{
  account: Account | null;
  exit: () => Promise<void>;
  rename: (name: string) => Promise<void>;
  confirmRules: () => Promise<boolean>;
} | null>(null);
export function useAccess() {
  const value = useContext(AccessContext);
  if (!value) throw Error("Contexto de acesso ausente");
  return value;
}
const changed = () => {
  const bus = new BroadcastChannel("praca-access");
  bus.postMessage("changed");
  bus.close();
};
export function Access({ children }: { children: ReactNode }) {
  const [account, set] = useState<Account | null>(null),
    [guest, visit] = useState(false),
    [loading, load] = useState(true),
    [error, fail] = useState("");
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const next = await accountCall("sessao");
        if (active) {
          set(next);
          visit(false);
          fail("");
        }
      } catch {
        if (active) {
          set(null);
          fail(
            "O servidor da Praça está indisponível. Confira a conexão ou explore como visitante.",
          );
        }
      } finally {
        if (active) load(false);
      }
    };
    void restore();
    const bus =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("praca-access")
        : null;
    if (bus) bus.onmessage = restore;
    window.addEventListener("praca-expired", restore);
    return () => {
      active = false;
      bus?.close();
      window.removeEventListener("praca-expired", restore);
    };
  }, []);
  if (loading)
    return (
      <main className="shell" role="status">
        Abrindo a Praça…
      </main>
    );
  async function exit() {
    if (account) await accountCall("sair", {});
    set(null);
    visit(false);
    fail("");
    if (typeof BroadcastChannel !== "undefined") changed();
  }
  async function rename(name: string) {
    const next = await accountCall("perfil", { name });
    set(next);
  }
  if (account || guest)
    return (
      <AccessContext.Provider value={{ account, exit, rename, confirmRules: async () => {
        if (!account || account.acceptedRules === rules.version) return true;
        const agreed = window.confirm(["Regras da comunidade da Praça", ...rules.rules,
          "Ao confirmar, você aceita estas regras para publicar. Cancelar mantém seu conteúdo sem envio."].join("\n\n"));
        if (!agreed) return false;
        const next = await accountCall("aceitar-regras",{version:rules.version});
        set(next);
        return true;
      } }}>
        {children}
      </AccessContext.Provider>
    );
  return (
    <Entry
      error={error}
      guest={() => visit(true)}
      submit={async (route, data) => {
        const next = await accountCall(route, data);
        if (!next) throw Error("Sua sessão não foi iniciada.");
        set(next);
        if (typeof BroadcastChannel !== "undefined") changed();
      }}
    />
  );
}
function Entry({
  error,
  guest,
  submit,
}: {
  error: string;
  guest: () => void;
  submit: (route: string, data: Record<string, string>) => Promise<void>;
}) {
  const [signup, mode] = useState(false),
    [recovering, recover] = useState(false),
    [code, setCode] = useState(""),
    [notice, notify] = useState(""),
    [email, mail] = useState(""),
    [password, pass] = useState(""),
    [name, nick] = useState(""),
    [city, place] = useState(""),
    [visible, show] = useState(false),
    [busy, wait] = useState(false),
    [message, report] = useState("");
  async function send(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    wait(true);
    report("");
    notify("");
    try {
      if (recovering) {
        await accountCall("recuperar", { email, code, password });
        setCode("");
        pass("");
        show(false);
        recover(false);
        notify("Senha alterada. Entre com a nova senha e gere outro código no Passaporte.");
        return;
      }
      await submit(
        signup ? "cadastro" : "entrar",
        signup ? { email, password, name, city } : { email, password },
      );
    } catch (err) {
      report(
        err instanceof TypeError
          ? "Confira a conexão com o servidor da Praça."
          : err instanceof Error
            ? err.message
            : "Falha no acesso.",
      );
    } finally {
      wait(false);
    }
  }
  return (
    <main className="access-page">
      <section className="access-art">
        <div className="access-brand">
          <Flower2 /> Praça.
        </div>
        <h1>
          Onde o Brasil <br />
          se encontra.
        </h1>
        <img src="/barra.svg" alt="Gravura do Farol da Barra em Salvador" />
        <span className="stamp">Salvador • BA</span>
      </section>
      <section className="access-form">
        <h2>{recovering ? "Recuperar conta" : signup ? "Crie seu passaporte" : "Entre na Praça"}</h2>
        <form onSubmit={send}>
          {signup && (
            <>
              <label>
                Nome na Praça
                <input
                  autoComplete="nickname"
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => nick(e.target.value)}
                />
              </label>
              <label>
                Cidade e estado
                <input
                  required
                  autoComplete="address-level2"
                  maxLength={50}
                  value={city}
                  onChange={(e) => place(e.target.value)}
                />
              </label>
            </>
          )}
          <label>
            E-mail
            <input
              required
              autoComplete="email"
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => mail(e.target.value)}
            />
          </label>
          {recovering && <label>Código salvo no Passaporte
            <input required autoCapitalize="none" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
          </label>}
          <label>
            {recovering ? "Nova senha" : "Senha"}{signup || recovering ? " (mínimo de 10 caracteres)" : ""}
            <span className="password-field">
              <input
                required
                minLength={signup || recovering ? 10 : 1}
                maxLength={256}
                type={visible ? "text" : "password"}
                autoComplete={signup || recovering ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => pass(e.target.value)}
              />
              <button
                type="button"
                aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => show(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {(message || error) && <p role="alert">{message || error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Aguarde…" : recovering ? "Alterar senha" : signup ? "Criar conta" : "Entrar"}
          </button>
        </form>
        <button
          className="access-link"
          disabled={busy}
          onClick={() => {
            mode(recovering ? false : !signup);
            recover(false);
            setCode("");
            notify("");
            pass("");
            report("");
          }}
        >
          {signup || recovering ? "Voltar para entrar" : "Criar minha conta"}
        </button>
        {!signup && !recovering && <button className="access-link" disabled={busy} onClick={() => {
          recover(true);
          pass("");
          show(false);
          notify("");
          report("");
        }}>Esqueci minha senha</button>}
        <button className="outline" disabled={busy} onClick={guest}>
          Explorar como visitante
        </button>
        <PolicyLinks />
      </section>
    </main>
  );
}

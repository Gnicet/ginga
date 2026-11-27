import { useState } from "react";
import { usePlaza } from "../context/Praca";
import { accountRequest } from "./Access";

const labels = {
  convidar: "Adicionar aos amigos",
  aceitar: "Aceitar pedido",
  recusar: "Recusar pedido",
  cancelar: "Cancelar pedido",
  desfazer: "Desfazer amizade",
};

export function FriendActions({target, manage = false}: {target: string; manage?: boolean}) {
  const {friends, refresh} = usePlaza();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!friends) return null;
  const relation = friends.find(person => person.id === target);
  async function change(action: keyof typeof labels) {
    if (busy) return;
    if (action === "desfazer" && !window.confirm("Desfazer sua amizade com " + relation?.name + "?")) return;
    setBusy(true);
    setError("");
    try {
      await accountRequest("amizade", {action, target, link: relation?.link ?? ""});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar amizade.");
    } finally {
      await refresh();
      setBusy(false);
    }
  }
  const actions: (keyof typeof labels)[] = !relation ? ["convidar"] :
    relation.status === "recebido" ? (manage ? ["aceitar","recusar"] : ["aceitar"]) :
    manage ? [relation.status === "amigo" ? "desfazer" : "cancelar"] : [];
  return <div className="friend-actions">
    {!manage && relation && <small>{relation.status === "amigo" ? "Amigos" :
      relation.status === "enviado" ? "Pedido enviado" : "Pedido recebido"}</small>}
    {actions.map(action => <button key={action} type="button" className="outline" disabled={busy}
      onClick={() => void change(action)}>{labels[action]}</button>)}
    {error && <span role="alert">{error}</span>}
  </div>;
}

export function Friends() {
  const {friends} = usePlaza();
  return <section><h3>Amigos</h3>
    {friends === null ? <p role="status">Carregando amizades…</p> :
      friends.length === 0 ? <p>Abra um cartão no Mural ou a lista de participantes de uma Roda para adicionar alguém.</p> :
      (["recebido","enviado","amigo"] as const).map(status => {
        const people = friends.filter(person => person.status === status);
        if (!people.length) return null;
        return <div key={status}><h4>{ {recebido:"Pedidos recebidos", enviado:"Pedidos enviados", amigo:"Minhas amizades"}[status] }</h4>
          <ul>{people.map(person => <li key={person.id} className="friend-row">
            <strong>{person.name}</strong><FriendActions target={person.id} manage />
          </li>)}</ul>
        </div>;
      })}
  </section>;
}

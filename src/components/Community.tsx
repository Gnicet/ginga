import { useEffect, useState } from "react";
import { accountRequest, useAccess } from "./Access";
import { usePlaza } from "../context/Praca";
import { FriendActions } from "./Friends";

export function CommunityActions({kind, target, owner, room = ""}: {
  kind: "cartao" | "bilhete" | "recado" | "perfil"; target: string; owner?: string | null; room?: string;
}) {
  const {account} = useAccess();
  const {refresh} = usePlaza();
  const [reason, setReason] = useState("Assédio ou ameaça");
  const [subject, setSubject] = useState("content");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!account || account.id === owner) return null;
  async function act(block: boolean) {
    setBusy(true);
    try {
      if (block && owner) {
        await accountRequest("bloquear",{target:owner});
        await refresh();
        window.dispatchEvent(new Event("praca-block"));
        setMessage("Pessoa bloqueada.");
      } else {
        const profile = subject === "profile" && owner;
        await accountRequest("denunciar",{target:profile || target,kind:profile ? "perfil" : kind,reason,room});
        setMessage("Denúncia enviada para análise.");
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : "Falha de conexão."); }
    finally { setBusy(false); }
  }
  return <>{owner && <FriendActions target={owner} />}<details>
    <summary>Denunciar{owner && " ou bloquear"}</summary>
    {owner && kind !== "perfil" && <label>O que deseja denunciar?
      <select value={subject} onChange={e => setSubject(e.target.value)}>
        <option value="content">Este conteúdo</option><option value="profile">Perfil da pessoa</option>
      </select>
    </label>}
    <label>Motivo<select value={reason} onChange={e => setReason(e.target.value)}>
      {["Assédio ou ameaça","Spam ou golpe","Segurança infantil","Outro conteúdo abusivo"].map(r => <option key={r}>{r}</option>)}
    </select></label>
    <button className="outline" disabled={busy} onClick={() => void act(false)}>Enviar denúncia</button>
    {owner && <button className="outline" disabled={busy} onClick={() => void act(true)}>Bloquear pessoa</button>}
    {message && <p role="status">{message}</p>}
  </details></>;
}

export function BlockList() {
  const [list,setList] = useState<{id:string;name:string}[]>([]);
  const [message,notify] = useState("");
  useEffect(() => {
    void accountRequest("bloqueados",{}).then(r => setList(r.accounts)).catch(() => notify("Falha ao carregar bloqueios."));
  },[]);
  return <details><summary>Pessoas bloqueadas</summary>
    {!message && !list.length && <p>Nenhuma pessoa bloqueada.</p>}
    {list.map(p => <p key={p.id}>{p.name} <button className="outline" onClick={async () => {
      try {
        await accountRequest("desbloquear",{target:p.id});
        setList(old => old.filter(v => v.id !== p.id));
      } catch { notify("Falha ao desbloquear."); }
    }}>Desbloquear</button></p>)}
    {message && <p role="alert">{message}</p>}
  </details>;
}

export function DeleteAccount({email = "",done}: {email?:string; done:()=>void}) {
  const [address,setAddress] = useState(email);
  const [password,setPassword] = useState("");
  const [confirmed,confirm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,notify] = useState("");
  return <form onSubmit={async e => {
    e.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      const result = await accountRequest("excluir",{email:address,password,confirm:"EXCLUIR"});
      const request = indexedDB.open("praca-cultural",1);
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains("mural"))
          db.transaction("mural","readwrite").objectStore("mural").delete("conta:"+result.deletedId);
        db.close();
      };
      request.onupgradeneeded = () => request.result.createObjectStore("mural");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("praca-access"); channel.postMessage("changed"); channel.close();
      }
      done();
    } catch (err) { notify(err instanceof Error ? err.message : "Falha ao excluir a conta."); }
    finally { setBusy(false); }
  }}>
    <p>A exclusão é permanente. Seus cartões, mídias, bilhetes, votos, guardados e recados vinculados à conta serão apagados do servidor. Todas as sessões serão encerradas.</p>
    <label>E-mail da conta<input type="email" required readOnly={!!email} autoComplete="username" value={address} onChange={e=>setAddress(e.target.value)} /></label>
    <label>Senha atual<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
    <label><input type="checkbox" required checked={confirmed} onChange={e=>confirm(e.target.checked)} /> Entendo que a exclusão é definitiva.</label>
    <button className="outline" disabled={!confirmed || busy}>Excluir minha conta definitivamente</button>
    {message && <p role="alert">{message}</p>}
  </form>;
}
export function PublicDeletion() {
  const [deleted,setDeleted] = useState(false);
  return <main className="shell"><h1>Excluir conta da Praça</h1>
    {deleted ? <p role="status">Sua conta foi excluída.</p> : <DeleteAccount done={()=>setDeleted(true)} />}
    <a href="./">Voltar à Praça</a>
  </main>;
}

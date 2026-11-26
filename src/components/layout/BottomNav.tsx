import {House,Compass,Clapperboard,UserRound,Plus} from 'lucide-react'
import type {Tab} from '../../types/social'
export const navItems=[{id:'feed',label:'Feed',icon:House},{id:'explore',label:'Explorar',icon:Compass},{id:'clips',label:'Clipes',icon:Clapperboard},{id:'profile',label:'Meu perfil',icon:UserRound}] as const
export default function BottomNav({tab,go,create}:{tab:Tab;go:(t:Tab)=>void;create:()=>void}){return <nav className="bottom" aria-label="Navegação móvel">{navItems.map(({id,label,icon:Icon},i)=><div key={id}>{i===2&&<button className="mobile-create" aria-label="Criar post" onClick={create}><Plus/></button>}<button className={tab===id?'active':''} onClick={()=>go(id)}><Icon size={21}/>{label}</button></div>)}</nav>}


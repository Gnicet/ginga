import {Plus,Radio} from 'lucide-react'
import Image from '../Image'
import {stories} from '../../data/mockData'
import {useApp} from '../../context/AppContext'
import type {Story} from '../../types/social'
export default function StoriesBar({open,create}:{open:(s:Story)=>void;create:()=>void}){const {user,viewed}=useApp();return <section className="stories-box"><div className="stories-title"><h2>Rolês de agora</h2><Radio size={18}/></div><div className="stories"><button className="story mine" onClick={create}><span className="story-ring"><Image src={user.avatar}/><i><Plus size={12}/></i></span><span>Seu rolê</span></button>{stories.map(s=><button key={s.id} className={'story '+(viewed.includes(s.id)?'seen':'')} onClick={()=>open(s)} aria-label={s.name+(s.open?', rolê aberto':'')}><span className="story-ring"><Image src={s.image}/>{s.open&&<i className="open-badge"><Radio size={11}/></i>}</span><span>{s.name}</span></button>)}</div></section>}


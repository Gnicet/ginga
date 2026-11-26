import {useEffect,useRef,useState} from 'react'
import {Bell,Bookmark,Check,ChevronRight,Flame,MapPin,Music2,Plus,Radio,TrendingUp,UsersRound} from 'lucide-react'
import TopHeader,{FeedSwitch} from './components/layout/TopHeader'
import BottomNav,{navItems} from './components/layout/BottomNav'
import StoriesBar from './components/feed/StoriesBar'
import PostCard from './components/feed/PostCard'
import StoryViewerModal from './components/feed/StoryViewerModal'
import CommentsDrawer from './components/feed/CommentsDrawer'
import CreatePostModal from './components/create/CreatePostModal'
import ExploreView from './components/explore/ExploreView'
import ClipsView from './components/clips/ClipsView'
import ProfileView from './components/profile/ProfileView'
import {Dialog} from './components/shared/Dialog'
import Image from './components/Image'
import {useApp} from './context/AppContext'
import {stories,people} from './data/mockData'
import type {Post,Tab,Story,MusicTrack} from './types/social'
function RightRail({story,search}:{story:()=>void;search:(s:string)=>void}){
 const {following,toggleFollow}=useApp()
 return <aside className="right-rail"><section className="rail-box feature"><h2><Radio/>Rolê em destaque</h2><button className="postcard" onClick={story}><img src="/barra.svg" alt="Ilustração do Farol da Barra ao pôr do sol" onError={e=>{e.currentTarget.style.visibility='hidden'}}/><span className="live"><i/>Rolê aberto</span><div className="postcard-foot"><span>Fim de tarde na Barra</span><small><MapPin size={13}/>Salvador, BA</small></div></button><button className="feature-action" onClick={story}>Entrar no rolê <ChevronRight size={17}/></button></section>
 <section className="rail-box trends"><h2><Flame/>Em alta no Ginga</h2>{[['#SaboresDoBrasil','Gastronomia','food'],['#SambaDeRoda','Música','music'],['#BrasilDeRua','Arte urbana','street']].map(([name,category,style])=><button key={name} onClick={()=>search(category)}><span className={'trend-icon '+style}>{style==='food'?<Flame/>:style==='music'?<Music2/>:<MapPin/>}</span><span><b>{name}</b><small>{category}</small></span><TrendingUp size={15}/></button>)}</section>
 <section className="rail-box suggestions"><h2><UsersRound/>Pra sua galera</h2>{[people[5],people[4]].map(person=><div key={person.id}><Image src={person.avatar}/><span><b>{person.name}</b><small>@{person.handle}</small></span><button aria-label={(following.includes(person.id)?'Deixar de seguir ':'Seguir ')+person.name} onClick={()=>toggleFollow(person.id)}>{following.includes(person.id)?<Check/>:<Plus/>}</button></div>)}</section></aside>
}
export default function App(){
 const {posts,following,message,notifications,readNotifications,user}=useApp()
 const [tab,setTab]=useState<Tab>('feed'),[mine,setMine]=useState(false),[savedPage,setSavedPage]=useState(false),[query,setQuery]=useState(''),[story,setStory]=useState<Story|null>(null),[comments,setComments]=useState(''),[quick,setQuick]=useState(''),[creating,setCreating]=useState(false),[track,setTrack]=useState<MusicTrack>(),[notify,setNotify]=useState(false)
 const oldTop=useRef(posts[0]?.id)
 useEffect(()=>{if(oldTop.current!==posts[0]?.id&&posts[0]?.time==='Agora'){setTab('feed');setMine(false);window.scrollTo(0,0)}oldTop.current=posts[0]?.id},[posts])
 useEffect(() => {
   const openHash = () => setQuick(location.hash.match(/^#post[-/](.+)$/)?.[1] ?? '')
   openHash()
   window.addEventListener('hashchange', openHash)
   return () => window.removeEventListener('hashchange', openHash)
 }, [])
 const closePost = () => {
   setQuick('')
   if (/^#post[-/]/.test(location.hash)) {
     history.replaceState(history.state, '', location.pathname + location.search)
   }
 }
 const go=(t:Tab,saved=false)=>{setSavedPage(saved);setTab(t);setQuery('');window.scrollTo({top:0})}
 const search=(term:string)=>{closePost();go('explore');setQuery(term)}
 const create=(t?:MusicTrack)=>{setTrack(t);setCreating(true)}
 const showComments=(p:Post)=>{closePost();setComments(p.id)}
 const notifyOpen=()=>{readNotifications();setNotify(true)}
 const feed=mine?posts.filter(p=>following.includes(p.user.id)||p.user.id===user.id):posts
 const currentComments=posts.find(p=>p.id===comments),currentQuick=posts.find(p=>p.id===quick)
 return <><TopHeader home={()=>go('feed')} profile={()=>go('profile')} notify={notifyOpen}/><div className="shell"><aside className="left-rail"><nav className="side-nav" aria-label="Navegação principal">{navItems.map(({id,label,icon:Icon})=><button key={id} className={tab===id&&!savedPage?'active':''} onClick={()=>go(id)}><Icon/>{label}{tab===id&&!savedPage&&<i/>}</button>)}<button className={savedPage?'active':''} onClick={()=>go('profile',true)}><Bookmark/>Salvos</button><div className="side-line"/><button className="primary" onClick={()=>create()}><Plus/>Criar post</button></nav><div className="made"><span className="flag"/><span>Feito no Brasil</span></div></aside>
 <main className={'center '+(tab==='feed'?'feed':'')}>{tab==='feed'?<><div className="feed-heading"><h1>Seu feed<span>.</span></h1><FeedSwitch mine={mine} set={setMine}/></div><StoriesBar open={setStory} create={()=>create()}/>{feed.length?feed.map(p=><PostCard key={p.id} post={p} onComments={showComments} onLocation={search}/>):<div className="empty">Siga a galera para ver as publicações por aqui.</div>}</>:tab==='explore'?<ExploreView key={query} initialQuery={query} onPost={p=>setQuick(p.id)}/>:tab==='clips'?<ClipsView onUseAudio={create} onComments={showComments}/>:<ProfileView onPost={p=>setQuick(p.id)} initialSaved={savedPage}/>}</main><RightRail story={()=>setStory(stories[2])} search={search}/></div><BottomNav tab={tab} go={go} create={()=>create()}/>
 {story&&<StoryViewerModal key={story.id} story={story} onClose={()=>setStory(null)} onNext={()=>setStory(stories[stories.findIndex(s=>s.id===story.id)+1]??null)}/>}
 {currentComments&&<CommentsDrawer post={currentComments} onClose={()=>setComments('')}/>}
 {creating&&<CreatePostModal initialTrack={track} onClose={()=>setCreating(false)}/>}
 {currentQuick&&<Dialog title="Publicação" onClose={closePost}><PostCard post={currentQuick} onLocation={search} onComments={showComments}/></Dialog>}
 {notify&&<Dialog title="Notificações" onClose={()=>setNotify(false)}><div className="notice-list">{notifications.map((n,i)=><div key={n.id}><Image src={people[i+1].avatar}/><p>{n.text}</p><Bell size={16}/></div>)}</div></Dialog>}
 {message&&<div key={message.id} role="status" className="toast"><Check size={17}/>{message.text}</div>}</>
}


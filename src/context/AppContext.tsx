import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react'
import {currentUser,initialPosts} from '../data/mockData'
import type {User,Post,Comment,Draft,ReactionType} from '../types/social'
type Notice={id:string;text:string}
interface State{user:User;posts:Post[];theme:'light'|'dark';saved:Record<string,string>;following:string[];viewed:string[];notifications:Notice[]; read:boolean;muted:boolean}
const initial:State={user:currentUser,posts:initialPosts,theme:'light',saved:{},following:['1','2','3'],viewed:[],notifications:[{id:'n1',text:'Bia Oliveira abriu um novo rolê na Paulista.'},{id:'n2',text:'Lucas Santos publicou uma foto na praia.'}],read:false,muted:true}
function load():State{try{const value=JSON.parse(localStorage.getItem('ginga-v1')??'null');if(value&&Array.isArray(value.posts)&&value.user?.id)return {...initial,...value}}catch{/* Storage may be unavailable in private browsing. */}return initial}
function useModel(){
 const [s,set]=useState<State>(load),[message,setMessage]=useState<{text:string;id:number}|null>(null)
 const toast=useCallback((text:string)=>setMessage({text,id:Date.now()}),[])
 useEffect(()=>{if(message){const id=setTimeout(()=>setMessage(null),3000);return()=>clearTimeout(id)}},[message])
 useEffect(()=>{document.documentElement.dataset.theme=s.theme;try{localStorage.setItem('ginga-v1',JSON.stringify(s))}catch{toast('Armazenamento cheio. As mudanças ficam nesta sessão.')}},[s,toast])
 const editPost=(id:string,fn:(p:Post)=>Post)=>set(prev=>({...prev,posts:prev.posts.map(p=>p.id===id?fn(p):p)}))
 return {...s,message,toast,
 updateUser:(user:User)=>set(prev=>({...prev,user,posts:prev.posts.map(p=>({...p,user:p.user.id===user.id?user:p.user,comments:p.comments.map(c=>c.user.id===user.id?{...c,user}:c)}))})),
 toggleTheme:()=>set(prev=>({...prev,theme:prev.theme==='light'?'dark':'light'})),
 toggleMute:()=>set(prev=>({...prev,muted:!prev.muted})),
 toggleFollow:(id:string)=>set(prev=>({...prev,following:prev.following.includes(id)?prev.following.filter(x=>x!==id):[...prev.following,id]})),
 markViewed:(id:string)=>set(prev=>prev.viewed.includes(id)?prev:{...prev,viewed:[...prev.viewed,id]}),
 readNotifications:()=>set(prev=>({...prev,read:true})),
 react:(id:string,type:ReactionType)=>editPost(id,p=>{const next={...p.reactions};if(p.myReaction)next[p.myReaction]--;const myReaction=p.myReaction===type?undefined:type;if(myReaction)next[myReaction]++;return {...p,reactions:next,myReaction}}),
 addComment:(id:string,comment:Comment)=>editPost(id,p=>({...p,comments:[...p.comments,comment]})),
 likeComment:(id:string,cid:string)=>editPost(id,p=>({...p,comments:p.comments.map(c=>c.id===cid?{...c,liked:!c.liked,likes:c.likes+(c.liked?-1:1)}:c)})),
 publish:(draft:Draft)=>{set(prev=>({...prev,posts:[{...draft,id:crypto.randomUUID(),user:prev.user,time:'Agora',tags:[],comments:[],reactions:{amei:0,brabo:0,morri:0,palmas:0,resenha:0}},...prev.posts]}));toast('Seu post já está no feed!')},
 deletePost:(id:string)=>{set(prev=>{const saved={...prev.saved};delete saved[id];return {...prev,saved,posts:prev.posts.filter(p=>p.id!==id||p.user.id!==prev.user.id)}});toast('Publicação excluída')},
 save:(id:string,folder:string)=>set(prev=>{const saved={...prev.saved};if(folder)saved[id]=folder;else delete saved[id];return {...prev,saved}})}
}
const Context=createContext<ReturnType<typeof useModel>|null>(null)
export function AppProvider({children}:{children:ReactNode}){const model=useModel();return <Context.Provider value={model}>{children}</Context.Provider>}
export function useApp(){const value=useContext(Context);if(!value)throw Error('Ginga precisa de AppProvider');return value}


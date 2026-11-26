import { useEffect, useState, type FormEvent } from 'react'
import { Bookmark, Camera, Folder, Grid3X3, MapPin, Moon, Pencil, Sun, UserRound } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Post } from '../../types/social'
import { stories } from '../../data/mockData'
import { Dialog } from '../shared/Dialog'
import StoryViewerModal from '../feed/StoryViewerModal'
import PostGrid from '../PostGrid'
import Image from '../Image'
import '../views.css'

type Section = 'posts' | 'saved' | 'tagged'
const sections = [{ key: 'posts', title: 'Posts', Icon: Grid3X3 }, { key: 'saved', title: 'Salvos', Icon: Bookmark }, { key: 'tagged', title: 'Marcações', Icon: UserRound }] as const

export default function ProfileView({ onPost, initialSaved = false }: { onPost: (post: Post) => void; initialSaved?: boolean }) {
  const { user, posts, updateUser, theme, toggleTheme, saved, toast } = useApp()
  const [section, setSection] = useState<Section>(initialSaved ? 'saved' : 'posts')
  const [folder, setFolder] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user)
  const [highlight, setHighlight] = useState<number | null>(null)
  useEffect(() => { setSection(initialSaved ? 'saved' : 'posts'); setFolder('') }, [initialSaved])
  const ownPosts = posts.filter(post => post.user.id === user.id)
  const savedPosts = posts.filter(post => saved[post.id])
  const folders = [...new Set(savedPosts.map(post => saved[post.id]))]
  const tagged = posts.filter(post => post.tags.some(tag => tag.replace(/^@/, '') === user.handle.replace(/^@/, '')))
  const visible = section === 'posts' ? ownPosts : section === 'tagged' ? tagged : savedPosts.filter(post => !folder || saved[post.id] === folder)
  const current = highlight === null ? null : stories[highlight]
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.name.trim() || !draft.city.trim()) return
    updateUser({ ...draft, name: draft.name.trim(), city: draft.city.trim(), bio: draft.bio.trim() })
    setEditing(false)
    toast('Perfil atualizado!')
  }
  return <section className="gv-view gv-profile">
    <div className="gv-profile-top"><h1 className="gv-title">Meu perfil</h1><button className="gv-icon" type="button" aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'} aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}</button></div>
    <div className="gv-profile-id"><Image src={user.avatar} alt={user.name}/><div><h2>{user.name}</h2><p>@{user.handle.replace(/^@/, '')}</p><span><MapPin size={13}/>{user.city}</span></div></div>
    <p className="gv-bio">{user.bio}</p>
    <button className="gv-edit" type="button" onClick={() => { setDraft(user); setEditing(true) }}><Pencil size={15}/>Editar perfil</button>
    <h3 className="gv-subtitle">Destaques</h3>
    <div className="gv-highlights">{stories.map((story, index) => <button type="button" key={story.id} onClick={() => setHighlight(index)}><Image src={story.image} alt=""/><span>{story.name}</span></button>)}</div>
    <div className="gv-profile-tabs">{sections.map(({ key, title, Icon }) => <button type="button" aria-pressed={section === key} className={section === key ? 'active' : ''} key={key} onClick={() => { setSection(key); setFolder('') }}><Icon size={15}/>{title}</button>)}</div>
    {section === 'saved' && folders.length > 0 && <div className="gv-chips" aria-label="Pastas salvas">{['', ...folders].map(name => <button className={name === folder ? 'selected' : ''} key={name} onClick={() => setFolder(name)} type="button">{name && <Folder size={13}/>} {name || 'Todas as pastas'}</button>)}</div>}
    {visible.length ? <PostGrid posts={visible} onPost={onPost}/> : <div className="gv-empty">{section === 'saved' ? <Bookmark/> : section === 'posts' ? <Camera/> : <UserRound/>}<h2>{section === 'saved' ? 'Seus achados ficam aqui' : section === 'posts' ? 'Seu primeiro post vem aí' : 'Suas marcações aparecem aqui'}</h2><p>{section === 'saved' ? 'Toque no marcador de um post para guardá-lo em uma pasta.' : section === 'posts' ? 'Use o botão de criar para compartilhar uma foto.' : 'Quando alguém marcar seu perfil, você verá a publicação aqui.'}</p></div>}
    {editing && <Dialog title="Editar perfil" onClose={() => setEditing(false)}><form className="gv-form" onSubmit={submit}>
      <label>Nome<input required maxLength={50} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
      <label>Cidade e estado<input required maxLength={60} value={draft.city} onChange={event => setDraft({ ...draft, city: event.target.value })}/></label>
      <label>Bio<textarea rows={3} maxLength={160} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })}/></label>
      <button type="submit" className="gv-primary" disabled={!draft.name.trim() || !draft.city.trim()}>Salvar alterações</button>
    </form></Dialog>}
    {current && <StoryViewerModal story={current} onClose={() => setHighlight(null)} onNext={() => setHighlight(index => index !== null && index + 1 < stories.length ? index + 1 : null)}/>}
  </section>
}

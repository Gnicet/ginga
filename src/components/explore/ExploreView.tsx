import { useEffect, useState } from 'react'
import { Search, SearchX, X } from 'lucide-react'
import type { Post } from '../../types/social'
import { useApp } from '../../context/AppContext'
import PostGrid from '../PostGrid'
import '../views.css'

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export default function ExploreView({ initialQuery = '', onPost }: { initialQuery?: string; onPost: (post: Post) => void }) {
  const { posts } = useApp()
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState('')
  useEffect(() => { setQuery(initialQuery); setCategory('') }, [initialQuery])
  const term = normalize(query)
  const categories = [...new Set(posts.map(post => post.category).filter(Boolean))]
  const visible = posts.filter(post => (!category || post.category === category) &&
    normalize([post.caption, post.user.name, post.user.handle, post.location, post.category, ...post.tags].join(' ')).includes(term))
  return <section className="gv-view">
    <h1 className="gv-title">Explorar</h1>
    <label className="gv-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Busque pessoas, lugares ou legendas" aria-label="Buscar no Ginga"/>{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={16}/></button>}</label>
    <div className="gv-chips" aria-label="Categorias">
      {['', ...categories].map(item => <button key={item} type="button" className={category === item ? 'selected' : ''} aria-pressed={category === item} onClick={() => setCategory(item)}>{item || 'Tudo'}</button>)}
    </div>
    {visible.length ? <PostGrid posts={visible} onPost={onPost} editorial/> : <div className="gv-empty"><SearchX/><h2>Nenhum post por aqui</h2><p>Tente outro lugar, nome ou categoria.</p><button type="button" onClick={() => { setQuery(''); setCategory('') }}>Limpar filtros</button></div>}
  </section>
}

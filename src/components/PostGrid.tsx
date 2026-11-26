import { MapPin } from 'lucide-react'
import type { Post } from '../types/social'
import Image from './Image'
import { filters } from '../data/mockData'

export default function PostGrid({ posts, onPost, editorial = false }: { posts: Post[]; onPost: (post: Post) => void; editorial?: boolean }) {
  return <div className={editorial ? 'gv-grid gv-editorial' : 'gv-grid'}>
    {posts.map(post => <button type="button" key={post.id} className="gv-tile"
      onClick={() => onPost(post)} aria-label={'Abrir publicação de '+post.user.name+' em '+post.location}>
      <Image src={post.image} alt={post.caption} loading="lazy" style={{ filter: filters.find(preset => preset.id === post.filter)?.css ?? post.filter }}/>
      {editorial && <span className="gv-tile-meta"><span className="gv-tile-category">{post.category}</span><span className="gv-tile-location"><MapPin size={12}/>{post.location}</span></span>}
    </button>)}
  </div>
}

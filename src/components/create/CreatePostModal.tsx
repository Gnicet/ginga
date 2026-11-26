import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ImagePlus, MapPin, Music2, Upload } from 'lucide-react'
import { filters, initialPosts, tracks } from '../../data/mockData'
import type { MusicTrack } from '../../types/social'
import { useApp } from '../../context/AppContext'
import { Dialog } from '../shared/Dialog'
import Image from '../Image'

async function readPhoto(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
  const picture = new window.Image()
  picture.src = source
  await picture.decode()
  const scale = Math.min(1, 1440 / Math.max(picture.width, picture.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(picture.width * scale))
  canvas.height = Math.max(1, Math.round(picture.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return source
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(picture, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', .84)
}

export default function CreatePostModal({ onClose, initialTrack }: {onClose: () => void; initialTrack?: MusicTrack}) {
  const { publish, toast } = useApp()
  const [image, setImage] = useState('')
  const [filter, setFilter] = useState(filters[0]?.css || 'none')
  const [track, setTrack] = useState(initialTrack?.id || '')
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('Cotidiano')
  const sequence = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  useEffect(() => () => { sequence.current++ }, [])
  return <Dialog title="Criar publicação" onClose={onClose} kind="create">
    <form className="gd-create" onSubmit={event => {
      event.preventDefault()
      if (!image || loading || submitting.current) return
      submitting.current = true
      publish({ image, filter, caption: caption.trim(), location: location.trim(), category, track: tracks.find(item => item.id === track) })
      onClose()
    }}>
      <div className="gd-create-fields">
        <input className="gd-sr" tabIndex={-1} ref={fileInput} type="file" accept="image/*" aria-label="Selecione uma imagem" onChange={async e => {
          const file = e.target.files?.[0]
          if (!file) return
          e.target.value = ''
          if (!file.type.startsWith('image/')) { toast('Escolha uma imagem.'); return }
          const request = ++sequence.current
          setLoading(true)
          try {
            const result = await readPhoto(file)
            if (request === sequence.current) { setImage(result); setCategory('Cotidiano') }
          } catch { if (request === sequence.current) toast('Essa imagem não abriu. Experimente JPG, PNG ou WebP.') }
          finally { if (request === sequence.current) setLoading(false) }
        }}/>
        <button type="button" className={'gd-upload' + (image ? ' picked' : '')} disabled={loading} onClick={() => fileInput.current?.click()}>
          {image && <Image className="gd-preview" src={image} alt="Prévia da publicação" style={{filter}}/>}
          <span>{image ? <Upload size={16}/> : <ImagePlus size={28}/>} {loading ? 'Preparando foto…' : image ? 'Trocar foto' : 'Carregar uma foto'}</span>
        </button>
        <fieldset><legend>Fotos de exemplo</legend><div className="gd-samples">{initialPosts.slice(0,6).map(post =>
          <button key={post.id} type="button" aria-label={'Usar foto de ' + (post.location || post.category)} aria-pressed={image === post.image} onClick={() => { sequence.current++; setLoading(false); setImage(post.image); setCategory(post.category) }}>
            <Image src={post.image} alt=""/>{image === post.image && <Check size={15}/>}
          </button>)}</div></fieldset>
        <fieldset><legend>Filtro</legend><div className="gd-filters">{filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.css} onClick={() => setFilter(item.css)}>{item.name}</button>)}</div></fieldset>
        <label className="gd-field"><span>Legenda <small>{caption.length}/500</small></span><textarea placeholder="Conta esse rolê…" maxLength={500} rows={2} value={caption} onChange={e => setCaption(e.target.value)}/></label>
        <label className="gd-field"><span><MapPin size={16}/> Localização</span><input placeholder="Cidade, bairro ou lugar" value={location} maxLength={100} onChange={e => setLocation(e.target.value)}/></label>
        <label className="gd-field"><span><Music2 size={16}/> Trilha sonora</span><span className="gd-select"><select value={track} onChange={e => setTrack(e.target.value)}><option value="">Sem trilha</option>{tracks.map(item => <option key={item.id} value={item.id}>{item.title} · {item.artist}</option>)}</select><ChevronDown size={16}/></span></label>
      </div>
      <div className="gd-submit"><button disabled={!image || loading}>Publicar</button></div>
    </form>
  </Dialog>
}

import { useEffect, useRef, useState } from 'react'
import { Heart, MapPin, MessageCircle, Music2, Pause, Play, Share2, Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { filters, tracks } from '../../data/mockData'
import type { MusicTrack, Post } from '../../types/social'
import Image from '../Image'
import '../views.css'

interface Props { onUseAudio: (track: MusicTrack) => void; onComments: (post: Post) => void }
const count = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
const clipDuration = 12000

export default function ClipsView({ onUseAudio, onComments }: Props) {
  const { posts, react, muted, toggleMute, toast } = useApp()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const [cycle, setCycle] = useState(0)
  const viewport = useRef<HTMLDivElement>(null)
  const meter = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)
  const audio = useRef<HTMLAudioElement>(null)
  const clip = posts[index]
  const track = clip?.track ?? tracks[index % Math.max(1, tracks.length)]
  const playing = !paused && !hidden
  useEffect(() => {
    const handle = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [])
  useEffect(() => {
    setPaused(false)
    elapsed.current = 0
    if (meter.current) meter.current.style.transform = 'scaleX(0)'
  }, [clip?.id, cycle])
  useEffect(() => {
    const element = audio.current
    if (!element || !track) return
    if (muted || !playing) { element.pause(); return }
    let active = true
    void element.play().catch((error: unknown) => {
      if (active && !(error instanceof DOMException && error.name === 'AbortError')) toast('Não foi possível tocar a trilha agora.')
    })
    return () => { active = false; element.pause() }
  }, [muted, playing, track?.src])
  useEffect(() => {
    if (!playing || !clip) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      elapsed.current += now - previous
      previous = now
      if (meter.current) meter.current.style.transform = 'scaleX(' + Math.min(1, elapsed.current / clipDuration) + ')'
      if (elapsed.current >= clipDuration) {
        const list = viewport.current
        if (list && posts.length > 1) list.scrollTo({ top: ((index + 1) % posts.length) * list.clientHeight, behavior: 'smooth' })
        else setCycle(value => value + 1)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [index, clip?.id, playing, posts.length, cycle])
  async function share(post: Post) {
    try {
      const url = new URL(location.href)
      url.hash = 'post-' + post.id
      await navigator.clipboard.writeText(post.caption + '\n' + url.href)
      toast('Pronto pra mandar no Zap!')
    } catch { toast('Não foi possível copiar o link.') }
  }
  return <section className="gv-clips" aria-label="Clips">
    <div className="gv-clip-list" ref={viewport} tabIndex={0} aria-label="Clips, role para navegar" onScroll={event => {
      const panel = event.currentTarget
      setIndex(Math.max(0, Math.min(posts.length - 1, Math.round(panel.scrollTop / panel.clientHeight))))
    }}>
      {posts.map((post, i) => {
        const song = post.track ?? tracks[i % Math.max(1, tracks.length)]
        const isPlaying = i === index && playing
        return <article key={post.id} className="gv-clip">
          <Image className={'gv-clip-photo' + (index === i ? ' active' : '')} src={post.image} alt={post.caption} loading={i <= index + 1 ? 'eager' : 'lazy'} style={{ animationPlayState: isPlaying ? 'running' : 'paused', filter: filters.find(item => item.id === post.filter)?.css ?? post.filter }}/>
          <div className="gv-clip-wash"/>
          <header><h1>Clips</h1><button type="button" onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'}>{muted ? <VolumeX size={19}/> : <Volume2 size={19}/>}</button></header>
          <button type="button" className="gv-clip-toggle" aria-label={isPlaying ? 'Pausar clip' : 'Reproduzir clip'} onClick={() => setPaused(value => !value)}>{paused && i === index ? <Play fill="currentColor" size={32}/> : <Pause size={24}/>}</button>
          <div className="gv-clip-actions">
            <button type="button" aria-label="Amei" aria-pressed={post.myReaction === 'amei'} onClick={() => react(post.id, 'amei')}><Heart size={25} color={post.myReaction === 'amei' ? '#ff652f' : 'currentColor'} fill={post.myReaction === 'amei' ? '#ff652f' : 'none'}/><span>{count.format(post.reactions.amei)}</span></button>
            <button type="button" aria-label="Abrir comentários" onClick={() => { setPaused(true); onComments(post) }}><MessageCircle size={25}/><span>{post.comments.length}</span></button>
            <button type="button" aria-label="Compartilhar clip" onClick={() => void share(post)}><Share2 size={24}/></button>
          </div>
          <div className="gv-clip-caption">
            <div className="gv-clip-author"><Image src={post.user.avatar} alt=""/><strong>{post.user.handle}</strong></div>
            <p>{post.caption}</p>{post.location && <span className="gv-clip-place"><MapPin size={13}/>{post.location}</span>}
            {song && <div className="gv-clip-song"><Music2 size={15}/><span>{song.title} · {song.artist}</span><button type="button" onClick={() => { setPaused(true); onUseAudio(song) }}>Usar este áudio</button></div>}
          </div>
          <div className="gv-clip-progress"><div ref={i === index ? meter : undefined}/></div>
        </article>
      })}
    </div>
    {track && <audio ref={audio} src={track.src} preload="none" loop/>}
    {!posts.length && <div className="gv-empty"><Play/><h2>Ainda não há clips</h2><p>As fotos publicadas aparecem aqui com trilha sonora.</p></div>}
  </section>
}

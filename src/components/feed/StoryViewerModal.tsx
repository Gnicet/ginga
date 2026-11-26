import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin, Pause, Play, Send, X } from 'lucide-react'
import type { Story } from '../../types/social'
import { useApp } from '../../context/AppContext'
import { Dialog } from '../shared/Dialog'
import Image from '../Image'

interface Props { story: Story; onClose: () => void; onNext?: () => void }

export default function StoryViewerModal(props: Props) {
  return <StorySession key={props.story.id} {...props}/>
}

function StorySession({ story, onClose, onNext }: Props) {
  const { toast, markViewed } = useApp()
  const [slide, setSlide] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [hold, setHold] = useState(false)
  const [pause, setPause] = useState(false)
  const [typing, setTyping] = useState(false)
  const [reply, setReply] = useState('')
  const [lastReply, setLastReply] = useState('')
  const [hidden, setHidden] = useState(document.hidden)
  const [ready, setReady] = useState(false)
  const heldFrom = useRef(0)
  const progress = useRef(0)
  const seen = useRef(markViewed)
  const latest = useRef({ onNext, onClose })
  latest.current = { onNext, onClose }
  const paused = pause || hold || typing || hidden || !ready
  const current = story.slides[slide]
  const move = useCallback((direction: number) => {
    const next = slide + direction
    if (next >= story.slides.length) { (latest.current.onNext ?? latest.current.onClose)(); return }
    progress.current = 0
    setElapsed(0)
    if (next !== slide && next >= 0) setReady(false)
    setSlide(Math.max(0, next))
  }, [slide, story.slides.length])
  useEffect(() => { seen.current(story.id) }, [story.id])
  useEffect(() => {
    const change = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])
  useEffect(() => {
    if (paused) return
    let previous = performance.now()
    let frame = 0
    const tick = (now: number) => {
      progress.current += now - previous
      previous = now
      if (progress.current >= 5000) { move(1); return }
      setElapsed(progress.current)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [paused, move])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft') move(-1)
      if (e.key === 'ArrowRight') move(1)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [move])
  return <Dialog title={story.name} onClose={onClose} kind="story">
    <Image key={slide} className="gd-story-photo" src={current?.image || story.image} alt={current?.caption || story.name} onLoad={() => setReady(true)}/>
    <div className="gd-shade"/>
    <div className="gd-edges">{[-1,1].map(direction => <button key={direction} type="button" aria-label={direction < 0 ? 'Slide anterior' : 'Próximo slide'}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); heldFrom.current = performance.now(); setHold(true) }}
      onPointerUp={() => { setHold(false); if (performance.now() - heldFrom.current < 300) move(direction) }}
      onPointerCancel={() => setHold(false)} onClick={e => { if (e.detail === 0) move(direction) }}/>)}</div>
    <div className="gd-story-top"><div className="gd-story-progress">{story.slides.map((_, i) => <span key={i}><i style={{ width: (i < slide ? 100 : i === slide ? elapsed / 50 : 0) + '%' }}/></span>)}</div>
      <div className="gd-story-by"><Image src={story.image} alt=""/><div><strong>{story.name}</strong>{story.open && <small><MapPin size={12}/> Rolê Aberto</small>}</div>
        <button className="gd-icon" aria-label={pause ? 'Continuar story' : 'Pausar story'} onClick={() => setPause(!pause)}>{pause ? <Play size={18}/> : <Pause size={18}/>}</button>
        <button className="gd-icon" aria-label="Fechar story" onClick={onClose}><X size={21}/></button>
      </div>
    </div>
    <div className="gd-story-bottom"><p>{current?.caption}</p>{lastReply && <small className="gd-reply-status" role="status">Você respondeu “{lastReply}”</small>}<form onSubmit={e => {
      e.preventDefault()
      const message = reply.trim()
      if (!message) return
      setLastReply(message)
      try {
        const saved: unknown = JSON.parse(localStorage.getItem('ginga-story-replies') || '[]')
        const history = Array.isArray(saved) ? saved : []
        history.push({ storyId: story.id, slide, message, sentAt: new Date().toISOString() })
        localStorage.setItem('ginga-story-replies', JSON.stringify(history))
      } catch { /* The current reply remains visible when storage is unavailable. */ }
      toast('Resposta enviada para ' + story.name + '!')
      setReply('')
      ;(document.activeElement as HTMLElement | null)?.blur()
    }}><input aria-label="Resposta ao story" maxLength={250} placeholder="Responder ao rolê…" value={reply} onChange={e => setReply(e.target.value)} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}/><button aria-label="Enviar resposta" disabled={!reply.trim()}><Send size={20}/></button></form></div>
  </Dialog>
}

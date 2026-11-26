import { useEffect, useRef, useState } from 'react'
import { Heart, Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react'
import type { Comment, Post } from '../../types/social'
import { useApp } from '../../context/AppContext'
import { Dialog } from '../shared/Dialog'
import Image from '../Image'

const bars = [4,8,13,7,17,11,20,14,8,15,22,11,5,12,18,14,9,17,6,13,19,11,5,9]
const time = (value: number) => '0:' + String(Math.floor(Number.isFinite(value) ? value : 0)).padStart(2, '0')
function Wave({ progress = 0 }: { progress?: number }) {
  return <span className="gd-wave" aria-hidden="true">{bars.map((height, i) => <i key={i} style={{ height, opacity: i / bars.length <= progress ? 1 : .35 }}/>)}</span>
}

function VoicePlayer({ comment }: { comment: Comment }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [active, setActive] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(comment.duration ?? 0)
  const { toast } = useApp()
  return <div className="gd-player">
    <audio ref={audio} src={comment.audio} preload="metadata" onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration) }}
      onPlay={() => setActive(true)} onPause={() => setActive(false)} onEnded={() => { setPosition(0); setActive(false) }}
      onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}/>
    <button className="gd-play" aria-label={active ? 'Pausar áudio' : 'Reproduzir áudio'} onClick={() => {
      if (active) audio.current?.pause()
      else audio.current?.play().catch(() => toast('Não foi possível reproduzir este áudio.'))
    }}>{active ? <Pause size={14}/> : <Play size={14}/>}</button>
    <Wave progress={duration ? position / duration : 0}/><small>{time(active || position ? position : duration)}</small>
  </div>
}

type RecordingState = 'idle' | 'request' | 'real' | 'demo' | 'saving'

function demoAudio(seconds: number) {
  const sampleRate = 8000
  const length = Math.ceil(seconds * sampleRate)
  const buffer = new ArrayBuffer(44 + length)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const word = (at: number, text: string) => Array.from(text).forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  word(0, 'RIFF'); view.setUint32(4, 36 + length, true); word(8, 'WAVE'); word(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate, true); view.setUint16(32, 1, true)
  view.setUint16(34, 8, true); word(36, 'data'); view.setUint32(40, length, true)
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const freq = [220, 262, 330, 294][Math.floor(t * 4) % 4]
    bytes[44+i] = 128 + Math.round(32 * Math.sin(2 * Math.PI * freq * t) * Math.exp(-14 * (t % .25)))
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export default function CommentsDrawer({ post: selected, onClose }: { post: Post; onClose: () => void }) {
  const { user, posts, addComment, likeComment, toast } = useApp()
  const post = posts.find(item => item.id === selected.id) ?? selected
  const [text, setText] = useState('')
  const [state, setState] = useState<RecordingState>('idle')
  const [seconds, setSeconds] = useState(0)
  const startAt = useRef(0)
  const generation = useRef(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const count = useRef(post.comments.length)
  useEffect(() => {
    if (count.current < post.comments.length) list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
    count.current = post.comments.length
  }, [post.comments.length])
  function release() { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null }
  useEffect(() => () => {
    generation.current++
    if (recorder.current?.state === 'recording') recorder.current.stop()
    release()
  }, [])
  function append(content: Pick<Comment, 'text' | 'audio' | 'duration'>) {
    addComment(post.id, { id: crypto.randomUUID(), user, likes: 0, liked: false, time: 'agora', ...content })
  }
  function save(blob: Blob, duration: number, token: number, simulated: boolean) {
    if (token !== generation.current) return
    setState('saving')
    const reader = new FileReader()
    reader.onload = () => {
      if (token !== generation.current) return
      append({ text: simulated ? 'Áudio de demonstração' : '', audio: String(reader.result), duration })
      setState('idle')
    }
    reader.onerror = () => { if (token === generation.current) { setState('idle'); toast('Falha ao carregar o áudio. Tente de novo.') } }
    reader.readAsDataURL(blob)
  }
  async function begin() {
    const token = ++generation.current
    setState('request')
    setSeconds(0)
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Microfone indisponível')
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (token !== generation.current) { mic.getTracks().forEach(track => track.stop()); return }
      stream.current = mic
      const instance = new MediaRecorder(mic)
      const chunks: Blob[] = []
      instance.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      instance.onstop = () => {
        mic.getTracks().forEach(track => track.stop())
        if (token !== generation.current) return
        const duration = Math.min(15, Math.max(.1, (performance.now() - startAt.current) / 1000))
        save(new Blob(chunks, { type: instance.mimeType }), duration, token, false)
      }
      instance.onerror = () => { if (token === generation.current) { cancel(); toast('A gravação foi interrompida.') } }
      startAt.current = performance.now()
      instance.start()
      recorder.current = instance
      setState('real')
    } catch {
      if (token !== generation.current) return
      release()
      startAt.current = performance.now()
      setState('demo')
      toast('Microfone indisponível. Usando áudio de demonstração.')
    }
  }
  function stop() {
    if (state === 'real' && recorder.current?.state === 'recording') { setState('saving'); recorder.current.stop() }
    if (state === 'demo') {
      const duration = Math.min(15, Math.max(.5, (performance.now() - startAt.current) / 1000))
      save(demoAudio(duration), duration, generation.current, true)
    }
  }
  function cancel() {
    generation.current++
    if (recorder.current?.state === 'recording') recorder.current.stop()
    release(); setState('idle'); setSeconds(0)
  }
  const stopNow = useRef(stop)
  stopNow.current = stop
  useEffect(() => {
    if (state !== 'real' && state !== 'demo') return
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - startAt.current) / 1000
      setSeconds(Math.min(15, elapsed))
      if (elapsed >= 15) stopNow.current()
    }, 100)
    return () => clearInterval(id)
  }, [state])
  return <Dialog title="Modo Resenha" onClose={onClose} kind="comments">
    <div className="gd-comment-list" ref={list}>
      {!post.comments.length && <p className="gd-empty">Puxe a primeira resenha deste post.</p>}
      {post.comments.map(c => <article className="gd-comment" key={c.id}>
        <Image src={c.user.avatar} alt=""/><div className="gd-comment-main"><div className="gd-by"><strong>{c.user.handle}</strong><small>{c.time}</small></div>
          {c.text && <p>{c.text}</p>}{c.audio && <VoicePlayer comment={c}/>}
        </div><button type="button" className={'gd-comment-like' + (c.liked ? ' liked' : '')} aria-label={c.liked ? 'Descurtir comentário' : 'Curtir comentário'} aria-pressed={c.liked} onClick={() => likeComment(post.id,c.id)}><Heart size={15} fill={c.liked ? 'currentColor' : 'none'}/><small>{c.likes || ''}</small></button>
      </article>)}
    </div>
    {state === 'idle' ? <form className="gd-compose" onSubmit={e => {
      e.preventDefault(); if (!text.trim()) return
      append({ text: text.trim() }); setText('')
    }}><Image src={user.avatar} alt=""/><input value={text} aria-label="Comentário" placeholder="Entre na resenha…" maxLength={1000} onChange={e => setText(e.target.value)}/>
      {text.trim() ? <button aria-label="Enviar comentário" className="gd-orange"><Send size={18}/></button> : <button type="button" aria-label="Gravar áudio de até 15 segundos" className="gd-orange" onClick={begin}><Mic size={18}/></button>}
    </form> : <div className="gd-record"><button className="gd-icon" aria-label="Cancelar gravação" onClick={cancel}><Trash2 size={18}/></button>
      <div><strong>{state === 'request' ? 'Aguardando microfone…' : state === 'saving' ? 'Enviando áudio…' : state === 'demo' ? 'Áudio de demonstração' : 'Gravando áudio'}</strong>
      {(state === 'real' || state === 'demo') && <small>{time(seconds)} / 0:15</small>}</div>
      {(state === 'real' || state === 'demo') && <><Wave progress={seconds / 15}/><button className="gd-orange" aria-label="Concluir e enviar áudio" onClick={stop}><Square size={16} fill="currentColor"/></button></>}
    </div>}
  </Dialog>
}

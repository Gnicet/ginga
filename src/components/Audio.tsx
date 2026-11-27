import { useEffect, useRef, useState } from "react";
import { useMediaSource } from "./useMediaSource";
import { Mic, Pause, Play, Square } from "lucide-react";
export function asData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function clock(seconds: number) {
  return (
    "0:" +
    Math.floor(Math.max(0, seconds) || 0)
      .toString()
      .padStart(2, "0")
  );
}
export function Player({
  src,
  label,
  wave = false,
}: {
  src: string;
  label: string;
  wave?: boolean;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const audioSrc = useMediaSource(src);
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [error, fail] = useState(false);
  useEffect(() => {
    setTime(0);
    setDuration(0);
    setPlaying(false);
    fail(false);
  }, [src]);
  const length = Number.isFinite(duration) ? duration : 0;
  return (
    <div className={"player " + (wave ? "wave" : "")}>
      <audio
        ref={ref}
        src={audioSrc}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onError={() => fail(true)}
      />
      <button
        className="play"
        aria-label={(playing ? "Pausar " : "Ouvir ") + label}
        onClick={() => {
          const a = ref.current;
          if (a) {
            if (playing) a.pause();
            else void a.play().catch(() => fail(true));
          }
        }}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="sound">
        <span>{error ? "Áudio indisponível" : label}</span>
        {wave && (
          <div className="waveform">
            {Array.from({ length: 32 }, (_, i) => (
              <i
                key={i}
                className={i / 32 < time / (length || Infinity) ? "played" : ""}
                style={{
                  height:
                    18 +
                    72 * Math.abs(Math.sin(i * 0.87) * Math.cos(i * 0.31)) +
                    "%",
                }}
              />
            ))}
            <input
              type="range"
              min="0"
              max={length || 1}
              step=".1"
              value={Math.min(time, length)}
              disabled={!length}
              aria-label="Posição do áudio"
              onChange={(e) => {
                if (ref.current)
                  ref.current.currentTime = Number(e.target.value);
              }}
            />
          </div>
        )}
      </div>
      <small>{clock(playing || time ? time : length)}</small>
    </div>
  );
}
export function Recorder({
  limit,
  onAudio,
}: {
  limit: number;
  onAudio: (audio: string) => void;
}) {
  const active = useRef<MediaRecorder | null>(null),
    alive = useRef(true),
    interval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [phase, setPhase] = useState<"idle" | "asking" | "recording">("idle"),
    [seconds, count] = useState(0),
    [error, fail] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearInterval(interval.current);
      const r = active.current;
      if (r?.state === "recording") r.stop();
      r?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function record() {
    if (active.current?.state === "recording") {
      active.current.stop();
      return;
    }
    setPhase("asking");
    fail("");
    count(0);
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const recorder = new MediaRecorder(stream),
        chunks: Blob[] = [];
      active.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        clearInterval(interval.current);
        recorder.stream.getTracks().forEach((t) => t.stop());
        active.current = null;
        if (alive.current) {
          setPhase("idle");
          try {
            const clip = await asData(
              new Blob(chunks, { type: recorder.mimeType }),
            );
            if (alive.current) onAudio(clip);
          } catch {
            fail("Não foi possível guardar a gravação.");
          }
        }
      };
      recorder.start();
      setPhase("recording");
      const started = performance.now();
      interval.current = setInterval(() => {
        const elapsed = Math.floor((performance.now() - started) / 1000);
        count(elapsed);
        if (elapsed >= limit && recorder.state === "recording") recorder.stop();
      }, 100);
    } catch {
      stream?.getTracks().forEach((t) => t.stop());
      if (alive.current) {
        setPhase("idle");
        fail(
          "Para gravar, permita o microfone e abra a Praça por HTTPS ou localhost.",
        );
      }
    }
  }
  return (
    <div>
      <button
        type="button"
        className="outline"
        disabled={phase === "asking"}
        onClick={() => void record()}
      >
        {phase === "recording" ? <Square size={15} /> : <Mic size={15} />}{" "}
        {phase === "recording"
          ? "Parar · " + clock(seconds)
          : phase === "asking"
            ? "Abrindo microfone…"
            : "Gravar até " + limit + "s"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}

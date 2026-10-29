import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { BACKEND_URL } from '../config/api';

export function BuildingNarration({ building, muted, onMutedChange }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!muted) audio.play().catch(() => {});
    return () => { audio.pause(); audio.currentTime = 0; };
  }, [building.id, building.voiceoverAudioUrl, muted]);
  if (!building.voiceoverPublished || !building.voiceoverAudioUrl) return null;
  const label = failed ? 'Building narration unavailable' : playing && !muted ? 'Mute building narration' : 'Play building narration';
  const Icon = muted ? VolumeX : playing ? Volume2 : Play;
  return <>
    <audio ref={audioRef} hidden muted={muted} preload="metadata"
      src={`${BACKEND_URL}${building.voiceoverAudioUrl}`}
      onError={() => { setFailed(true); setPlaying(false); }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    <button type="button" aria-label={label} title={label} disabled={failed}
      onClick={() => {
        if (playing && !muted) { onMutedChange(true); return; }
        onMutedChange(false);
        const audio = audioRef.current;
        if (audio) { audio.muted = false; audio.play().catch(() => {}); }
      }}
      className="shrink-0 w-9 h-9 rounded-xl bg-[#001840]/40 hover:bg-[#001840]/70 text-[#FFDC5F] flex items-center justify-center transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#FFDC5F]">
      <Icon className="w-4 h-4" />
    </button>
  </>;
}

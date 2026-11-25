import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Play, RotateCcw } from 'lucide-react';
import { BACKEND_URL } from '../config/api';

function resolveAudioSrc(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function BuildingNarration({ building, muted, onMutedChange }) {
  const audioRef = useRef(null);
  const mutedRef = useRef(muted);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioSrc = resolveAudioSrc(building?.voiceoverAudioUrl);

  // Attempt autoplay when mounted with a building audio URL
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    audio.muted = Boolean(mutedRef.current);
    if (!mutedRef.current) {
      audio.play().catch(() => {
        setAutoplayBlocked(true);
      });
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [building?.id, audioSrc]);

  // Sync mute toggle without resetting playback position
  useEffect(() => {
    mutedRef.current = muted;
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    audio.muted = Boolean(muted);
    if (muted) {
      audio.pause();
    }
  }, [muted, audioSrc]);

  if (!building?.voiceoverPublished || !audioSrc) return null;

  const isPlayingActive = playing && !muted;
  const label = failed
    ? 'Audio unavailable'
    : isPlayingActive
      ? 'Mute narration'
      : ended
        ? 'Replay audio'
        : autoplayBlocked
          ? 'Play audio guide'
          : 'Play narration';

  const Icon = failed ? VolumeX : isPlayingActive ? Volume2 : ended ? RotateCcw : muted ? VolumeX : Play;

  const handleClick = () => {
    const audio = audioRef.current;
    if (!audio || failed) return;

    if (isPlayingActive) {
      onMutedChange?.(true);
      audio.muted = true;
      audio.pause();
      return;
    }

    onMutedChange?.(false);
    setAutoplayBlocked(false);
    if (ended) {
      audio.currentTime = 0;
      setEnded(false);
    }
    audio.muted = false;
    audio.play().catch(() => {
      setAutoplayBlocked(true);
    });
  };

  return (
    <>
      <audio
        ref={audioRef}
        hidden
        muted={muted}
        preload="auto"
        src={audioSrc}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
        onPlay={() => {
          setPlaying(true);
          setEnded(false);
          setAutoplayBlocked(false);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
        }}
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={failed}
        onClick={handleClick}
        className={`min-h-0 shrink-0 px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          isPlayingActive
            ? 'bg-[#001840] text-[#FFDC5F] hover:bg-[#102A71] shadow-xs'
            : 'bg-[#FFF4C2] text-[#001840] border border-[#F5C400]/60 hover:bg-[#F5C400]'
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>
          {failed
            ? 'Audio Unavailable'
            : isPlayingActive
              ? 'Playing Audio'
              : ended
                ? 'Replay Audio'
                : 'Audio Guide'}
        </span>
      </button>
    </>
  );
}

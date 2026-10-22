import { useEffect, useRef } from 'react';
import manifest from '../data/audio-manifest.json';
/** One greeting per app launch, not per visit to the map. Browsers may require a gesture. */
export function useTitleGreeting(active: boolean) {
  const consumed = useRef(false);
  useEffect(() => {
    if (!active || consumed.current) return;
    const entry = manifest.entries.find((e) => e.text === '지율이의 신나는 하루' && e.available);
    if (!entry) return;
    const audio = new Audio(entry.audio_path);
    let live = true;
    let attempted = false;
    let pending = false;
    const attempt = () => {
      if (!live || consumed.current || pending || document.hidden) return;
      attempted = true;
      pending = true;
      void audio
        .play()
        .then(() => {
          if (live) consumed.current = true;
        })
        .catch((error: unknown) => {
          if (!live) return;
          pending = false;
          // Only autoplay denial can be retried on a real gesture; never loop on broken files.
          if (!(error instanceof DOMException && error.name === 'NotAllowedError'))
            consumed.current = true;
        });
    };
    const gesture = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.world-map')) attempt();
    };
    const visibility = () => {
      if (document.hidden) {
        audio.pause();
        if (attempted) consumed.current = true;
      } else attempt();
    };
    // Delay until after StrictMode's setup/cleanup rehearsal, without requiring a click.
    const timer = setTimeout(attempt, 0);
    document.addEventListener('pointerup', gesture);
    document.addEventListener('keydown', gesture);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      live = false;
      clearTimeout(timer);
      document.removeEventListener('pointerup', gesture);
      document.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', visibility);
      audio.pause();
      if (attempted) consumed.current = true;
    };
  }, [active]);
}

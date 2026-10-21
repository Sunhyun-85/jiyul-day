import manifest from '../data/audio-manifest.json';
export interface SpeechProvider {
  speak(text: string, rate: number, audioUrl?: string): Promise<boolean>;
  stop(): void;
}
/** File-only audio. Missing recordings never fall back to mechanical browser TTS. */
export class FileSpeechProvider implements SpeechProvider {
  private audio?: HTMLAudioElement;
  private finish?: (ok: boolean) => void;
  stop() {
    this.finish?.(false);
    this.finish = undefined;
    try {
      this.audio?.pause();
    } catch {
      /* unavailable device */
    }
    this.audio = undefined;
  }
  async speak(text: string, rate: number, audioUrl?: string): Promise<boolean> {
    this.stop();
    const entry = manifest.entries.find((e) => e.text === text && e.available);
    const source = audioUrl ?? entry?.audio_path;
    if (!source) return false;
    try {
      const url = new URL(source, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith('/audio/')) return false;
      const audio = new Audio(url.href);
      this.audio = audio;
      audio.playbackRate = rate;
      return await new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.finish = undefined;
          audio.onended = null;
          audio.onerror = null;
          try {
            audio.pause();
          } catch {
            /* device removed */
          }
          resolve(ok);
        };
        const timer = setTimeout(() => done(false), 30000);
        this.finish = done;
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        try {
          audio.play().catch(() => done(false));
        } catch {
          done(false);
        }
      });
    } catch {
      return false;
    }
  }
}

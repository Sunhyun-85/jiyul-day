export interface SpeechProvider {
  speak(text: string, rate: number, audioUrl?: string): Promise<boolean>;
  stop(): void;
}

export class BrowserSpeechProvider implements SpeechProvider {
  private audio?: HTMLAudioElement;
  private finish?: (ok: boolean) => void;
  private request = 0;

  stop() {
    this.request++;
    this.finish?.(false);
    this.finish = undefined;
    try {
      this.audio?.pause();
    } catch {
      /* 기기 재생 오류가 놀이를 막지 않도록 해요. */
    }
    try {
      if ('speechSynthesis' in globalThis) speechSynthesis.cancel();
    } catch {
      /* 음성 엔진이 없어도 계속해요. */
    }
  }

  async speak(text: string, rate: number, audioUrl?: string): Promise<boolean> {
    this.stop();
    const request = this.request;
    if (audioUrl) {
      try {
        // 녹음도 같은 사이트의 파일만 재생해요.
        const url = new URL(audioUrl, location.href);
        if (url.origin !== location.origin) return false;
        const audio = new Audio(url.href);
        this.audio = audio;
        audio.playbackRate = rate;
        const played = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => done(false), 30000);
          let settled = false;
          const done = (ok: boolean) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            this.finish = undefined;
            audio.onended = null;
            audio.onerror = null;
            if (!ok) audio.pause();
            resolve(ok);
          };
          this.finish = done;
          audio.onended = () => done(true);
          audio.onerror = () => done(false);
          audio.play().catch(() => done(false));
        });
        if (played) return true;
        if (request !== this.request) return false;
      } catch {
        /* 녹음 재생 실패 시 기기 음성을 사용해요. */
      }
    }
    try {
      if (!('speechSynthesis' in globalThis)) return false;
      const voice = speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith('ko') && v.localService);
      if (!voice) return false;
      return await new Promise<boolean>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.voice = voice;
        utterance.rate = rate;
        let settled = false;
        const timer = setTimeout(() => done(false), 20000);
        const done = (ok: boolean) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.finish = undefined;
          resolve(ok);
        };
        this.finish = done;
        utterance.onend = () => done(true);
        utterance.onerror = () => done(false);
        try {
          speechSynthesis.speak(utterance);
        } catch {
          done(false);
        }
      });
    } catch {
      return false;
    }
  }
}

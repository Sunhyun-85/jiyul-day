// 녹음 파일이나 네트워크 없이 짧고 부드러운 조작 소리만 만들어요.
export class SoundEffects {
  private context?: AudioContext;
  play(kind: 'tap' | 'drop' | 'happy') {
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      void context
        .resume()
        .then(() => {
          const notes = kind === 'happy' ? [392, 494, 587] : kind === 'drop' ? [440, 660] : [330];
          notes.forEach((frequency, index) => {
            const start = context.currentTime + index * 0.12;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, start);
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.045, start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.22);
          });
        })
        .catch(() => {});
    } catch {
      /* 소리 지원이 없어도 놀이를 이어가요. */
    }
  }
}

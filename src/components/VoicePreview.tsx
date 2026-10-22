import { useEffect, useRef } from 'react';
import manifest from '../data/audio-manifest.json';
const lines = [
  '지율이의 신나는 하루',
  '지율아, 같이 놀자! 어떤 놀이 할까?',
  '빨강 블록을 올려 줄래?',
  '괜찮아! 우리 다시 같이 쌓자.',
];
/** Parent-only listening controls, so every approved sample is easy to find. */
export function VoicePreview() {
  const audio = useRef<(HTMLAudioElement | null)[]>([]);
  useEffect(
    () => () => {
      audio.current.forEach((player) => player?.pause());
    },
    [],
  );
  return (
    <section className="voice-preview" aria-label="새 목소리 들어보기">
      <h3>새 목소리 들어보기</h3>
      <p className="small">
        원래 속도의 샘플 4개입니다. 게임 음성을 꺼 두었어도 여기서 직접 들을 수 있어요.
      </p>
      {lines.map((line, i) => {
        const entry = manifest.entries.find((e) => e.text === line && e.available);
        return (
          entry && (
            <div key={line}>
              <p id={`voice-preview-${i}`}>{line}</p>
              <audio
                ref={(element) => {
                  if (!element) audio.current[i]?.pause();
                  audio.current[i] = element;
                }}
                controls
                preload="none"
                aria-labelledby={`voice-preview-${i}`}
                src={entry.audio_path}
                onPlay={() =>
                  audio.current.forEach((player, index) => {
                    if (index !== i) player?.pause();
                  })
                }
              />
            </div>
          )
        );
      })}
    </section>
  );
}

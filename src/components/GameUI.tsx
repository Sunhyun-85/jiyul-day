import { lazy, Suspense } from 'react';
import type { Choice, Mood, Session, Settings } from '../engine/types';
import type { Phase } from '../engine/DialogueEngine';
const GameCanvas = lazy(() =>
  import('./GameCanvas').then((module) => ({ default: module.GameCanvas })),
);
interface GameUIProps {
  session: Session;
  phase: Phase;
  mood: Mood;
  settings: Settings;
  text: string;
  touched: boolean;
  voiceFailed: boolean;
  spoken: boolean;
  choices: Choice[];
  touch: (target: string) => void;
  leave: (page: 'home' | 'episodes') => void;
  changeSettings: (settings: Settings) => void;
  say: (text: string) => void;
  reveal: () => void;
  select: (choice: Choice) => void;
  next: () => void;
  onHint: () => void;
  onSpoken: () => void;
}
export function GameUI({
  session,
  phase,
  mood,
  settings,
  text,
  touched,
  voiceFailed,
  spoken,
  choices,
  touch,
  leave,
  changeSettings,
  say,
  reveal,
  select,
  next,
  onHint,
  onSpoken,
}: GameUIProps) {
  const friend = session.episode.character === 'jini' ? '지니' : '하우리';
  return (
    <section className="play-page">
      <div className="play-header">
        <button
          className="icon-button"
          aria-label="이야기 고르기로 돌아가기"
          onClick={() => leave('episodes')}
        >
          ←
        </button>
        <div>
          <span className="eyebrow">
            {session.episode.place === 'home' ? '우리 집' : '유치원'}의 작은 이야기
          </span>
          <h1>{session.episode.title}</h1>
        </div>
        <button
          className="icon-button"
          aria-label={settings.voice ? '음성 끄기' : '음성 켜기'}
          onClick={() => changeSettings({ ...settings, voice: !settings.voice })}
        >
          {settings.voice ? '♫' : '♩'}
        </button>
      </div>
      <Suspense
        fallback={
          <div className="scene-frame loading-scene" role="status">
            친구들이 놀이를 준비하고 있어요…
          </div>
        }
      >
        <GameCanvas session={session} mood={mood} onTouch={touch} />
      </Suspense>
      {phase === 'complete' ? (
        <div className="completion">
          <span className="completion-flower">✿</span>
          <div className="eyebrow">함께해서 즐거웠어!</div>
          <h2>마음을 나눈 하루</h2>
          <p>
            친구의 모습을 살펴보고
            <br />
            서로의 마음을 알아보았어요.
          </p>
          <button className="primary" onClick={() => leave('episodes')}>
            다른 이야기 만나기 <span>→</span>
          </button>
          <button className="text-button" onClick={() => leave('home')}>
            오늘 놀이는 여기까지
          </button>
        </div>
      ) : (
        <div className="dialogue-area">
          <div className="dialogue-card" aria-live="polite">
            <div className="dialogue-speaker">
              <span className="speaker-dot" />
              {session.episode.character === 'jini' ? '지니의 이야기' : friend}
              <button aria-label="대사 다시 듣기" className="replay" onClick={() => say(text)}>
                ♫ <span>다시 듣기</span>
              </button>
            </div>
            <p>{text}</p>
            {voiceFailed && (
              <small className="voice-note">
                기기 음성이 준비되지 않았어요. 글과 그림으로 함께해 주세요.
              </small>
            )}
          </div>
          {!touched ? (
            <button className="touch-prompt" onClick={() => touch('friend')}>
              ☝ {friend}를 톡 눌러 볼까요?
            </button>
          ) : (
            <>
              {phase === 'observe' && (
                <div className="observation-area">
                  <p>👀 천천히 살펴보고 이야기해요.</p>
                  <button className="text-button" onClick={reveal}>
                    선택지 보기 →
                  </button>
                </div>
              )}
              {phase === 'choose' && (
                <div className="choices">
                  {choices.map((choice) => (
                    <div className="choice-row" key={choice.id}>
                      <button
                        className="choice-button"
                        data-action={choice.id}
                        onClick={() => select(choice)}
                      >
                        <span className="choice-icon">{choice.icon}</span>
                        <span>{choice.label}</span>
                        <span className="choice-arrow">›</span>
                      </button>
                      {settings.voice && (
                        <button
                          className="choice-audio"
                          aria-label={`${choice.label} 듣기`}
                          onClick={() => say(choice.label)}
                        >
                          ♫
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {phase === 'response' && (
                <button className="primary continue-button" onClick={next}>
                  이야기 이어가기 <span>→</span>
                </button>
              )}
              <div className="play-tools">
                {settings.hints && phase !== 'response' && (
                  <button className="text-button" onClick={onHint}>
                    ☀ 함께 살펴보기
                  </button>
                )}
                {settings.parentMode && phase !== 'response' && (
                  <button className={`text-button ${spoken ? 'observed' : ''}`} onClick={onSpoken}>
                    {spoken ? '✓ 발화를 기록할게요' : '♡ 말했어요'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Choice, Mood, Session, Settings } from '../engine/types';
import type { Phase } from '../engine/DialogueEngine';
import { svgUrl } from '../game/art';
import { toySvg } from '../game/playArt';
import { itemTarget, type Reaction } from '../game/playState';
import { DraggableToy } from './DraggableToy';
const GameCanvas = lazy(() => import('./GameCanvas').then((m) => ({ default: m.GameCanvas })));
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
  paused: boolean;
  touch: (target: string) => void;
  leave: (page: 'home' | 'episodes') => void;
  say: (text: string) => void;
  reveal: () => void;
  select: (choice: Choice, input?: 'tap' | 'drag') => boolean;
  next: () => void;
  onHint: () => void;
  onSpoken: () => void;
  onAgain: () => void;
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
  paused,
  touch,
  leave,
  say,
  reveal,
  select,
  next,
  onHint,
  onSpoken,
  onAgain,
}: GameUIProps) {
  const board = useRef<HTMLElement>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [hint, setHint] = useState(false);
  const [replays, setReplays] = useState(0);
  const [transcript, setTranscript] = useState(false);
  const serial = useRef(0);
  const [touchCount, setTouchCount] = useState(0);
  const episode = session.episode.id;
  const variant = session.variation;
  const care = episode === 'jini-needs';
  const ball = episode === 'jini-ball';
  const blocks = episode === 'hauri-blocks';
  const friend = session.episode.character === 'jini' ? '지니' : '하우리';
  const lastAction = variant.actions.find((a) => a.id === reaction?.actionId);
  const currentShort =
    phase === 'complete'
      ? reaction?.actionId === 'respect'
        ? '조금 쉬고 올게.'
        : '같이 해서 좋았어!'
      : phase === 'response'
        ? (lastAction?.shortResult ?? text)
        : (variant.shortLine ?? variant.lines[0]);
  const sceneState = useMemo(
    () => ({ mood, phase, reaction, paused, touchCount }),
    [mood, phase, reaction, paused, touchCount],
  );
  useEffect(() => {
    if (phase !== 'response' || paused || transcript) return;
    const duration = settings.captions
      ? Math.max(6500, text.length * 120)
      : settings.speed === 'slow'
        ? 5500
        : 3500;
    const timer = setTimeout(next, duration);
    return () => clearTimeout(timer);
  }, [phase, paused, settings.speed, settings.captions, text, next, replays, transcript]);
  useEffect(() => {
    setHeld(null);
    setHint(false);
  }, [choices]);
  const use = (choice: Choice, input: 'tap' | 'drag' = 'tap') => {
    if (phase !== 'choose' || paused) return;
    if (select(choice, input)) {
      setHeld(null);
      setHint(false);
      setReaction({ id: ++serial.current, actionId: choice.id, complete: choice.complete });
    }
  };
  const target = (id: string) => {
    const choice = choices.find((c) => c.id === held);
    if (choice && itemTarget(episode, choice.id) === id) {
      use(choice);
      return;
    }
    if (ball && phase === 'choose') {
      const match = choices.find((c) => c.id === (id === 'door' ? 'room' : id));
      if (match) {
        use(match);
        return;
      }
    }
    touch(id);
  };
  const activeTarget = held ? itemTarget(episode, held) : null;
  const destination = (id: string, label: string, kind: string, className: string) => (
    <button
      key={id}
      data-target={id}
      className={`world-object ${className} ${activeTarget === id ? 'drop-glow' : ''} ${hint && ((care && ((variant.state === 'hungry' && id === 'bowl') || (variant.state === 'thirsty' && id === 'waterBowl') || (variant.state === 'walk' && id === 'door'))) || (ball && (variant.id === id || (variant.id === 'room' && id === 'door')))) ? 'hint-glow' : ''}`}
      aria-label={label}
      onClick={() => target(id)}
    >
      <img src={svgUrl(toySvg(kind))} draggable={false} alt="" />
      {activeTarget === id && (
        <span className="drop-ring" aria-hidden="true">
          ↓
        </span>
      )}
    </button>
  );
  return (
    <section
      ref={board}
      className={`play-world ${phase} ${care ? 'care-world' : ''}`}
      aria-label={session.episode.title}
      data-episode={episode}
      data-phase={phase}
      data-variation={variant.id}
    >
      <Suspense
        fallback={
          <div className="world-loading" role="status">
            ☀
          </div>
        }
      >
        <GameCanvas session={session} state={sceneState} onTouch={touch} />
      </Suspense>
      <button
        className={`friend-touch ${!touched ? 'invite-touch' : ''}`}
        aria-label={`${friend} 만지기`}
        onClick={() => {
          setTouchCount((n) => n + 1);
          touch('friend');
        }}
      >
        {!touched && (
          <span className="touch-hand" aria-hidden="true">
            ☝
          </span>
        )}
      </button>
      <div
        className={`thought-bubble ${phase === 'response' ? 'responding' : ''}`}
        aria-live="polite"
      >
        <img
          src={svgUrl(toySvg(phase === 'complete' ? 'listen' : (variant.cueIcon ?? 'ask')))}
          alt=""
        />
        <button
          className="short-speech"
          aria-label="대사 다시 듣기"
          onClick={() => {
            say(text);
            setReplays((n) => n + 1);
          }}
        >
          <span>{settings.captions ? text : currentShort}</span>
          <small aria-hidden="true">♫</small>
        </button>
      </div>
      {care && (
        <>
          {destination('bowl', '밥그릇에 놓기', 'bowl', 'food-bowl')}
          {destination('waterBowl', '물그릇에 놓기', 'waterBowl', 'water-bowl')}
          <button
            data-target="door"
            className={`door-target ${activeTarget === 'door' ? 'drop-glow' : ''} ${hint && variant.state === 'walk' ? 'hint-glow' : ''}`}
            aria-label="목줄을 들고 어른과 문으로 가기"
            onClick={() => target('door')}
          >
            {activeTarget === 'door' && <span>↓</span>}
          </button>
          {reaction &&
            (phase === 'response' || phase === 'complete') &&
            ['food', 'water'].includes(reaction.actionId) && (
              <div
                key={reaction.id}
                className={`care-effect ${reaction.actionId === 'food' ? 'food-effect' : 'water-effect'}`}
                aria-hidden="true"
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            )}
          {reaction?.complete && reaction.actionId === 'walk' && (
            <img className="grown-up" src={svgUrl(toySvg('adult'))} alt="함께 산책하는 어른" />
          )}
        </>
      )}
      {ball && (
        <>
          {destination('sofa', '소파 아래 살펴보기', 'sofa', 'search-sofa')}
          {destination('box', '상자 뒤 살펴보기', 'box', 'search-box')}
          <button
            className={`door-target ${hint && variant.id === 'room' ? 'hint-glow' : ''}`}
            data-target="door"
            aria-label="옆방 살펴보기"
            onClick={() => target('door')}
          />
          <img
            className={`hidden-ball ball-${variant.id} ${reaction?.complete ? 'ball-found' : ''}`}
            src={svgUrl(toySvg('ball'))}
            alt="빨간 공"
          />
          {phase === 'response' && !reaction?.complete && reaction?.actionId !== 'ask' && (
            <span className={`search-cloud search-${reaction?.actionId}`} aria-hidden="true">
              …
            </span>
          )}
        </>
      )}
      {session.episode.place === 'school' && (
        <>
          {destination(
            'building',
            '블록을 함께 놓기',
            variant.state === 'rest' ? 'respect' : variant.state === 'toy' ? 'box' : 'blocks',
            'building-area',
          )}
          {(blocks || variant.state === 'tower') &&
            reaction?.complete &&
            reaction.actionId !== 'respect' && (
              <div
                className={`built-tower ${reaction.actionId === 'take_turns' ? 'turn-taking' : ''}`}
                key={reaction.id}
                aria-label="함께 쌓은 블록"
              >
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            )}
          {reaction?.actionId === 'respect' && reaction.complete && (
            <div className="rest-cloud" aria-label="친구가 쉬고 있어요">
              ☁
            </div>
          )}
          {reaction?.actionId === 'listen' && reaction.complete && (
            <div className="friend-hearts" aria-hidden="true">
              ♡ ♡
            </div>
          )}
        </>
      )}
      {!touched && <span className="tiny-prompt">{friend}야!</span>}
      {touched && phase === 'observe' && (
        <button className="skip-wait round-control" aria-label="기다리기 건너뛰기" onClick={reveal}>
          ☝<span>놀자</span>
        </button>
      )}
      {phase === 'choose' && (
        <div className="toy-tray" aria-label="놀이 물건">
          {choices.map((choice) => (
            <DraggableToy
              key={choice.id}
              choice={choice}
              target={itemTarget(episode, choice.id)}
              board={board}
              held={held === choice.id}
              onHold={() => {
                setHeld(choice.id);
                say(choice.label);
              }}
              onUse={(method) => use(choice, method)}
            />
          ))}
        </div>
      )}
      {held && activeTarget && (
        <div className="gesture-tip" aria-live="polite">
          <span>☝</span>{' '}
          {activeTarget === 'door'
            ? '문으로 가져가요'
            : activeTarget === 'building'
              ? '블록 위에 놓아요'
              : '그릇에 놓아요'}
        </div>
      )}
      {phase === 'response' && (
        <button className="continue-play round-control" aria-label="이야기 이어가기" onClick={next}>
          ➜
        </button>
      )}
      {phase === 'complete' && (
        <div className="play-ending" aria-label="놀이 마무리">
          <div className="warm-heart" aria-hidden="true">
            ♡
          </div>
          <button className="ending-button" onClick={onAgain} aria-label="다시 놀기">
            ↻<span>또 놀자!</span>
          </button>
          <button
            className="ending-button secondary"
            onClick={() => leave('episodes')}
            aria-label="다른 이야기 만나기"
          >
            <img src={svgUrl(toySvg('home'))} alt="" />
            <span>다른 놀이</span>
          </button>
        </div>
      )}
      <div className="world-tools">
        {settings.hints && touched && ['observe', 'choose'].includes(phase) && (
          <button
            className="round-control hint-button"
            aria-label="함께 살펴보기"
            onClick={() => {
              setHint(true);
              onHint();
            }}
          >
            ☀
          </button>
        )}
        {settings.parentMode && touched && ['observe', 'choose'].includes(phase) && (
          <button
            className={`round-control ${spoken ? 'observed' : ''}`}
            aria-label={spoken ? '발화 기록됨' : '말했어요'}
            onClick={onSpoken}
          >
            {spoken ? '✓' : '♡'}
          </button>
        )}
        <button
          className="round-control transcript-button"
          aria-label="전체 대사 보기"
          onClick={() => setTranscript((v) => !v)}
        >
          ☷
        </button>
      </div>
      {transcript && (
        <div className="transcript-panel">
          <p>{text}</p>
          {voiceFailed && <small>기기 음성이 없어요. 함께 읽어 주세요.</small>}
          <button aria-label="전체 대사 닫기" onClick={() => setTranscript(false)}>
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

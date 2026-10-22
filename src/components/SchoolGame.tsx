import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { SchoolScene, type SchoolSnapshot, type SchoolEvent } from '../game/school/SchoolScene';
import { HANDS, COLORS } from '../engine/SchoolPlayEngine';
import { svgUrl } from '../game/art';
import { handSvg, blockSvg } from '../game/school/art';
import { toySvg } from '../game/playArt';
const handNames = { scissors: '가위', rock: '바위', paper: '보' };
export default function SchoolGame({
  paused,
  onLine,
  onSound,
  onFinish,
  onStories,
}: {
  paused: boolean;
  onLine: (text: string) => void;
  onSound: (name: 'tap' | 'drop' | 'happy') => void;
  onFinish: (event: SchoolEvent) => void;
  onStories: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<SchoolScene | undefined>(undefined);
  const latest = useRef({ paused, onLine, onSound, onFinish });
  latest.current = { paused, onLine, onSound, onFinish };
  const [snapshot, setSnapshot] = useState<SchoolSnapshot>();
  useEffect(() => {
    let active = true;
    const current = new SchoolScene({
      snapshot: (s) => {
        if (active) setSnapshot(s);
      },
      line: (text) => latest.current.onLine(text),
      sound: (name) => latest.current.onSound(name),
      finish: (e) => latest.current.onFinish(e),
      ready: () => current.setPaused(latest.current.paused || document.hidden),
    });
    scene.current = current;
    const el = container.current!;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: el,
      width: 720,
      height: Math.max(1000, (el.clientHeight / el.clientWidth) * 720),
      scene: current,
      backgroundColor: '#f2dfb7',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      input: { activePointers: 2 },
      audio: { noAudio: true },
      banner: false,
    });
    const resize = new ResizeObserver(() => {
      if (el.clientWidth)
        game.scale.setGameSize(720, Math.max(1000, (el.clientHeight / el.clientWidth) * 720));
    });
    resize.observe(el);
    const visibility = () => current.setPaused(latest.current.paused || document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      resize.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      game.destroy(true);
      scene.current = undefined;
    };
  }, []);
  useEffect(() => {
    scene.current?.setPaused(paused || document.hidden);
  }, [paused]);
  const phase = snapshot?.phase;
  return (
    <section
      className="school-game"
      aria-label="우리와 함께 노는 유치원"
      data-state={snapshot ? JSON.stringify(snapshot) : ''}
      data-phase={phase}
    >
      <div
        ref={container}
        className="home-phaser"
        role="img"
        aria-label="지율이와 우리가 함께 노는 교실. 고른 블록을 탑으로 끌거나 놓을 곳을 눌러요."
      />
      {snapshot?.line && (
        <button
          className="school-bubble"
          onClick={() => onLine(snapshot.line)}
          aria-label={`우리: ${snapshot.line}`}
        >
          <span>우리</span>
          {snapshot.line}
          {(phase === 'block-color' || phase === 'block-place') && (
            <img
              className="requested-block"
              src={svgUrl(blockSvg(COLORS[snapshot.requested].hex))}
              alt={`${COLORS[snapshot.requested].name} 블록`}
            />
          )}
        </button>
      )}
      {snapshot?.mode === 'rps' && (
        <div
          className="school-score"
          role="status"
          aria-label={`지율이 ${snapshot.scores.jiyul}승, 우리 ${snapshot.scores.woori}승`}
        >
          <span>
            지율이 <b>{snapshot.scores.jiyul}</b>
          </span>
          <small>{snapshot.winner ? '끝!' : `${snapshot.round}판`} · 3승 먼저</small>
          <span>
            <b>{snapshot.scores.woori}</b> 우리
          </span>
        </div>
      )}
      {snapshot?.hands && (
        <div className="school-hands-label" aria-live="polite">
          <span>지율이: {handNames[snapshot.hands.jiyul]}</span>
          <span>우리: {handNames[snapshot.hands.woori]}</span>
        </div>
      )}
      <div className="school-controls" inert={paused}>
        {phase === 'intro' && <p className="school-prompt">우리가 오고 있어!</p>}
        {phase === 'menu' && (
          <div className="school-game-choices">
            <button onClick={() => scene.current?.start('rps')}>
              <img src={svgUrl(handSvg('scissors'))} alt="" />
              <span>가위바위보</span>
            </button>
            <button onClick={() => scene.current?.start('blocks')}>
              <img src={svgUrl(toySvg('blocks'))} alt="" />
              <span>무지개 블록</span>
            </button>
          </div>
        )}
        {phase === 'rps-pick' && (
          <div className="school-hand-choices">
            {HANDS.map((hand) => (
              <button
                key={hand}
                aria-label={handNames[hand]}
                onClick={() => scene.current?.playHand(hand)}
              >
                <img src={svgUrl(handSvg(hand))} alt="" />
                <span>{handNames[hand]}</span>
              </button>
            ))}
          </div>
        )}
        {phase === 'rps-reveal' && !snapshot?.winner && (
          <button className="school-next" onClick={() => scene.current?.nextRound()}>
            한 번 더!
          </button>
        )}
        {(phase === 'block-color' || phase === 'friend-color') && (
          <>
            <p className="school-prompt">
              {phase === 'block-color' ? '우리가 말한 색을 골라 줘' : '우리에게 색을 골라 줘'}
            </p>
            <div className="school-colors">
              {COLORS.map((color, i) => (
                <button
                  key={color.id}
                  aria-label={`${color.name} 블록`}
                  onClick={() => scene.current?.chooseColor(i)}
                >
                  <img src={svgUrl(blockSvg(color.hex))} alt="" />
                  <span>{color.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {phase === 'block-place' && (
          <>
            <p className="school-prompt">블록을 끌어 올리거나, 탑 위를 톡!</p>
            <button
              className="school-next"
              onClick={() => scene.current?.placeBlock(snapshot!.target.x)}
            >
              가운데에 올리기
            </button>
          </>
        )}
        {phase === 'friend-place' && <p className="school-prompt">차례를 기다려 줘!</p>}
        {(phase === 'result' || (phase === 'rps-reveal' && snapshot?.winner)) && (
          <>
            <p className="school-prompt">
              {snapshot?.winner === 'jiyul' ? '지율이가 이겼어!' : '우리가 이겼어!'}
            </p>
            <button className="school-next" onClick={() => scene.current?.menu()}>
              또 같이 놀자!
            </button>
          </>
        )}
      </div>
      {phase === 'menu' && (
        <button className="school-stories" onClick={onStories} aria-label="기존 이야기 고르기">
          이야기 놀이
        </button>
      )}
      {phase && phase !== 'menu' && phase !== 'intro' && (
        <button
          className="school-stories"
          onClick={() => scene.current?.menu()}
          aria-label="놀이 다시 고르기"
        >
          놀이 고르기
        </button>
      )}
    </section>
  );
}

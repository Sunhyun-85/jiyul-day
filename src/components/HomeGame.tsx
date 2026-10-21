import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import {
  HomeScene,
  HOME_H,
  HOME_W,
  type HomeStart,
  type HomeSnapshot,
  type HomeEvent,
} from '../game/home/HomeScene';
import type { Settings } from '../engine/types';
export default function HomeGame({
  start,
  settings,
  paused,
  onLine,
  onEvent,
  onSound,
  onDogSound,
  onStories,
}: {
  start: HomeStart;
  settings: Settings;
  paused: boolean;
  onLine: (text: string) => void;
  onEvent: (event: HomeEvent) => void;
  onSound: (name: 'tap' | 'drop' | 'happy') => void;
  onDogSound: (sound: 'bark' | 'yawn') => void;
  onStories: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<HomeScene | undefined>(undefined);
  const latest = useRef({ paused, onLine, onEvent, onSound, onDogSound });
  latest.current = { paused, onLine, onEvent, onSound, onDogSound };
  const [snapshot, setSnapshot] = useState<HomeSnapshot>();
  const [line, setLine] = useState('');
  const [showLine, setShowLine] = useState(true);
  useEffect(() => {
    let active = true;
    const current = new HomeScene(start, {
      ready: () => {
        if (latest.current.paused) current.setPaused(true);
      },
      dogSound: (sound) => latest.current.onDogSound(sound),
      snapshot: (s) => {
        if (active) setSnapshot(s);
      },
      line: (text) => {
        if (active) {
          setLine(text);
          setShowLine(true);
          latest.current.onLine(text);
        }
      },
      event: (e) => latest.current.onEvent(e),
      sound: (name) => latest.current.onSound(name),
    });
    scene.current = current;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container.current!,
      width: HOME_W,
      height: Math.max(
        HOME_H,
        (container.current!.clientHeight / container.current!.clientWidth) * HOME_W,
      ),
      backgroundColor: '#eadbc0',
      scene: current,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      input: { activePointers: 2 },
      audio: { noAudio: true },
      banner: false,
    });
    const resize = new ResizeObserver(() => {
      const el = container.current;
      if (el && el.clientWidth) {
        game.scale.setGameSize(
          HOME_W,
          Math.max(HOME_H, (el.clientHeight / el.clientWidth) * HOME_W),
        );
        game.scale.refresh();
      }
    });
    resize.observe(container.current!);
    const visibility = () =>
      current.scene?.isActive() || current.scene?.isPaused()
        ? current.setPaused(document.hidden || latest.current.paused)
        : undefined;
    document.addEventListener('visibilitychange', visibility);
    return () => {
      active = false;
      resize.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      game.destroy(true);
      scene.current = undefined;
    };
  }, [start]);
  useEffect(() => {
    if (scene.current?.scene?.isActive() || scene.current?.scene?.isPaused())
      scene.current.setPaused(paused || document.hidden);
  }, [paused]);
  useEffect(() => {
    if (paused || settings.captions) return;
    const timer = setTimeout(() => setShowLine(false), 6000);
    return () => clearTimeout(timer);
  }, [line, paused, settings.captions]);
  return (
    <section
      className="home-game"
      aria-label="지니와 자유롭게 노는 우리 집"
      data-ready={snapshot?.ready ? 'true' : 'false'}
      data-state={snapshot ? JSON.stringify(snapshot) : ''}
    >
      <div
        ref={container}
        className="home-phaser"
        role="img"
        aria-label="거실에서 지율이와 말티푸 지니가 놀고 있어요. 당근 인형을 끌거나, 누른 뒤 바닥을 눌러 옮겨요."
      />
      {!snapshot?.ready && <div className="home-loading">우리 집으로 가는 중…</div>}
      {(showLine || settings.captions) && line && (
        <button
          className="home-narrator"
          aria-label={`내레이터: ${line}`}
          onClick={() => onLine(line)}
        >
          <span className="narrator-dot" />
          {line}
        </button>
      )}
      <button className="home-stories" onClick={onStories} aria-label="기존 이야기 고르기">
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            d="M24 13Q12 5 4 10v29q10-5 20 3 10-8 20-3V10q-8-5-20 3Z"
            fill="#fff4d5"
            stroke="#94754e"
            strokeWidth="2.5"
          />
          <path
            d="M24 13v29M10 17l8 2m-8 6 8 2m12-8 8-2m-8 10 8-2"
            stroke="#bba47c"
            strokeWidth="2.5"
          />
        </svg>
      </button>
      {snapshot?.selected && (
        <div className="home-gesture" aria-live="polite">
          {snapshot.selected === 'food'
            ? '밥그릇을 톡'
            : snapshot.selected === 'bottle'
              ? '물그릇을 톡'
              : '놓을 곳을 톡'}
        </div>
      )}
      <div className="home-accessible" aria-label="키보드 놀이 조작">
        {(
          [
            ['carrot', '당근 인형 집기'],
            ['jini', '지니 쓰다듬기 또는 당근 받기'],
            ['jiyul', '지율이 선택'],
            ['food', '사료 집기'],
            ['bowl', '밥그릇에 사료 놓기'],
            ['waterBowl', '물그릇 채우기'],
            ['bed', '지니 침대에서 쉬기'],
            ['floor', '러그에 놓기 또는 이동'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => scene.current?.command(id)}>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

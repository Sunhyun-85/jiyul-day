import { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../game/GameScene';
import type { Session } from '../engine/types';
import type { SceneState } from '../game/playState';
export function GameCanvas({
  session,
  state,
  onTouch,
}: {
  session: Session;
  state: SceneState;
  onTouch: (target: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<GameScene | undefined>(undefined);
  const callback = useRef(onTouch);
  const currentState = useRef(state);
  const [ready, setReady] = useState(false);
  callback.current = onTouch;
  currentState.current = state;
  useEffect(() => {
    let active = true;
    setReady(false);
    const current = new GameScene(
      session,
      (target) => callback.current(target),
      currentState.current,
      () => {
        if (active) {
          current.apply(currentState.current);
          setReady(true);
        }
      },
    );
    scene.current = current;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container.current!,
      width: container.current!.clientWidth,
      height: container.current!.clientHeight,
      transparent: true,
      scene: current,
      scale: { mode: Phaser.Scale.RESIZE },
      render: { antialias: true },
      audio: { noAudio: true },
      banner: false,
    });
    const resize = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width && height) game.scale.resize(width, height);
    });
    resize.observe(container.current!);
    return () => {
      active = false;
      resize.disconnect();
      game.destroy(true);
      scene.current = undefined;
    };
  }, [session]);
  useEffect(() => {
    scene.current?.apply(state);
    if (scene.current?.scene?.isActive() && state.paused) scene.current.scene.pause();
    else if (scene.current?.scene?.isPaused() && !state.paused) scene.current.scene.resume();
  }, [state]);
  return (
    <div
      className="game-canvas"
      ref={container}
      data-ready={ready}
      role="img"
      aria-label={session.variation.clue}
    />
  );
}

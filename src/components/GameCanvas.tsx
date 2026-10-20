import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from '../game/GameScene';
import type { Mood, Session } from '../engine/types';
export function GameCanvas({
  session,
  mood,
  onTouch,
}: {
  session: Session;
  mood: Mood;
  onTouch: (target: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<GameScene | undefined>(undefined);
  const callback = useRef(onTouch);
  callback.current = onTouch;
  useEffect(() => {
    const current = new GameScene(session, (target) => callback.current(target));
    scene.current = current;
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: container.current!,
      width: 720,
      height: 500,
      transparent: true,
      scene: current,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      audio: { noAudio: true },
    });
    return () => {
      game.destroy(true);
      scene.current = undefined;
    };
  }, [session]);
  useEffect(() => scene.current?.setMood(mood), [mood]);
  return (
    <div className="scene-frame">
      <div ref={container} className="game-canvas" role="img" aria-label={session.variation.clue} />
      <button
        className="character-hit"
        aria-label={`${session.episode.character === 'jini' ? '지니' : '하우리'} 만지기`}
        onClick={() => onTouch('friend')}
      />
      <div className="scene-caption">
        {session.episode.place === 'home' ? '햇살 가득 우리 집' : '친구와 함께 유치원'}
      </div>
    </div>
  );
}

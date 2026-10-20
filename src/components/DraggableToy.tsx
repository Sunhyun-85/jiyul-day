import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { svgUrl } from '../game/art';
import { toySvg } from '../game/playArt';
import { dropInside } from '../game/playState';
import type { Choice } from '../engine/types';
interface Props {
  choice: Choice;
  target: string | null;
  board: RefObject<HTMLElement | null>;
  held: boolean;
  onHold: () => void;
  onUse: (method: 'tap' | 'drag') => void;
}
export function DraggableToy({ choice, target, board, held, onHold, onUse }: Props) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const finish = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    start.current = null;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12;
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    if (cancel) return;
    if (!target) {
      if (!moved) onUse('tap');
      return;
    }
    if (moved) {
      const destination = board.current?.querySelector(`[data-target="${target}"]`);
      if (
        destination &&
        dropInside({ x: event.clientX, y: event.clientY }, destination.getBoundingClientRect())
      )
        onUse('drag');
    }
  };
  return (
    <button
      className={`toy-item ${held ? 'held' : ''} ${dragging ? 'dragging' : ''}`}
      data-action={choice.id}
      aria-label={choice.label}
      aria-pressed={held}
      style={{
        transform: `translate(${offset.x}px,${offset.y}px) rotate(${dragging ? -9 : 0}deg)`,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        setDragging(true);
        onHold();
      }}
      onPointerMove={(e) => {
        if (start.current?.id === e.pointerId)
          setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
      }}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onClick={(e) => {
        if (e.detail === 0) {
          onHold();
          if (!target) onUse('tap');
        }
      }}
    >
      <img src={svgUrl(toySvg(choice.id))} alt="" draggable={false} />
      <span className="sr-only">
        {target ? '물건을 옮기거나 누른 뒤 목적지를 누르세요.' : '눌러서 이야기해요.'}
      </span>
    </button>
  );
}

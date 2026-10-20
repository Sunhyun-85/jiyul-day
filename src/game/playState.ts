import type { Mood } from '../engine/types';
import type { Phase } from '../engine/DialogueEngine';
export interface Reaction {
  id: number;
  actionId: string;
  complete: boolean;
}
export interface SceneState {
  mood: Mood;
  phase: Phase;
  reaction: Reaction | null;
  paused: boolean;
  touchCount: number;
}
export function itemTarget(episodeId: string, actionId: string): string | null {
  if (episodeId === 'jini-needs')
    return (
      ({ food: 'bowl', water: 'waterBowl', walk: 'door' } as Record<string, string>)[actionId] ??
      null
    );
  if (episodeId === 'hauri-blocks' && actionId === 'share_idea') return 'building';
  return null;
}
export function dropInside(
  point: { x: number; y: number },
  rect: { left: number; top: number; right: number; bottom: number },
  padding = 16,
) {
  return (
    point.x >= rect.left - padding &&
    point.x <= rect.right + padding &&
    point.y >= rect.top - padding &&
    point.y <= rect.bottom + padding
  );
}

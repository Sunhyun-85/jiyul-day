export type Desire = 'play' | 'food' | 'water' | 'rest';
export type DogBehavior =
  'fetch' | 'seek_food' | 'seek_water' | 'rest' | 'eat' | 'drink' | 'affection';
export interface CharacterState {
  hunger: number;
  thirst: number;
  energy: number;
  mood: 'content' | 'eager' | 'sleepy';
  desire: Desire;
}
export type HomeAction = 'carrot' | 'food' | 'water' | 'bed' | 'pet';
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function desireFor(s: Pick<CharacterState, 'hunger' | 'thirst' | 'energy'>): Desire {
  if (s.energy <= 25) return 'rest';
  if (s.thirst >= 65 && s.thirst >= s.hunger) return 'water';
  if (s.hunger >= 65) return 'food';
  if (s.thirst >= 65) return 'water';
  return 'play';
}
/** Needs change through play and care, never through random refusals or offline decay. */
export class CharacterStateEngine {
  state: CharacterState;
  constructor(initial: Pick<CharacterState, 'hunger' | 'thirst' | 'energy'>) {
    this.state = {
      hunger: initial.hunger,
      thirst: initial.thirst,
      energy: initial.energy,
      mood: 'content',
      desire: 'play',
    };
    this.normalize();
  }
  private normalize() {
    this.state.hunger = clamp(this.state.hunger);
    this.state.thirst = clamp(this.state.thirst);
    this.state.energy = clamp(this.state.energy);
    this.state.desire = desireFor(this.state);
    this.state.mood =
      this.state.desire === 'rest' ? 'sleepy' : this.state.desire === 'play' ? 'eager' : 'content';
  }
  reaction(action: HomeAction): DogBehavior {
    if (action === 'food') return 'eat';
    if (action === 'water') return 'drink';
    if (action === 'bed') return 'rest';
    if (action === 'pet') return 'affection';
    return { play: 'fetch', food: 'seek_food', water: 'seek_water', rest: 'rest' }[
      this.state.desire
    ] as DogBehavior;
  }
  /** Apply only after the visual action finishes; canceled motion cannot grant care. */
  finish(behavior: DogBehavior) {
    if (behavior === 'fetch') {
      this.state.energy -= 22;
      this.state.hunger += 23;
      this.state.thirst += 28;
    } else if (behavior === 'eat') {
      this.state.hunger -= 70;
    } else if (behavior === 'drink') {
      this.state.thirst -= 75;
    } else if (behavior === 'rest') {
      this.state.energy += 55;
    }
    this.normalize();
    return { ...this.state };
  }
}

/** Feedback reflects the need shown before the action, not merely any completed motion. */
export function meetsCurrentNeed(action: HomeAction, before: CharacterState): boolean {
  return (
    (action === 'carrot' && before.desire === 'play') ||
    (action === 'food' && before.desire === 'food') ||
    (action === 'water' && before.desire === 'water') ||
    (action === 'bed' && before.desire === 'rest')
  );
}

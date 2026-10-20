export type Place = 'home' | 'school' | 'playground' | 'arcade';
export type Mood = 'neutral' | 'happy' | 'sad' | 'thinking' | 'surprised';
export interface Action {
  id: string;
  intent: string;
  icon: string;
  lines: string[];
  result: string[];
  complete: boolean;
  mood: Mood;
}
export interface Variation {
  id: string;
  state: string;
  object: string;
  clue: string;
  lines: string[];
  hint: string;
  mood: Mood;
  actions: Action[];
}
export interface Episode {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  place: Place;
  character: 'jini' | 'hauri';
  variations: Variation[];
}
export interface Settings {
  choices: 2 | 3 | 4;
  speed: 'slow' | 'normal';
  wait: 0 | 4 | 8;
  hints: boolean;
  voice: boolean;
  parentMode: boolean;
}
export interface PlayRecord {
  id: string;
  date: string;
  sessionId: string;
  episodeId: string;
  variationId: string;
  actionId: string;
  intent: string;
  order: string[];
  responseMs: number;
  hintUsed: boolean;
  spoken: boolean;
  repeatCount: number;
  completed: boolean;
}
export interface Session {
  id: string;
  episode: Episode;
  variation: Variation;
  repeatCount: number;
}
export interface Choice extends Action {
  label: string;
}

import raw from '../data/episodes.json';
import type { Episode, Session, Mood } from './types';
import { VariationEngine } from './VariationEngine';
const moods: Mood[] = ['neutral','happy','sad','thinking','surprised'];
export function validateScenarios(data: unknown): Episode[] {
  const fail = () => { throw new Error('이야기 자료에 오류가 있어요. 올바른 자료로 다시 빌드해 주세요.'); };
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length>0 && v.every(s=>typeof s==='string' && s.trim().length>0);
  if (!Array.isArray(data) || !data.length) return fail();
  const ids = new Set<string>();
  for (const e of data) {
    if (!e || typeof e.id !== 'string' || ids.has(e.id) || !['home','school','playground','arcade'].includes(e.place) || !['jini','hauri'].includes(e.character) || (e.character==='jini' && e.place!=='home') || !strings([e.title,e.subtitle,e.icon]) || !Array.isArray(e.variations) || !e.variations.length) return fail();
    ids.add(e.id); const variants = new Set();
    for (const v of e.variations) {
      if (!v || !strings([v.id,v.state,v.object,v.clue,v.hint]) || variants.has(v.id) || !strings(v.lines) || !moods.includes(v.mood) || !Array.isArray(v.actions) || v.actions.length<4) return fail();
      variants.add(v.id); const actions = new Set();
      for (const a of v.actions) {
        if (!a || !strings([a.id,a.intent,a.icon]) || actions.has(a.id) || !strings(a.lines) || !strings(a.result) || typeof a.complete!=='boolean' || !moods.includes(a.mood)) return fail();
        actions.add(a.id);
      }
      if (!v.actions.some((a:{complete:boolean})=>a.complete)) return fail();
    }
  }
  return data as Episode[];
}
export const episodes = validateScenarios(raw);
export class ScenarioEngine {
  constructor(public variation = new VariationEngine()) {}
  start(episode: Episode, history: string[]): Session {
    return {id:crypto.randomUUID(),episode,variation:this.variation.situation(episode.variations,history),repeatCount:history.length+1};
  }
}

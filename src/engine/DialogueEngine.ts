import type { Choice, Session } from './types';
import { VariationEngine } from './VariationEngine';
export type Phase = 'observe' | 'choose' | 'response' | 'complete';
export class DialogueEngine {
  phase: Phase = 'observe';
  private ending = false;
  constructor(public session: Session, private variation: VariationEngine) {}
  reveal() { if(this.phase==='observe') this.phase='choose'; }
  select(choice: Choice) {
    if(this.phase!=='choose') throw new Error('지금은 선택할 차례가 아니에요.');
    const action = this.session.variation.actions.find(a=>a.id===choice.id);
    if(!action) throw new Error('이 이야기에서 사용할 수 없는 행동이에요.');
    this.phase='response'; this.ending=action.complete;
    return {text:this.variation.line(`${this.session.episode.id}:${this.session.variation.id}:${action.id}:result`,action.result),mood:action.mood};
  }
  next() { if(this.phase==='response') this.phase=this.ending?'complete':'observe'; return this.phase; }
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { VariationEngine, seededRandom } from '../src/engine/VariationEngine';
import { episodes, ScenarioEngine, validateScenarios } from '../src/engine/ScenarioEngine';
import { DialogueEngine } from '../src/engine/DialogueEngine';
import {
  defaults,
  loadSettings,
  saveSettings,
  ProgressStorage,
} from '../src/engine/ProgressStorage';
import { BrowserSpeechProvider } from '../src/engine/SpeechProvider';
afterEach(() => vi.unstubAllGlobals());
describe('상황과 선택지 변형', () => {
  it('같은 시드는 같은 결과를 만들어요', () => {
    const a = new VariationEngine(seededRandom(42));
    const b = new VariationEngine(seededRandom(42));
    for (let i = 0; i < 40; i++) expect(a.shuffle([1, 2, 3, 4])).toEqual(b.shuffle([1, 2, 3, 4]));
  });
  it('선택 위치가 고정되지 않고 권장 선택의 위치가 균형을 이루어요', () => {
    const engine = new VariationEngine(seededRandom(921));
    const v = episodes[0].variations[0];
    const positions = [0, 0, 0, 0];
    const orders = new Set();
    for (let i = 0; i < 400; i++) {
      const choices = engine.choices(v.actions, 4, 'needs');
      positions[choices.findIndex((c) => c.complete)]++;
      orders.add(choices.map((c) => c.id).join(','));
    }
    expect(positions).toEqual([100, 100, 100, 100]);
    expect(orders.size).toBeGreaterThan(12);
  });
  it('최근과 다른 상황을 섞고 바로 같은 상황을 되풀이하지 않아요', () => {
    const engine = new VariationEngine(seededRandom(43));
    for (const episode of episodes) {
      const history: string[] = [];
      for (let i = 0; i < 100; i++) {
        const v = engine.situation(episode.variations, history);
        expect(v.id).not.toBe(history.at(-1));
        history.push(v.id);
      }
      expect(new Set(history).size).toBe(episode.variations.length);
    }
  });
  it('하나뿐인 상황은 논리 오류 없이 재사용해요', () => {
    const engine = new VariationEngine(seededRandom(1));
    const v = episodes[0].variations[0];
    expect(engine.situation([v], [v.id])).toEqual(v);
  });
  it('대사는 같은 의도 안에서 번갈아 사용해요', () => {
    const engine = new VariationEngine(seededRandom(7));
    const lines = ['같이 놀까?', '나랑 놀래?'];
    expect(engine.line('invite', lines)).not.toBe(engine.line('invite', lines));
  });
  it('모든 선택지 개수에서 표시 ID와 결과 연결 및 완료 경로를 보존해요', () => {
    const engine = new VariationEngine(seededRandom(7));
    for (const e of episodes)
      for (const v of e.variations)
        for (const count of [2, 3, 4])
          for (let i = 0; i < 20; i++) {
            const choices = engine.choices(v.actions, count, e.id);
            expect(choices).toHaveLength(count);
            expect(new Set(choices.map((c) => c.id)).size).toBe(count);
            expect(choices.some((c) => c.complete)).toBe(true);
            for (const c of choices) {
              const original = v.actions.find((a) => a.id === c.id)!;
              expect(c.result).toEqual(original.result);
              expect(original.lines).toContain(c.label);
            }
          }
  });
});
describe('검증된 이야기와 대화', () => {
  it('14가지 상황은 장소 및 대사 규칙을 만족해요', () => {
    expect(validateScenarios(episodes)).toEqual(episodes);
    expect(episodes.flatMap((e) => e.variations)).toHaveLength(14);
    expect(episodes.filter((e) => e.character === 'jini').every((e) => e.place === 'home')).toBe(
      true,
    );
  });
  it.each([null, [], [{}]])('잘못된 데이터 %j를 거부해요', (data) =>
    expect(() => validateScenarios(data)).toThrow('이야기 자료'),
  );
  it('중복 ID, 완료 경로 없음, 잘못된 대사를 거부해요', () => {
    for (const change of [
      (d: typeof episodes) => {
        d[0].variations[0].actions[1].id = 'ask';
      },
      (d: typeof episodes) => {
        d[0].variations[0].actions.forEach((a) => (a.complete = false));
      },
      (d: typeof episodes) => {
        d[0].variations[0].lines = [];
      },
      (d: typeof episodes) => {
        d[0].place = 'school';
      },
    ]) {
      const broken = structuredClone(episodes);
      change(broken);
      expect(() => validateScenarios(broken)).toThrow();
    }
  });
  it('모든 상황의 모든 행동이 자기 결과로 연결돼요', () => {
    const engine = new ScenarioEngine(new VariationEngine(seededRandom(99)));
    for (const e of episodes)
      for (const v of e.variations)
        for (const action of v.actions) {
          const session = { ...engine.start(e, []), variation: v };
          const dialogue = new DialogueEngine(session, engine.variation);
          expect(() => dialogue.select({ ...action, label: action.lines[0] })).toThrow();
          dialogue.reveal();
          const result = dialogue.select({ ...action, label: action.lines[0] });
          expect(action.result).toContain(result.text);
          expect(dialogue.next()).toBe(action.complete ? 'complete' : 'observe');
        }
  });
  it('친구 놀이에는 여러 적절한 마무리가 있어요', () => {
    for (const v of episodes[2].variations)
      expect(v.actions.filter((a) => a.complete).length).toBeGreaterThanOrEqual(2);
  });
  it('도움 거절은 실패가 아니라 다른 행동으로 이어져요', () => {
    const e = episodes[3];
    const v = e.variations.find((v) => v.id === 'rest')!;
    const help = v.actions.find((a) => a.id === 'help')!;
    const session = { id: 'test', episode: e, variation: v, repeatCount: 1 };
    const dialogue = new DialogueEngine(session, new VariationEngine(seededRandom(1)));
    dialogue.reveal();
    expect(dialogue.select({ ...help, label: help.lines[0] }).text).toContain('혼자 쉬고');
    expect(dialogue.next()).toBe('observe');
    dialogue.reveal();
    const respect = v.actions.find((a) => a.id === 'respect')!;
    dialogue.select({ ...respect, label: respect.lines[0] });
    expect(dialogue.next()).toBe('complete');
  });
});
describe('저장과 음성 실패', () => {
  it('설정을 저장하면 새로 불러올 때 유지돼요', () => {
    const values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => values.get(k),
      setItem: (k: string, v: string) => values.set(k, v),
    });
    const settings = { ...defaults, wait: 8 as const, voice: false, choices: 2 as const };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
    values.set('jiyul-settings', '손상');
    expect(loadSettings()).toEqual(defaults);
  });
  it('IndexedDB 기록과 상황 이력이 다른 인스턴스에도 남아요', async () => {
    const db = new ProgressStorage();
    const id = crypto.randomUUID();
    await db.visit(id, 'test-episode', 'test-variant');
    await db.add({
      id,
      date: new Date().toISOString(),
      sessionId: id,
      episodeId: 'test-episode',
      variationId: 'test-variant',
      actionId: 'help',
      intent: 'offer_help',
      order: ['ask', 'help'],
      responseMs: 850,
      hintUsed: true,
      spoken: true,
      repeatCount: 2,
      completed: true,
    });
    const reopened = new ProgressStorage();
    expect(await reopened.history('test-episode')).toEqual(['test-variant']);
    expect((await reopened.recent()).find((r) => r.id === id)).toMatchObject({
      spoken: true,
      order: ['ask', 'help'],
      responseMs: 850,
    });
  });
  it('기기 음성이 없거나 예외가 발생해도 실패 값만 반환해요', async () => {
    vi.stubGlobal('speechSynthesis', { getVoices: () => [], cancel: () => {} });
    expect(await new BrowserSpeechProvider().speak('안녕', 1)).toBe(false);
    vi.stubGlobal('speechSynthesis', {
      cancel: () => {},
      getVoices: () => {
        throw new Error('음성 없음');
      },
    });
    expect(await new BrowserSpeechProvider().speak('안녕', 1)).toBe(false);
  });
});

it('보안 연결이 아닌 개발 환경에서도 서로 다른 기록 ID를 만들어요', async () => {
  const { createId } = await import('../src/engine/createId');
  vi.stubGlobal('crypto', {});
  const ids = Array.from({ length: 50 }, createId);
  expect(new Set(ids).size).toBe(50);
});

it('음성 중지 API가 예외를 내도 놀이 호출을 중단하지 않아요', async () => {
  vi.stubGlobal('speechSynthesis', {
    cancel: () => {
      throw new Error('기기 오류');
    },
    getVoices: () => [],
  });
  const provider = new BrowserSpeechProvider();
  expect(() => provider.stop()).not.toThrow();
  expect(await provider.speak('같이 놀자', 1)).toBe(false);
});

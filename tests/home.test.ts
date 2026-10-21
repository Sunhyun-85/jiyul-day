import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  CharacterStateEngine,
  desireFor,
  meetsCurrentNeed,
} from '../src/engine/CharacterStateEngine';
import { VariationEngine, seededRandom } from '../src/engine/VariationEngine';
import home from '../src/data/home.json';
import { FileSpeechProvider } from '../src/engine/SpeechProvider';
import { art } from '../src/game/home/art';
// @ts-expect-error Node tooling is intentionally standalone JavaScript.
import { extractDialogue, dialogueId } from '../scripts/audio/catalog.mjs';
// @ts-expect-error Node tooling is intentionally standalone JavaScript.
import { validAudioHeader } from '../scripts/audio/build.mjs';
import episodes from '../src/data/episodes.json';
afterEach(() => vi.unstubAllGlobals());
describe('지니 상태의 관찰 가능한 원인과 결과', () => {
  it('같은 당근 행동에 상태에 맞게 반응해요', () => {
    expect(home.situations.map((s) => new CharacterStateEngine(s).reaction('carrot'))).toEqual([
      'fetch',
      'seek_food',
      'seek_water',
      'rest',
    ]);
  });
  it('완료 전에는 상태가 바뀌지 않고 밥·물·휴식이 각각 욕구를 해소해요', () => {
    for (const [index, action, value] of [
      [1, 'eat', 'hunger'],
      [2, 'drink', 'thirst'],
      [3, 'rest', 'energy'],
    ] as const) {
      const e = new CharacterStateEngine(home.situations[index]);
      const before = { ...e.state };
      e.reaction('carrot');
      expect(e.state).toEqual(before);
      e.finish(action);
      expect(e.state.desire).toBe('play');
      expect(e.state[value]).not.toBe(before[value]);
    }
  });
  it('놀이가 거듭되면 예측 가능한 피로·갈증이 생기며 수치는 범위를 벗어나지 않아요', () => {
    const e = new CharacterStateEngine(home.situations[0]);
    for (let i = 0; i < 6; i++) e.finish('fetch');
    expect(e.state.desire).toBe('water');
    for (let i = 0; i < 50; i++) e.finish('fetch');
    expect(e.state.energy).toBe(0);
    expect(e.state.thirst).toBe(100);
    for (let i = 0; i < 50; i++) {
      e.finish('eat');
      e.finish('drink');
      e.finish('rest');
    }
    expect(e.state).toMatchObject({ hunger: 0, thirst: 0, energy: 100, desire: 'play' });
  });
  it('심한 피로를 먼저 쉬고, 그다음 실제 남은 요구를 보여줘요', () => {
    const e = new CharacterStateEngine({ hunger: 80, thirst: 90, energy: 10 });
    expect(e.state.desire).toBe('rest');
    e.finish('rest');
    expect(e.state.desire).toBe('water');
    e.finish('drink');
    expect(e.state.desire).toBe('food');
    expect(desireFor({ hunger: 64, thirst: 64, energy: 26 })).toBe('play');
  });
  it('기존 VariationEngine으로 직전 상황 반복을 피하고 위치와 대사를 바꿔요', () => {
    const e = new VariationEngine(seededRandom(53)),
      history: string[] = [];
    const positions = new Set();
    for (let i = 0; i < 30; i++) {
      const s = e.situation(home.situations, history);
      expect(s.id).not.toBe(history.at(-1));
      history.push(s.id);
      positions.add(e.shuffle([1, 2, 3, 4]).join());
    }
    expect(new Set(history).size).toBe(4);
    expect(positions.size).toBeGreaterThan(10);
  });
  it('지니의 털과 귀는 별도 원본 에셋이며 네 발 리그용 파츠를 제공해요', () => {
    expect(art.dogHead).toContain('#a5754f');
    expect(art.dogHead).toContain('#fffdf6');
    expect(art.dogBody).not.toContain('#a5754f');
    expect(art.dogPaw).toContain('#fffdf6');
    expect(art.carrot).toContain('#ef9952');
  });
});
describe('녹음 파일 기반 음성', () => {
  it('안정적인 ID, 화자별 경로와 모든 자유놀이 대사를 추출해요', () => {
    const rows = extractDialogue(episodes, home);
    expect(new Set(rows.map((r: any) => r.dialogue_id)).size).toBe(rows.length);
    expect(dialogueId('narrator', '안녕')).toBe(dialogueId('narrator', '안녕'));
    expect(dialogueId('hauri', '안녕')).not.toBe(dialogueId('narrator', '안녕'));
    for (const line of Object.values(home.dialogue).flat())
      expect(rows.some((r: any) => r.text === line && r.character_id === 'narrator')).toBe(true);
    expect(
      rows
        .filter((r: any) => r.character_id === 'jini')
        .every((r: any) => ['멍!', '낑…', '하암…'].includes(r.text)),
    ).toBe(true);
  });
  it('누락된 녹음은 TTS와 네트워크 재생을 시도하지 않아요', async () => {
    const tts = vi.fn(),
      audio = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak: tts });
    vi.stubGlobal('Audio', audio);
    expect(await new FileSpeechProvider().speak('녹음이 없는 대사', 1)).toBe(false);
    expect(tts).not.toHaveBeenCalled();
    expect(audio).not.toHaveBeenCalled();
  });
  it('같은 사이트의 파일 재생 종료·오류·중지를 처리해요', async () => {
    vi.stubGlobal('location', { href: 'https://game.test/', origin: 'https://game.test' });
    const instances: any[] = [];
    class FakeAudio {
      onended: any;
      onerror: any;
      playbackRate = 1;
      pause = vi.fn();
      play = vi.fn(async () => {});
      constructor(public src: string) {
        instances.push(this);
      }
    }
    vi.stubGlobal('Audio', FakeAudio);
    const p = new FileSpeechProvider();
    const ended = p.speak('녹음', 1, '/audio/narrator/recording.mp3');
    instances[0].onended();
    expect(await ended).toBe(true);
    const failed = p.speak('녹음', 1, '/audio/narrator/missing.mp3');
    instances[1].onerror();
    expect(await failed).toBe(false);
    const stopped = p.speak('녹음', 1, '/audio/narrator/recording.mp3');
    p.stop();
    expect(await stopped).toBe(false);
    expect(await p.speak('외부', 1, 'https://other.test/audio/a.mp3')).toBe(false);
  });
  it('가짜 확장자나 너무 작은 음성 파일을 거부해요', () => {
    expect(validAudioHeader(Buffer.from('<html>not audio</html>'), 'mp3')).toBe(false);
    const wav = Buffer.alloc(60);
    wav.write('RIFF');
    wav.write('WAVE', 8);
    expect(validAudioHeader(wav, 'wav')).toBe(true);
    expect(validAudioHeader(wav, 'mp3')).toBe(false);
  });
});

it('초록 동그라미는 현재 욕구에 맞는 행동에만 표시해요', () => {
  const actions = ['carrot', 'food', 'water', 'bed', 'pet'] as const;
  home.situations.forEach((s, index) => {
    const before = new CharacterStateEngine(s).state;
    expect(actions.map((a) => meetsCurrentNeed(a, before))).toEqual(
      actions.map((_a, i) => i === index),
    );
  });
});
it('친구는 우리로 부르되 기존 캐릭터와 에피소드 ID는 유지해요', () => {
  expect(JSON.stringify(episodes)).not.toContain('하우리');
  expect(episodes.find((e) => e.id === 'hauri-blocks')?.title).toBe('우리와 블록 놀이');
  expect(
    episodes.find((e) => e.id === 'hauri-feelings')?.character ??
      episodes.find((e) => e.title === '우리가 속상해요')?.character,
  ).toBe('hauri');
});

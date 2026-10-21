import type { Action, Choice } from './types';
export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class VariationEngine {
  private lastLines = new Map<string, string>();
  private positions = new Map<string, number[]>();
  constructor(private random: () => number = Math.random) {}
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  situation<T extends { id: string }>(items: T[], history: string[]): T {
    const fresh = items.filter((v) => !history.slice(-3).includes(v.id));
    const familiar = items.filter((v) => v.id !== history.at(-1));
    const pool = fresh.length && this.random() < 0.65 ? fresh : familiar.length ? familiar : items;
    return pool[Math.floor(this.random() * pool.length)];
  }
  line(key: string, lines: string[]): string {
    const pool = lines.filter((line) => line !== this.lastLines.get(key));
    const line = (pool.length ? pool : lines)[
      Math.floor(this.random() * (pool.length || lines.length))
    ];
    this.lastLines.set(key, line);
    return line;
  }
  choices(actions: Action[], count: number, key: string): Choice[] {
    // 작은 선택지 모드에서도 마무리할 수 있는 행동을 반드시 포함해요.
    const endings = this.shuffle(actions.filter((a) => a.complete));
    const chosen = [
      endings[0],
      ...this.shuffle(actions.filter((a) => a.id !== endings[0].id)).slice(0, count - 1),
    ];
    let ordered = this.shuffle(chosen);
    // 의미별 표시 위치의 누적 편중을 완화하되, 나머지 순서는 셔플을 유지해요.
    const statsKey = `${key}:${count}`;
    const counts = this.positions.get(statsKey) ?? Array(count).fill(0);
    const minimum = Math.min(...counts);
    const positions = counts.map((n, i) => (n === minimum ? i : -1)).filter((i) => i >= 0);
    const position = positions[Math.floor(this.random() * positions.length)];
    const index = ordered.findIndex((a) => a.id === endings[0].id);
    [ordered[index], ordered[position]] = [ordered[position], ordered[index]];
    counts[position]++;
    this.positions.set(statsKey, counts);
    return ordered.map((a) => ({ ...a, label: this.line(`${key}:${a.intent}:${a.id}`, a.lines) }));
  }
}

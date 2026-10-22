import { describe, it, expect } from 'vitest';
import {
  BlockMatch,
  RpsMatch,
  judgeHand,
  stableTower,
  HANDS,
  type TowerBlock,
} from '../src/engine/SchoolPlayEngine';
describe('친구와 가위바위보', () => {
  it('모든 손 조합과 무승부를 판정해요', () => {
    const expected = [
      ['draw', 'woori', 'jiyul'],
      ['jiyul', 'draw', 'woori'],
      ['woori', 'jiyul', 'draw'],
    ];
    HANDS.forEach((a, i) => HANDS.forEach((b, j) => expect(judgeHand(a, b)).toBe(expected[i][j])));
  });
  it('비긴 판을 빼고 최대 5판, 3승으로 끝나며 추가 입력을 무시해요', () => {
    const match = new RpsMatch(() => 0);
    expect(match.play('scissors')?.result).toBe('draw');
    for (const hand of ['rock', 'paper', 'rock', 'paper', 'rock'] as const) match.play(hand);
    expect(match.scores).toEqual({ jiyul: 3, woori: 2 });
    expect(match.winner).toBe('jiyul');
    expect(match.play('paper')).toBeNull();
    expect(match.rounds).toHaveLength(6);
  });
  it('우리가 먼저 고른 손을 아이 선택 후에 바꾸지 않아요', () => {
    let random = 0;
    const match = new RpsMatch(() => random);
    random = 0.99;
    expect(match.play('rock')?.friend).toBe('scissors');
    expect(match.play('scissors')?.friend).toBe('paper');
  });
  it('우리도 3승하면 끝나요', () => {
    const match = new RpsMatch(() => 0);
    for (let i = 0; i < 3; i++) match.play('paper');
    expect(match.winner).toBe('woori');
  });
});
describe('무지개 블록 균형과 차례', () => {
  it('각 경계의 무게중심을 검사해요. 겹치기만 해도 안전한 것은 아니에요', () => {
    const tower = (xs: number[]): TowerBlock[] => xs.map((x) => ({ x, color: 0, player: 'jiyul' }));
    expect(stableTower(tower([360, 360, 360]))).toBe(true);
    expect(stableTower(tower([360, 400, 440]))).toBe(false);
    expect(stableTower(tower([430]))).toBe(false);
    expect(stableTower(tower([360, 375, 355, 365]))).toBe(true);
  });
  it('다른 색과 잘못된 차례에는 블록을 놓지 않아요', () => {
    const match = new BlockMatch(() => 0.5);
    expect(match.place('woori', match.requested, 360)).toBe(false);
    expect(match.place('jiyul', (match.requested + 1) % 7, 360)).toBe(false);
    expect(match.blocks).toHaveLength(0);
    expect(match.place('jiyul', match.requested, 360)).toBe(true);
    expect(match.turn).toBe('woori');
    expect(match.requestForFriend(4)).toBe(true);
    expect(match.place('woori', 4, 360)).toBe(true);
    expect(match.turn).toBe('jiyul');
  });
  it('일곱 색을 고루 요청하며 넘어뜨린 쪽만 패배해요', () => {
    const match = new BlockMatch(() => 0.5);
    const colors = new Set<number>();
    for (let i = 0; i < 7; i++) {
      colors.add(match.requested);
      match.place('jiyul', match.requested, 360);
      match.requestForFriend(0);
      match.place('woori', 0, 360);
    }
    expect(colors.size).toBe(7);
    match.place('jiyul', match.requested, 510);
    expect(match.loser).toBe('jiyul');
    expect(match.place('woori', match.requested, 360)).toBe(false);
    const other = new BlockMatch();
    other.place('jiyul', other.requested, 360);
    other.place('woori', other.requested, 510);
    expect(other.loser).toBe('woori');
  });
});

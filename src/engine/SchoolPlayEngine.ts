export const HANDS = ['scissors', 'rock', 'paper'] as const;
export type Hand = (typeof HANDS)[number];
export type Player = 'jiyul' | 'woori';
export const COLORS = [
  { id: 'red', name: '빨강', hex: '#e96565' },
  { id: 'orange', name: '주황', hex: '#f4a34e' },
  { id: 'yellow', name: '노랑', hex: '#f6d65c' },
  { id: 'green', name: '초록', hex: '#76b98a' },
  { id: 'blue', name: '파랑', hex: '#63a8df' },
  { id: 'indigo', name: '남색', hex: '#5666a7' },
  { id: 'purple', name: '보라', hex: '#ac85ce' },
] as const;
export function judgeHand(a: Hand, b: Hand): Player | 'draw' {
  if (a === b) return 'draw';
  return (a === 'scissors' && b === 'paper') ||
    (a === 'rock' && b === 'scissors') ||
    (a === 'paper' && b === 'rock')
    ? 'jiyul'
    : 'woori';
}
export class RpsMatch {
  scores = { jiyul: 0, woori: 0 };
  rounds: (Player | 'draw')[] = [];
  winner: Player | null = null;
  private committed: Hand;
  constructor(private random = Math.random) {
    this.committed = this.choose();
  }
  private choose(): Hand {
    return HANDS[Math.min(2, Math.floor(this.random() * 3))];
  }
  play(hand: Hand) {
    if (this.winner) return null;
    // Our friend's move is committed before seeing the child's choice.
    const friend = this.committed;
    const result = judgeHand(hand, friend);
    this.rounds.push(result);
    if (result !== 'draw') {
      this.scores[result]++;
      if (this.scores[result] === 3) this.winner = result;
    }
    this.committed = this.choose();
    return { hand, friend, result };
  }
}
export interface TowerBlock {
  x: number;
  color: number;
  player: Player;
}
export const BLOCK_WIDTH = 116;
/** Equal-mass blocks: every supported sub-stack's centre of mass must lie inside
 * its contact patch. A drifting upper stack can topple even with local overlap. */
export function stableTower(blocks: TowerBlock[]): boolean {
  for (let i = 0; i < blocks.length; i++) {
    const support = i ? blocks[i - 1].x : 360;
    const left = Math.max(support, blocks[i].x) - BLOCK_WIDTH / 2;
    const right = Math.min(support, blocks[i].x) + BLOCK_WIDTH / 2;
    const above = blocks.slice(i);
    const center = above.reduce((sum, block) => sum + block.x, 0) / above.length;
    if (left >= right || center < left + 2 || center > right - 2) return false;
  }
  return true;
}
export class BlockMatch {
  blocks: TowerBlock[] = [];
  turn: Player = 'jiyul';
  loser: Player | null = null;
  requested = 0;
  private bag: number[] = [];
  constructor(private random = Math.random) {
    this.nextColor();
  }
  private nextColor() {
    if (!this.bag.length) {
      this.bag = COLORS.map((_, i) => i);
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    this.requested = this.bag.pop()!;
  }
  place(player: Player, color: number, x: number) {
    if (this.loser || player !== this.turn || color !== this.requested || !Number.isFinite(x))
      return false;
    this.blocks.push({ x: Math.max(210, Math.min(510, x)), color, player });
    if (!stableTower(this.blocks)) this.loser = player;
    else {
      this.turn = player === 'jiyul' ? 'woori' : 'jiyul';
      if (this.turn === 'jiyul') this.nextColor();
    }
    return true;
  }
  requestForFriend(color: number) {
    if (this.turn !== 'woori' || this.loser || !COLORS[color]) return false;
    this.requested = color;
    return true;
  }
  friendPosition() {
    // Intentional visible placement; the same balance rules apply to both players.
    const previous = this.blocks.at(-1)?.x ?? 360;
    return previous + (this.random() - 0.5) * 100;
  }
}

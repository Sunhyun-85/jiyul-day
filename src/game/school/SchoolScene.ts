import Phaser from 'phaser';
import { characterSvg, svgUrl } from '../art';
import { playRoomSvg } from '../playArt';
import { blockSvg, handSvg } from './art';
import {
  BlockMatch,
  COLORS,
  HANDS,
  RpsMatch,
  type Hand,
  type Player,
} from '../../engine/SchoolPlayEngine';
export type SchoolPhase =
  | 'intro'
  | 'menu'
  | 'rps-pick'
  | 'rps-reveal'
  | 'block-color'
  | 'block-place'
  | 'friend-color'
  | 'friend-place'
  | 'falling'
  | 'result';
export interface SchoolSnapshot {
  phase: SchoolPhase;
  line: string;
  mode: 'rps' | 'blocks' | null;
  scores: { jiyul: number; woori: number };
  round: number;
  hands: { jiyul: Hand; woori: Hand } | null;
  requested: number;
  blocks: number;
  loser: Player | null;
  winner: Player | null;
  target: { x: number; y: number };
  selected: boolean;
}
export interface SchoolEvent {
  mode: 'rps' | 'blocks';
  winner: Player;
  count: number;
}
export class SchoolScene extends Phaser.Scene {
  private boy!: Phaser.GameObjects.Image;
  private friend!: Phaser.GameObjects.Image;
  private tower: Phaser.GameObjects.Image[] = [];
  private held?: Phaser.GameObjects.Image;
  private guide!: Phaser.GameObjects.Rectangle;
  private handImages: Phaser.GameObjects.Image[] = [];
  private rps = new RpsMatch();
  private blocks = new BlockMatch();
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private ready = false;
  private state: SchoolSnapshot = {
    phase: 'intro',
    line: '',
    mode: null,
    scores: { jiyul: 0, woori: 0 },
    round: 1,
    hands: null,
    requested: 0,
    blocks: 0,
    loser: null,
    winner: null,
    target: { x: 360, y: 700 },
    selected: false,
  };
  constructor(
    private hooks: {
      snapshot: (s: SchoolSnapshot) => void;
      line: (text: string) => void | Promise<void>;
      sound: (name: 'tap' | 'drop' | 'happy') => void;
      finish: (e: SchoolEvent) => void;
      ready: () => void;
    },
  ) {
    super('school-play');
  }
  preload() {
    this.load.svg('school-room', svgUrl(playRoomSvg(true)));
    for (const who of ['jiyul', 'hauri'] as const)
      for (const mood of ['happy', 'thinking', 'surprised'] as const)
        this.load.svg(`${who}-${mood}`, svgUrl(characterSvg(who, mood)));
    for (const hand of HANDS) this.load.svg(hand, svgUrl(handSvg(hand)));
    COLORS.forEach((color, i) => this.load.svg(`block-${i}`, svgUrl(blockSvg(color.hex))));
  }
  create() {
    this.add.image(360, 500, 'school-room').setDisplaySize(720, 1000);
    this.add.ellipse(360, 710, 280, 50, 0x657c68, 0.15);
    this.guide = this.add
      .rectangle(360, 700, 116, 42, 0xffffff, 0.35)
      .setStrokeStyle(4, 0xffffff, 0.9)
      .setVisible(false)
      .setInteractive();
    this.guide.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state.phase === 'block-place') this.placeBlock(p.worldX);
    });
    this.boy = this.add.image(178, 680, 'jiyul-happy').setOrigin(0.5, 1).setDisplaySize(192, 240);
    this.friend = this.add
      .image(665, 610, 'hauri-happy')
      .setOrigin(0.5, 1)
      .setDisplaySize(176.64, 220.8);
    this.friend.setInteractive().on('pointerdown', () => this.hooks.line(this.state.line));
    this.input.on(
      'drag',
      (_: Phaser.Input.Pointer, object: Phaser.GameObjects.Image, x: number, y: number) => {
        if (object === this.held && this.state.phase === 'block-place')
          object.setPosition(Phaser.Math.Clamp(x, 210, 510), Phaser.Math.Clamp(y, 270, 820));
      },
    );
    this.input.on('dragend', (_: Phaser.Input.Pointer, object: Phaser.GameObjects.Image) => {
      if (object !== this.held || this.state.phase !== 'block-place') return;
      if (Math.abs(object.y - this.state.target.y) < 100) this.placeBlock(object.x);
      else this.tweens.add({ targets: object, x: 175, y: 755, duration: 220 });
    });
    this.input.on(
      'pointerdown',
      (p: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
        if (
          !objects.length &&
          this.state.phase === 'block-place' &&
          Math.abs(p.worldY - this.state.target.y) < 100
        )
          this.placeBlock(p.worldX);
      },
    );
    this.ready = true;
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.emit();
    this.hooks.ready();
    this.tweens.add({
      targets: this.friend,
      x: 480,
      y: 680,
      duration: this.reduced ? 200 : 1700,
      ease: 'Sine.easeInOut',
      onComplete: () => this.menu(),
    });
    if (!this.reduced)
      this.tweens.add({
        targets: this.friend,
        angle: { from: -3, to: 3 },
        duration: 170,
        yoyo: true,
        repeat: 4,
        onComplete: () => this.friend.setAngle(0),
      });
  }
  private layout() {
    this.cameras.main
      .setOrigin(0, 0)
      .setZoom(1, this.scale.height / 1000)
      .setScroll(0, 0);
    const ratio = 1000 / this.scale.height;
    // Portrait positions fill the screen; artwork retains its proportions.
    this.boy.setDisplaySize(192, 240 * ratio);
    this.friend.setDisplaySize(176.64, 220.8 * ratio);
    this.renderTower();
    this.handImages.forEach((image) => image.setDisplaySize(145, 145 * ratio));
  }
  setPaused(paused: boolean) {
    if (!this.ready) return;
    if (paused) this.scene.pause();
    else this.scene.resume();
  }
  private emit() {
    this.hooks.snapshot({
      ...this.state,
      scores: { ...this.state.scores },
      target: { ...this.state.target },
    });
  }
  private line(text: string) {
    this.state.line = text;
    const playback = this.hooks.line(text);
    this.emit();
    return Promise.resolve(playback);
  }
  menu() {
    if (!this.ready) return;
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.held?.destroy();
    this.held = undefined;
    this.tower.forEach((b) => b.destroy());
    this.tower = [];
    this.handImages.forEach((h) => h.destroy());
    this.handImages = [];
    this.guide.setVisible(false);
    this.boy.setTexture('jiyul-happy');
    this.friend.setTexture('hauri-happy').setPosition(480, 680).setAngle(0);
    this.state = {
      ...this.state,
      phase: 'menu',
      mode: null,
      selected: false,
      hands: null,
      winner: null,
      loser: null,
      blocks: 0,
    };
    this.line('지율아, 같이 놀자! 어떤 놀이 할까?');
  }
  start(mode: 'rps' | 'blocks') {
    if (this.state.phase !== 'menu') return;
    this.state.mode = mode;
    if (mode === 'rps') {
      this.rps = new RpsMatch();
      this.nextRound();
    } else {
      this.blocks = new BlockMatch();
      this.askBlock();
    }
  }
  nextRound() {
    if (this.rps.winner) return;
    this.handImages.forEach((h) => h.destroy());
    this.handImages = [];
    this.state = {
      ...this.state,
      phase: 'rps-pick',
      hands: null,
      scores: { ...this.rps.scores },
      round: this.rps.scores.jiyul + this.rps.scores.woori + 1,
    };
    this.line('같이 내자! 가위, 바위, 보!');
  }
  playHand(hand: Hand) {
    if (this.state.phase !== 'rps-pick') return;
    const result = this.rps.play(hand);
    if (!result) return;
    this.state.phase = 'rps-reveal';
    this.state.hands = { jiyul: hand, woori: result.friend };
    const ratio = 1000 / this.scale.height;
    this.handImages = [this.add.image(220, 740, hand), this.add.image(500, 740, result.friend)];
    this.handImages.forEach((h) => {
      h.setDisplaySize(145, 145 * ratio).setDepth(5);
      if (!this.reduced) this.tweens.add({ targets: h, y: 715, duration: 200, yoyo: true });
    });
    this.state.scores = { ...this.rps.scores };
    this.state.winner = this.rps.winner;
    this.hooks.sound(result.result === 'draw' ? 'tap' : 'happy');
    let speechDone = false;
    const playback = this.line(
      this.rps.winner
        ? this.rps.winner === 'jiyul'
          ? '지율이가 3승! 같이 놀아서 즐거웠어!'
          : '우리가 3승! 같이 놀아서 즐거웠어!'
        : result.result === 'draw'
          ? '똑같네! 한 번 더 하자.'
          : result.result === 'jiyul'
            ? '지율이가 이겼네! 멋지다!'
            : '이번에는 내가 이겼네! 또 해 보자.',
    );
    void playback.then(
      () => {
        speechDone = true;
      },
      () => {
        speechDone = true;
      },
    );
    if (this.rps.winner) {
      this.hooks.finish({ mode: 'rps', winner: this.rps.winner, count: this.rps.rounds.length });
    } else {
      const match = this.rps;
      const round = match.rounds.length;
      const advance = () => {
        if (
          this.rps !== match ||
          match.rounds.length !== round ||
          this.state.phase !== 'rps-reveal' ||
          this.state.winner
        )
          return;
        if (speechDone) this.nextRound();
        else this.time.delayedCall(150, advance);
      };
      this.time.delayedCall(3800, advance);
    }
  }
  private askBlock() {
    this.state.phase = 'block-color';
    this.state.requested = this.blocks.requested;
    this.state.selected = false;
    this.state.blocks = this.blocks.blocks.length;
    this.renderTower();
    this.line(`${COLORS[this.blocks.requested].name} 블록을 올려 줄래?`);
  }
  chooseColor(color: number) {
    if (this.state.phase === 'friend-color') {
      if (!this.blocks.requestForFriend(color)) return;
      this.state.phase = 'friend-place';
      this.state.requested = color;
      this.line(`${COLORS[color].name}! 좋아, 내가 올려 볼게.`);
      const x = Phaser.Math.Clamp(this.blocks.friendPosition(), 210, 510);
      this.held = this.add
        .image(505, 705, `block-${color}`)
        .setDepth(50)
        .setDisplaySize(116, (44 * 1000) / this.scale.height);
      this.tweens.add({
        targets: this.held,
        x,
        y: this.state.target.y,
        duration: this.reduced ? 300 : 1100,
        ease: 'Sine.easeInOut',
        onComplete: () => this.commitBlock('woori', x),
      });
      return;
    }
    if (this.state.phase !== 'block-color') return;
    if (color !== this.blocks.requested) {
      const name = COLORS[this.blocks.requested].name;
      this.line(`나는 ${name}${name === '보라' ? '가' : '이'} 좋아. 이 색을 찾아 줄래?`);
      return;
    }
    this.state.phase = 'block-place';
    this.state.selected = true;
    this.held = this.add
      .image(175, 755, `block-${color}`)
      .setDisplaySize(116, (44 * 1000) / this.scale.height)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });
    this.input.setDraggable(this.held);
    this.line('고마워! 탑 위에 살살 올려 줘.');
  }
  placeBlock(x: number) {
    if (this.state.phase !== 'block-place') return;
    this.state.phase = 'friend-place';
    this.state.selected = false;
    this.emit();
    this.tweens.add({
      targets: this.held,
      x: Phaser.Math.Clamp(x, 210, 510),
      y: this.state.target.y,
      duration: this.reduced ? 100 : 350,
      onComplete: () => this.commitBlock('jiyul', x),
    });
  }
  private commitBlock(player: Player, x: number) {
    if (!this.blocks.place(player, this.blocks.requested, x)) return;
    this.held?.destroy();
    this.held = undefined;
    this.state.blocks = this.blocks.blocks.length;
    this.renderTower();
    this.hooks.sound('drop');
    if (this.blocks.loser) {
      this.state.loser = this.blocks.loser;
      this.state.winner = this.blocks.loser === 'jiyul' ? 'woori' : 'jiyul';
      this.state.phase = 'falling';
      this.guide.setVisible(false);
      this.friend.setTexture('hauri-surprised');
      const direction = x < 360 ? -1 : 1;
      this.tower.forEach((block, index) =>
        this.tweens.add({
          targets: block,
          x: block.x + direction * (35 + index * 8),
          y: 715 - (index % 3) * 12,
          angle: this.reduced ? 0 : direction * (25 + index * 11),
          duration: this.reduced ? 200 : 850,
          delay: this.reduced ? 0 : index * 25,
          ease: 'Bounce.easeOut',
        }),
      );
      this.line(
        player === 'jiyul'
          ? '앗, 지율이가 놓다가 넘어졌네. 이번엔 우리가 이겼어.'
          : '앗, 내가 놓다가 넘어졌네. 지율이가 이겼어!',
      );
      this.time.delayedCall(this.reduced ? 400 : 1400, () => {
        this.state.phase = 'result';
        this.friend.setTexture('hauri-happy');
        this.line('괜찮아! 우리 다시 같이 쌓자.');
        this.hooks.finish({
          mode: 'blocks',
          winner: this.state.winner!,
          count: this.blocks.blocks.length,
        });
      });
    } else if (player === 'jiyul') {
      this.state.phase = 'friend-color';
      this.state.selected = false;
      this.line('이번엔 내 차례! 무슨 색을 올릴까?');
    } else {
      this.askBlock();
    }
  }
  private renderTower() {
    if (!this.ready) return;
    this.tower.forEach((b) => b.destroy());
    this.tower = [];
    const ratio = 1000 / this.scale.height;
    const step = Math.min(36 * ratio, 330 / Math.max(1, this.blocks.blocks.length + 1));
    if (this.state.mode === 'blocks')
      this.blocks.blocks.forEach((b, i) => {
        this.tower.push(
          this.add
            .image(b.x, 700 - i * step, `block-${b.color}`)
            .setDisplaySize(116, step * 1.2)
            .setDepth(10 + i),
        );
      });
    this.state.target = {
      x: this.blocks.blocks.at(-1)?.x ?? 360,
      y: 700 - this.blocks.blocks.length * step,
    };
    this.guide
      .setPosition(this.state.target.x, this.state.target.y)
      .setDisplaySize(116, step * 1.2)
      .setVisible(this.state.mode === 'blocks' && !this.state.loser)
      .setDepth(9);
    this.emit();
  }
}

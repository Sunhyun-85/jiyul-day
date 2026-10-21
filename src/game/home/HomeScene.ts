import Phaser from 'phaser';
import { homeAssets, homeBackground } from './assets';
import { svgUrl } from '../art';
import { playRoomSvg } from '../playArt';
import { DogActor, HumanActor, type DogAnimation } from './Actors';
import {
  CharacterStateEngine,
  meetsCurrentNeed,
  type CharacterState,
  type DogBehavior,
  type HomeAction,
} from '../../engine/CharacterStateEngine';
import { VariationEngine } from '../../engine/VariationEngine';
import homeData from '../../data/home.json';
export const HOME_W = 720,
  HOME_H = 1000;
export type Item = 'carrot' | 'food' | 'bottle';
export interface HomeStart {
  id: string;
  variationId: string;
  initial: CharacterState;
  carrot: { x: number; y: number };
  dog: { x: number; y: number };
  repeatCount: number;
}
export interface HomeSnapshot {
  ready: boolean;
  viewport: { height: number; offset: number };
  state: CharacterState;
  behavior: string;
  animation: DogAnimation;
  selected: string | null;
  owner: 'floor' | 'jini' | 'jiyul';
  positiveFeedback: boolean;
  foodFilled: boolean;
  waterFilled: boolean;
  objects: Record<string, { x: number; y: number }>;
}
export interface HomeEvent {
  action: string;
  input: 'tap' | 'drag';
  before: CharacterState;
  after: CharacterState;
  outcome: string;
}
export interface HomeCallbacks {
  ready: () => void;
  dogSound: (sound: 'bark' | 'yawn') => void;
  snapshot: (s: HomeSnapshot) => void;
  line: (text: string) => void;
  event: (event: HomeEvent) => void;
  sound: (name: 'tap' | 'drop' | 'happy') => void;
}
const floor = (x: number, y: number) => ({
  x: Phaser.Math.Clamp(x, 65, 655),
  y: Phaser.Math.Clamp(y, 530, 915),
});
export class HomeScene extends Phaser.Scene {
  private positiveFeedback?: Phaser.GameObjects.Ellipse;
  private background!: Phaser.GameObjects.Image;
  private dog!: DogActor;
  private boy!: HumanActor;
  private items!: Record<Item, Phaser.GameObjects.Image>;
  private bed!: Phaser.GameObjects.Image;
  private box!: Phaser.GameObjects.Image;
  private lid!: Phaser.GameObjects.Image;
  private foodBowl!: Phaser.GameObjects.Image;
  private waterBowl!: Phaser.GameObjects.Image;
  private foodFill!: Phaser.GameObjects.Container;
  private waterFill!: Phaser.GameObjects.Ellipse;
  private ring!: Phaser.GameObjects.Ellipse;
  private cue!: Phaser.GameObjects.Container;
  private cueIcon!: Phaser.GameObjects.Image;
  private zzz!: Phaser.GameObjects.Text;
  private needs: CharacterStateEngine;
  private variation = new VariationEngine();
  private selected: Item | 'jiyul' | null = null;
  private owner: 'floor' | 'jini' | 'jiyul' = 'floor';
  private foodFilled = false;
  private waterFilled = false;
  private boxOpen = false;
  private behavior = 'idle';
  private serial = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private frozen = false;
  private dragOwner?: number;
  private dragged = new Set<string>();
  private lastEmit = 0;
  private lastCue = 0;
  constructor(
    private start: HomeStart,
    private callbacks: HomeCallbacks,
  ) {
    super('free-home');
    this.needs = new CharacterStateEngine(start.initial);
  }
  preload() {
    this.load.svg('home-room-fallback', svgUrl(playRoomSvg(false)));
    this.load.image('home-room', homeBackground);
    Object.entries(homeAssets).forEach(([key, asset]) => {
      if (asset.url) this.load.image(`home-${key}`, asset.url);
      else this.load.svg(`home-${key}`, svgUrl(asset.svg!));
    });
  }
  create() {
    this.background = this.add
      .image(360, 500, this.textures.exists('home-room') ? 'home-room' : 'home-room-fallback')
      .setDepth(-10)
      .setScrollFactor(0);
    this.layoutCamera();
    this.scale.on('resize', this.layoutCamera, this);
    this.bed = this.add.image(595, 596, 'home-bed').setDisplaySize(205, 140).setDepth(560);
    this.box = this.add.image(104, 602, 'home-box').setDisplaySize(150, 140).setDepth(602);
    this.lid = this.add.image(103, 558, 'home-lid').setDisplaySize(150, 66).setDepth(603);
    this.foodBowl = this.add.image(454, 807, 'home-bowl').setDisplaySize(145, 84).setDepth(806);
    this.waterBowl = this.add
      .image(614, 807, 'home-waterBowl')
      .setDisplaySize(145, 84)
      .setDepth(806);
    this.waterFill = this.add
      .ellipse(614, 789, 109, 28, 0x7ebfce, 0.85)
      .setDepth(807)
      .setVisible(false);
    this.foodFill = this.add.container(454, 789).setDepth(807).setVisible(false);
    for (let i = 0; i < 16; i++)
      this.foodFill.add(
        this.add.ellipse(
          ((i % 6) - 2.5) * 16 + (i % 2) * 4,
          Math.floor(i / 6) * 8 - 8,
          13,
          9,
          i % 2 ? 0xb88750 : 0x9b6c42,
        ),
      );
    this.dog = new DogActor(this, this.start.dog.x, this.start.dog.y).setScale(0.96);
    this.boy = new HumanActor(this, 165, 740).setScale(0.9);
    this.items = {
      carrot: this.add
        .image(this.start.carrot.x, this.start.carrot.y, 'home-carrot')
        .setDisplaySize(66, 83),
      food: this.add.image(95, 878, 'home-food').setDisplaySize(90, 104),
      bottle: this.add.image(221, 878, 'home-bottle').setDisplaySize(85, 100),
    };
    this.ring = this.add
      .ellipse(0, 0, 100, 36)
      .setStrokeStyle(4, 0xfff8d5, 0.95)
      .setDepth(940)
      .setVisible(false);
    Object.entries(this.items).forEach(([name, item]) => {
      item.setDepth(item.y + 1);
      const hitWidth = Math.max(item.width, 100 / item.scaleX),
        hitHeight = Math.max(item.height, 100 / item.scaleY);
      item.setInteractive(
        new Phaser.Geom.Rectangle(
          (item.width - hitWidth) / 2,
          (item.height - hitHeight) / 2,
          hitWidth,
          hitHeight,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(item);
      item.on('pointerdown', () => this.dragged.delete(name));
      item.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        if (!this.frozen && !this.dragged.has(name) && pointer.getDistance() < 12)
          this.tapItem(name as Item);
      });
      item.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        if (this.frozen || this.dragOwner !== undefined) return;
        this.tweens.killTweensOf(item);
        this.dragOwner = pointer.id;
        this.dragged.add(name);
        this.cancel();
        this.selected = null;
        if (name === 'carrot') {
          this.owner = 'floor';
          this.boy.animate('idle');
        }
        item.setDepth(1800);
        this.ring.setVisible(false);
        this.callbacks.sound('tap');
      });
      item.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
        if (this.dragOwner === pointer.id && !this.frozen) {
          item.setPosition(Phaser.Math.Clamp(x, 35, 685), Phaser.Math.Clamp(y, 450, 940));
        }
      });
      item.on('dragend', (pointer: Phaser.Input.Pointer) => {
        if (this.dragOwner !== pointer.id) return;
        this.dragOwner = undefined;
        this.drop(name as Item, item.x, item.y, 'drag');
      });
    });
    this.input.dragDistanceThreshold = 9;
    const tap = (obj: Phaser.GameObjects.GameObject, fn: () => void) =>
      obj.on('pointerup', (p: Phaser.Input.Pointer) => {
        if (!this.frozen && p.getDistance() < 12 && this.dragOwner === undefined) fn();
      });
    tap(this.dog, () => {
      if (this.selected === 'carrot') this.drop('carrot', this.dog.x - 30, this.dog.y + 35, 'tap');
      else if (this.owner === 'jini') this.takeCarrot();
      else this.act('pet', 'tap');
    });
    tap(this.boy, () => {
      if (this.selected === 'carrot' || this.owner === 'jini') this.takeCarrot();
      else {
        this.selected = 'jiyul';
        this.boy.animate('waving');
        this.callbacks.sound('tap');
        this.publish();
      }
    });
    this.input.setDraggable(this.boy);
    this.boy.on('dragstart', () => {
      this.selected = 'jiyul';
      this.boy.animate('walk');
    });
    this.boy.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      if (!this.frozen) {
        this.tweens.killTweensOf(this.boy);
        const p = floor(x, y);
        this.boy.setPosition(p.x, p.y);
      }
    });
    this.boy.on('dragend', () => {
      this.boy.animate(this.owner === 'jiyul' ? 'holding' : 'idle');
      this.selected = null;
      this.log('move', 'drag', this.needs.state, 'moved');
    });
    [this.foodBowl, this.waterBowl, this.bed, this.box].forEach((obj) =>
      obj.setInteractive({ useHandCursor: true }),
    );
    tap(this.foodBowl, () => {
      if (this.selected === 'food') this.drop('food', 454, 807, 'tap');
      else if (this.foodFilled) this.act('food', 'tap');
      else {
        this.selected = 'food';
        this.callbacks.sound('tap');
        this.publish();
      }
    });
    tap(this.waterBowl, () => this.drop('bottle', 614, 807, 'tap'));
    tap(this.bed, () => this.act('bed', 'tap'));
    tap(this.box, () => {
      this.boxOpen = !this.boxOpen;
      this.tweens.add({
        targets: this.lid,
        y: this.boxOpen ? 514 : 558,
        angle: this.boxOpen ? -12 : 0,
        duration: this.reduced ? 0 : 260,
      });
      this.line('box');
      this.callbacks.sound('tap');
      this.log('box', 'tap', this.needs.state, this.boxOpen ? 'opened' : 'closed');
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (
        this.frozen ||
        over.length ||
        p.getDistance() > 12 ||
        this.dragOwner !== undefined ||
        p.worldY < 485
      )
        return;
      const point = floor(p.worldX, p.worldY);
      if (this.selected && this.selected !== 'jiyul')
        this.drop(this.selected, point.x, point.y, 'tap');
      else this.moveBoy(point.x, point.y);
    });
    this.cueIcon = this.add.image(0, 0, 'home-carrot').setDisplaySize(35, 43);
    this.zzz = this.add
      .text(0, 0, 'z z', { fontFamily: 'sans-serif', fontSize: '24px', color: '#8a947b' })
      .setOrigin(0.5);
    this.cue = this.add
      .container(0, 0, [
        this.add.ellipse(0, 0, 65, 58, 0xfff9e8, 0.95).setStrokeStyle(2, 0xdfcba1),
        this.cueIcon,
        this.zzz,
      ])
      .setDepth(1500);
    this.events.once('shutdown', () => {
      this.serial++;
      this.input.removeAllListeners();
    });
    this.applyCue();
    this.publish();
    const situation = homeData.situations.find((s) => s.id === this.start.variationId)!;
    this.callbacks.line(this.variation.line(`home:${situation.id}`, situation.intro));
    this.time.delayedCall(750, () => this.idleClue());
    this.callbacks.ready();
  }
  private layoutCamera() {
    const h = this.scale.height;
    this.cameras.main.setScroll(0, 1000 - h);
    this.background.setPosition(360, h / 2).setDisplaySize(720, h);
  }
  private line(key: keyof typeof homeData.dialogue) {
    this.callbacks.line(this.variation.line(`home:${key}`, homeData.dialogue[key]));
  }
  private cancel() {
    if (this.positiveFeedback) {
      this.tweens.killTweensOf(this.positiveFeedback);
      this.positiveFeedback.destroy();
      this.positiveFeedback = undefined;
    }
    this.serial++;
    this.tweens.killTweensOf(this.dog);
    this.tweens.killTweensOf(this.boy);
    this.boy.animate(this.owner === 'jiyul' ? 'holding' : 'idle');
    this.behavior = 'idle';
    this.dog.animate('idle');
  }
  private travel(x: number, y: number, animation: DogAnimation, token: number, done: () => void) {
    this.dog.lookAt(x);
    this.dog.animate(animation);
    const distance = Phaser.Math.Distance.Between(this.dog.x, this.dog.y, x, y);
    this.tweens.add({
      targets: this.dog,
      x,
      y,
      duration: this.reduced
        ? 180
        : Math.max(320, (distance / (animation === 'run' ? 240 : 130)) * 1000),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (token === this.serial) done();
      },
    });
  }
  private later(ms: number, token: number, fn: () => void) {
    this.time.delayedCall(ms, () => {
      if (token === this.serial) fn();
    });
  }
  private tapItem(item: Item) {
    if (item === 'carrot' && this.owner === 'jini') {
      this.takeCarrot();
      return;
    }
    if (this.selected === item) {
      this.drop(item, this.items[item].x, this.items[item].y, 'tap');
      return;
    }
    if (item === 'carrot' && this.owner === 'jiyul') this.boy.animate('holding');
    this.selected = item;
    this.callbacks.sound('tap');
    this.publish();
  }
  private drop(item: Item, x: number, y: number, input: 'tap' | 'drag') {
    if (this.frozen) return;
    this.selected = null;
    this.ring.setVisible(false);
    const image = this.items[item];
    if (item === 'carrot') {
      this.cancel();
      this.owner = 'floor';
      this.boy.animate('idle');
      const p = floor(x, y);
      image.setPosition(p.x, p.y).setDepth(p.y + 1);
      this.callbacks.sound('drop');
      this.act('carrot', input);
    } else {
      const target = item === 'food' ? this.foodBowl : this.waterBowl;
      const valid = Phaser.Math.Distance.Between(x, y, target.x, target.y) < 100;
      this.tweens.add({
        targets: image,
        x: item === 'food' ? 95 : 221,
        y: 878,
        duration: this.reduced ? 0 : 220,
        onComplete: () => image.setDepth(879),
      });
      if (valid) {
        if (item === 'food') {
          this.foodFilled = true;
          this.foodFill.setVisible(true);
        } else {
          this.waterFilled = true;
          this.waterFill.setVisible(true);
        }
        this.particles(target.x, target.y - 25, item === 'food' ? 0xb48752 : 0x88cbd8);
        this.act(item === 'food' ? 'food' : 'water', input);
      } else {
        this.callbacks.sound('drop');
        this.publish();
      }
    }
  }
  private takeCarrot() {
    if (this.frozen) return;
    this.cancel();
    const token = this.serial;
    const p = floor(this.items.carrot.x - 85, this.items.carrot.y + 55);
    this.boy.animate('walk');
    this.tweens.killTweensOf(this.boy);
    this.tweens.add({
      targets: this.boy,
      x: p.x,
      y: p.y,
      duration: this.reduced ? 150 : 600,
      onComplete: () => {
        if (token !== this.serial) return;
        this.owner = 'jiyul';
        this.selected = 'carrot';
        this.boy.animate('holding');
        this.dog.animate('tail_wag');
        this.line('take');
        this.log('take_carrot', 'tap', this.needs.state, 'holding');
      },
    });
  }
  private moveBoy(x: number, y: number) {
    this.selected = null;
    this.tweens.killTweensOf(this.boy);
    this.boy.animate('walk');
    const d = Phaser.Math.Distance.Between(x, y, this.boy.x, this.boy.y);
    this.tweens.add({
      targets: this.boy,
      x,
      y,
      duration: this.reduced ? 150 : Math.max(250, (d / 180) * 1000),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.boy.animate(this.owner === 'jiyul' ? 'holding' : 'idle');
        this.log('move', 'tap', this.needs.state, 'moved');
      },
    });
    this.publish();
  }
  private act(action: HomeAction, input: 'tap' | 'drag') {
    this.cancel();
    const token = this.serial,
      before = { ...this.needs.state };
    if (this.owner === 'jini' && action !== 'pet' && action !== 'carrot') {
      this.owner = 'floor';
      this.items.carrot.setPosition(this.dog.x - 70, this.dog.y + 20).setDepth(this.dog.y + 21);
    }
    const behavior = this.needs.reaction(action);
    this.behavior = behavior;
    this.selected = null;
    this.line(behavior);
    this.callbacks.sound('tap');
    const finish = (outcome: string = behavior) => {
      if (token !== this.serial) return;
      this.needs.finish(behavior);
      this.behavior = 'idle';
      if (meetsCurrentNeed(action, before)) this.showPositiveFeedback();
      this.applyCue();
      this.log(action, input, before, outcome);
    };
    if (behavior === 'fetch') {
      const carrot = this.items.carrot;
      this.travel(carrot.x - 35, carrot.y + 65, 'run', token, () => {
        this.dog.animate('play_carrot');
        this.later(400, token, () => {
          this.owner = 'jini';
          this.travel(
            Phaser.Math.Clamp(this.boy.x + 145, 130, 620),
            Math.min(910, this.boy.y + 10),
            'carry_carrot',
            token,
            () => {
              this.dog.animate('happy');
              this.particles(this.dog.x, this.dog.y - 130, 0xf0c56e);
              this.callbacks.sound('happy');
              this.line('fetch');
              finish('returned_carrot');
            },
          );
        });
      });
    } else if (behavior === 'seek_food' || behavior === 'seek_water') {
      const isFood = behavior === 'seek_food';
      this.travel(isFood ? 450 : 590, 746, 'walk', token, () => {
        this.dog.animate('sit');
        this.behavior = behavior;
        this.log(action, input, before, behavior);
      });
    } else if (behavior === 'eat' || behavior === 'drink') {
      const eating = behavior === 'eat';
      this.travel(eating ? 437 : 590, 760, 'walk', token, () => {
        this.dog.animate(eating ? 'eat' : 'drink');
        this.later(2000, token, () => {
          if (eating) {
            this.foodFilled = false;
            this.foodFill.setVisible(false);
          } else {
            this.waterFilled = false;
            this.waterFill.setVisible(false);
          }
          this.dog.animate('tail_wag');
          this.particles(this.dog.x, this.dog.y - 130, 0xe5b5a0);
          this.callbacks.sound('happy');
          finish();
        });
      });
    } else if (behavior === 'rest') {
      this.callbacks.dogSound('yawn');
      this.dog.animate('tired');
      this.later(500, token, () =>
        this.travel(590, 608, 'walk', token, () => {
          this.dog.animate('lie_down');
          this.later(700, token, () => this.dog.animate('sleep'));
          this.later(4300, token, () => {
            this.dog.animate('sit');
            this.line('rested');
            finish('rested');
          });
        }),
      );
    } else {
      this.callbacks.dogSound('bark');
      this.dog.animate('tail_wag');
      this.particles(this.dog.x, this.dog.y - 140, 0xe8a298, true);
      this.later(1500, token, () => {
        this.dog.animate('sit');
        finish();
      });
    }
    this.publish();
  }
  private showPositiveFeedback() {
    if (this.positiveFeedback) {
      this.tweens.killTweensOf(this.positiveFeedback);
      this.positiveFeedback.destroy();
    }
    const circle = this.add
      .ellipse(this.dog.x, this.dog.y - 190, 104, 104, 0xf0ffed, 0.95)
      .setStrokeStyle(10, 0x48ad68)
      .setDepth(1700);
    this.positiveFeedback = circle;
    if (!this.reduced) {
      circle.setScale(0.8);
      this.tweens.add({
        targets: circle,
        scaleX: 1,
        scaleY: 1,
        duration: 220,
        ease: 'Sine.easeOut',
      });
    }
    this.tweens.add({
      targets: circle,
      alpha: 0,
      delay: 1300,
      duration: this.reduced ? 0 : 450,
      onComplete: () => {
        circle.destroy();
        if (this.positiveFeedback === circle) this.positiveFeedback = undefined;
        this.publish();
      },
    });
  }
  private idleClue() {
    if (this.behavior !== 'idle' || this.dragOwner !== undefined) return;
    const desire = this.needs.state.desire;
    if (desire === 'rest') {
      this.dog.animate('tired');
    } else if (desire === 'play') {
      this.dog.animate(this.owner === 'jini' ? 'carry_carrot' : 'tail_wag');
    } else {
      this.dog.lookAt(desire === 'food' ? 454 : 614);
      this.dog.animate('sit');
    }
  }
  private applyCue() {
    if (!this.cue) return;
    const desire = this.needs.state.desire;
    this.cueIcon
      .setTexture(
        `home-${desire === 'food' ? 'bowl' : desire === 'water' ? 'waterBowl' : 'carrot'}`,
      )
      .setDisplaySize(desire === 'play' ? 31 : 46, desire === 'play' ? 39 : 30);
    this.cueIcon.setVisible(desire !== 'rest');
    this.zzz.setVisible(desire === 'rest');
  }
  private particles(x: number, y: number, color: number, heart = false) {
    if (this.reduced) return;
    for (let i = 0; i < 5; i++) {
      const p = heart
        ? this.add.image(x + (i - 2) * 16, y, 'home-heart').setDisplaySize(20, 20)
        : this.add.ellipse(x + (i - 2) * 13, y, 8, 10, color);
      p.setDepth(1600);
      this.tweens.add({
        targets: p,
        y: y - 55 - i * 7,
        x: p.x + (i - 2) * 10,
        alpha: 0,
        duration: 800,
        delay: i * 70,
        onComplete: () => p.destroy(),
      });
    }
  }
  private log(action: string, input: 'tap' | 'drag', before: CharacterState, outcome: string) {
    this.callbacks.event({
      action,
      input,
      before: { ...before },
      after: { ...this.needs.state },
      outcome,
    });
    this.publish();
  }
  snapshot(): HomeSnapshot {
    const objects: HomeSnapshot['objects'] = {};
    if (this.items) {
      for (const [id, obj] of Object.entries({
        ...this.items,
        jini: this.dog,
        jiyul: this.boy,
        bed: this.bed,
        box: this.box,
        bowl: this.foodBowl,
        waterBowl: this.waterBowl,
      }))
        objects[id] = { x: Math.round(obj.x), y: Math.round(obj.y) };
    }
    return {
      ready: !!this.items,
      viewport: { height: this.scale.height, offset: this.scale.height - 1000 },
      state: { ...this.needs.state },
      behavior: this.behavior,
      animation: this.dog?.animation ?? 'idle',
      selected: this.selected,
      owner: this.owner,
      positiveFeedback: !!this.positiveFeedback,
      foodFilled: this.foodFilled,
      waterFilled: this.waterFilled,
      objects,
    };
  }
  private publish() {
    this.callbacks.snapshot(this.snapshot());
  }
  setPaused(paused: boolean) {
    this.frozen = paused;
    if (paused) {
      this.dragOwner = undefined;
      this.selected = null;
      if (this.items) {
        this.items.food.setPosition(95, 878);
        this.items.bottle.setPosition(221, 878);
      }
      this.input.enabled = false;
      this.scene.pause();
    } else {
      this.scene.resume();
      this.input.enabled = true;
    }
  }
  /** Keyboard/screen-reader controls use the same commands as physical scene objects. */
  command(id: string) {
    if (this.frozen || !this.items) return;
    if (id in this.items) this.tapItem(id as Item);
    else if (id === 'jini') {
      if (this.owner === 'jini') this.takeCarrot();
      else this.act('pet', 'tap');
    } else if (id === 'bed') this.act('bed', 'tap');
    else if (id === 'waterBowl') this.drop('bottle', 614, 807, 'tap');
    else if (id === 'bowl') this.drop('food', 454, 807, 'tap');
    else if (id === 'jiyul') {
      this.selected = 'jiyul';
      this.boy.animate('waving');
    } else if (id === 'floor') {
      if (this.selected && this.selected !== 'jiyul') this.drop(this.selected, 350, 850, 'tap');
      else this.moveBoy(300, 790);
    }
  }
  update(time: number) {
    if (!this.items) return;
    this.dog.tick(time, this.reduced);
    this.boy.tick(time, this.reduced);
    if (this.owner !== 'floor' && this.dragOwner === undefined) {
      const p = this.owner === 'jini' ? this.dog.mouth() : this.boy.hand();
      this.items.carrot
        .setPosition(p.x, p.y)
        .setDepth((this.owner === 'jini' ? this.dog.y : this.boy.y) + 2)
        .setAngle(this.owner === 'jini' ? 75 : -18);
    } else this.items.carrot.setAngle(0);
    this.cue
      .setPosition(this.dog.x - 15, this.dog.y - 192)
      .setVisible(
        !this.positiveFeedback && (this.behavior === 'idle' || this.behavior.startsWith('seek_')),
      );
    this.ring.setVisible(!!this.selected);
    if (this.selected) {
      const o = this.selected === 'jiyul' ? this.boy : this.items[this.selected];
      this.ring.setPosition(o.x, o.y + 25);
    }
    if (time - this.lastCue > 7000) {
      this.lastCue = time;
      this.idleClue();
    }
    if (time - this.lastEmit > 180) {
      this.lastEmit = time;
      this.publish();
    }
  }
}

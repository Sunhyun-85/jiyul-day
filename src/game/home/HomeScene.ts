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
import { HomeLifeEngine, type AccidentPhase } from '../../engine/HomeLifeEngine';
export const HOME_W = 720,
  HOME_H = 1000;
export type Item = 'carrot' | 'food' | 'bottle';
type Supply = Exclude<Item, 'carrot'>;
const BOY_HOME = { x: 165, y: 680 };
const SUPPLY_HOME = { food: { x: 95, y: 878 }, bottle: { x: 221, y: 878 } };
type CarePhase = 'pickup' | 'carry' | 'pour' | 'put_back' | 'return_home';
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
  owner: 'floor' | 'jini' | 'jiyul' | 'box';
  positiveFeedback: boolean;
  feedback: { x: number; y: number; diameter: number } | null;
  accident: AccidentPhase;
  roaming: boolean;
  carePhase: CarePhase | null;
  carriedSupply: Supply | null;
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
  y: Phaser.Math.Clamp(y, 440, 915),
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
  private owner: 'floor' | 'jini' | 'jiyul' | 'box' = 'floor';
  private careItem: Supply | null = null;
  private carriedSupply: Supply | null = null;
  private carePhase: CarePhase | null = null;
  private pourEffect?: Phaser.GameObjects.Graphics;
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
  private life = new HomeLifeEngine();
  private roaming = false;
  private nextRoamAt = 2400;
  private poop?: Phaser.GameObjects.Image;
  private cleaningBrush?: Phaser.GameObjects.Image;
  // Spread world positions across portrait screens without stretching the artwork.
  private artworkScales = new WeakMap<
    Phaser.GameObjects.GameObject,
    { base: number; applied: number }
  >();
  private get verticalZoom() {
    return this.scale.height / HOME_H;
  }
  private fitArtwork() {
    for (const object of this.children.list) {
      if (object === this.background || object === this.pourEffect || !('scaleY' in object))
        continue;
      const sprite = object as Phaser.GameObjects.Image;
      let scale = this.artworkScales.get(object);
      if (!scale) scale = { base: sprite.scaleY, applied: sprite.scaleY };
      else if (sprite.scaleY !== scale.applied) scale.base = sprite.scaleY;
      sprite.scaleY = scale.base / this.verticalZoom;
      scale.applied = sprite.scaleY;
      this.artworkScales.set(object, scale);
    }
  }
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
    this.bed = this.add.image(595, 490, 'home-bed').setDisplaySize(205, 140).setDepth(455);
    this.box = this.add.image(104, 500, 'home-box').setDisplaySize(150, 140).setDepth(500);
    this.lid = this.add.image(103, 456, 'home-lid').setDisplaySize(150, 66).setDepth(501);
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
    this.boy = new HumanActor(this, BOY_HOME.x, BOY_HOME.y).setScale(0.9);
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
        if (this.boyBusy()) this.cancel();
        this.selected = 'jiyul';
        this.boy.animate('waving');
        this.callbacks.sound('tap');
        this.publish();
      }
    });
    this.input.setDraggable(this.boy);
    this.boy.on('dragstart', () => {
      if (this.boyBusy()) this.cancel();
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
    tap(this.foodBowl, () => this.act('food', 'tap'));
    tap(this.waterBowl, () => this.drop('bottle', 614, 807, 'tap'));
    tap(this.bed, () => this.act('bed', 'tap'));
    tap(this.box, () => this.openBox());
    this.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (
        this.frozen ||
        over.length ||
        p.getDistance() > 12 ||
        this.dragOwner !== undefined ||
        p.worldY < 420
      )
        return;
      const point = floor(p.worldX, p.worldY);
      if (this.selected && this.selected !== 'jiyul')
        this.drop(this.selected, point.x, point.y, 'tap');
      else this.moveBoy(point.x, point.y);
    });
    this.cueIcon = this.add.image(0, -6, 'home-carrot').setDisplaySize(66, 82);
    this.zzz = this.add
      .text(30, -35, 'z z', { fontFamily: 'sans-serif', fontSize: '22px', color: '#78887d' })
      .setOrigin(0.5);
    const cloud = this.add.graphics();
    cloud.fillStyle(0xc5bcac, 0.2);
    cloud.fillEllipse(0, 5, 158, 99);
    cloud.fillStyle(0xffffff, 1);
    cloud.fillEllipse(0, 0, 150, 94);
    cloud.fillCircle(-50, -12, 32);
    cloud.fillCircle(-23, -34, 30);
    cloud.fillCircle(18, -35, 31);
    cloud.fillCircle(51, -10, 30);
    cloud.fillCircle(-42, 24, 27);
    cloud.fillCircle(32, 27, 27);
    cloud.fillCircle(30, 65, 12);
    cloud.fillCircle(42, 88, 8);
    cloud.fillCircle(48, 106, 5);
    this.cue = this.add.container(0, 0, [cloud, this.cueIcon, this.zzz]).setDepth(1500);
    this.events.once('shutdown', () => {
      this.serial++;
      this.input.removeAllListeners();
      this.scale.off('resize', this.layoutCamera, this);
    });
    this.applyCue();
    this.fitArtwork();
    this.publish();
    const situation = homeData.situations.find((s) => s.id === this.start.variationId)!;
    this.callbacks.line(this.variation.line(`home:${situation.id}`, situation.intro));
    this.time.delayedCall(750, () => this.idleClue());
    this.callbacks.ready();
  }
  private layoutCamera() {
    this.cameras.main.setOrigin(0, 0).setScroll(0, 0).setZoom(1, this.verticalZoom);
    // Crop some empty foreground floor, giving the rug and furniture more space.
    this.background.setPosition(360, 570).setDisplaySize(720, 1140);
    this.fitArtwork();
  }
  private line(key: keyof typeof homeData.dialogue) {
    this.callbacks.line(this.variation.line(`home:${key}`, homeData.dialogue[key]));
  }
  private boyBusy() {
    return this.behavior === 'tidying' || this.behavior === 'returning' || !!this.careItem;
  }
  private cancel() {
    this.life.interrupt();
    this.roaming = false;
    this.nextRoamAt = this.life.elapsed + 1800;
    if (this.careItem) {
      const item = this.items[this.careItem];
      this.tweens.killTweensOf(item);
      const home = SUPPLY_HOME[this.careItem];
      item
        .setPosition(home.x, home.y)
        .setAngle(0)
        .setDepth(home.y + 1);
    }
    this.carriedSupply = null;
    this.careItem = null;
    this.carePhase = null;
    this.pourEffect?.destroy();
    this.pourEffect = undefined;
    if (this.positiveFeedback) {
      this.tweens.killTweensOf(this.positiveFeedback);
      this.positiveFeedback.destroy();
      this.positiveFeedback = undefined;
    }
    this.serial++;
    if (this.items) this.tweens.killTweensOf(this.items.carrot);
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
    if (item !== 'carrot') {
      this.act(item === 'food' ? 'food' : 'water', 'tap');
      return;
    }
    if (item === 'carrot' && this.behavior === 'tidying') this.cancel();
    if (item === 'carrot' && this.owner === 'box') {
      this.openBox();
      return;
    }
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
      if (valid) {
        const home = SUPPLY_HOME[item];
        this.tweens.killTweensOf(image);
        image.setPosition(home.x, home.y).setDepth(home.y + 1);
        this.act(item === 'food' ? 'food' : 'water', input);
      } else {
        const home = SUPPLY_HOME[item];
        this.tweens.add({
          targets: image,
          x: home.x,
          y: home.y,
          duration: this.reduced ? 0 : 220,
          onComplete: () => image.setDepth(home.y + 1),
        });
        this.callbacks.sound('drop');
        this.publish();
      }
    }
  }
  private setBoxOpen(open: boolean) {
    this.boxOpen = open;
    this.tweens.killTweensOf(this.lid);
    this.tweens.add({
      targets: this.lid,
      y: open ? 412 : 456,
      angle: open ? -12 : 0,
      duration: this.reduced ? 0 : 260,
    });
  }
  private openBox() {
    if (this.behavior === 'tidying') this.cancel();
    this.setBoxOpen(!this.boxOpen);
    if (this.owner === 'box') {
      this.owner = 'floor';
      this.items.carrot.setVisible(true).setPosition(230, 560).setDepth(561);
      this.selected = 'carrot';
      this.setBoxOpen(true);
    }
    this.line('box');
    this.callbacks.sound('tap');
    this.log('box', 'tap', this.needs.state, this.boxOpen ? 'opened' : 'closed');
  }
  private tidyCarrot(token: number, done: () => void) {
    this.behavior = 'tidying';
    this.dog.lookAt(this.boy.x);
    this.dog.animate('tail_wag');
    const mouth = this.dog.mouth();
    this.boy.animate('walk');
    this.tweens.killTweensOf(this.boy);
    this.tweens.add({
      targets: this.boy,
      x: mouth.x - 43 * this.boy.scaleX,
      y: mouth.y + 98 * this.boy.scaleY,
      duration: this.reduced ? 100 : 550,
      onComplete: () => {
        if (token !== this.serial) return;
        this.owner = 'jiyul';
        this.selected = null;
        this.boy.animate('holding');
        this.line('tidy');
        this.publish();
        this.later(750, token, () => {
          this.setBoxOpen(true);
          this.boy.animate('walk');
          const distance = Phaser.Math.Distance.Between(this.boy.x, this.boy.y, 165, 570);
          this.tweens.add({
            targets: this.boy,
            x: 165,
            y: 570,
            duration: this.reduced ? 200 : Math.max(900, (distance / 180) * 1000),
            ease: 'Sine.easeInOut',
            onComplete: () => {
              if (token !== this.serial) return;
              this.boy.animate('holding');
              this.later(400, token, () => {
                // The toy visibly leaves the hand and goes into the open box.
                this.owner = 'floor';
                this.tweens.add({
                  targets: this.items.carrot,
                  x: this.box.x,
                  y: this.box.y - 15,
                  duration: this.reduced ? 100 : 500,
                  ease: 'Sine.easeInOut',
                  onComplete: () => {
                    if (token !== this.serial) return;
                    this.owner = 'box';
                    this.items.carrot.setVisible(false);
                    this.boy.animate('happy');
                    this.setBoxOpen(false);
                    this.line('tidied');
                    this.particles(this.box.x, this.box.y - 65, 0xf0c56e);
                    done();
                    this.behavior = 'returning';
                    this.walkBoy(BOY_HOME.x, BOY_HOME.y, token, () => {
                      this.behavior = 'idle';
                      this.publish();
                    });
                  },
                });
              });
            },
          });
        });
      },
    });
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
    if (this.boyBusy()) this.cancel();
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
  private walkBoy(x: number, y: number, token: number, done: () => void) {
    this.boy.animate('walk');
    this.tweens.killTweensOf(this.boy);
    const distance = Phaser.Math.Distance.Between(this.boy.x, this.boy.y, x, y);
    this.tweens.add({
      targets: this.boy,
      x,
      y,
      duration: this.reduced ? 160 : Math.max(320, (distance / 300) * 1000),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (token !== this.serial) return;
        this.boy.animate(this.carriedSupply ? 'holding' : 'idle');
        done();
      },
    });
  }
  private serveCare(item: Supply, token: number, consumed: () => void) {
    this.careItem = item;
    this.carePhase = 'pickup';
    const home = SUPPLY_HOME[item];
    const target = item === 'food' ? this.foodBowl : this.waterBowl;
    const image = this.items[item];
    this.tweens.killTweensOf(image);
    image
      .setPosition(home.x, home.y)
      .setAngle(0)
      .setDepth(home.y + 1);
    let dogDone = false,
      boyDone = false;
    const settle = () => {
      if (token !== this.serial || !dogDone || !boyDone) return;
      this.careItem = null;
      this.carePhase = null;
      this.behavior = 'idle';
      this.idleClue();
      this.publish();
    };
    const pickupX = home.x - 43 * this.boy.scaleX;
    const pickupY = home.y + 98 * this.boy.scaleY;
    this.walkBoy(pickupX, pickupY, token, () => {
      this.carriedSupply = item;
      this.carePhase = 'carry';
      this.boy.animate('holding');
      this.later(250, token, () =>
        this.walkBoy(target.x - 95, target.y + 20, token, () => {
          this.carePhase = 'pour';
          this.boy.animate('holding');
          this.pourEffect = this.add.graphics().setDepth(1700);
          this.callbacks.sound('drop');
          this.later(this.reduced ? 450 : 1100, token, () => {
            this.pourEffect?.destroy();
            this.pourEffect = undefined;
            if (item === 'food') {
              this.foodFilled = true;
              this.foodFill.setVisible(true);
            } else {
              this.waterFilled = true;
              this.waterFill.setVisible(true);
            }
            this.carePhase = 'put_back';
            // Jini eats while Jiyul carries the container back, without teleporting it.
            this.travel(item === 'food' ? 437 : 590, 760, 'walk', token, () => {
              this.dog.animate(item === 'food' ? 'eat' : 'drink');
              this.line(item === 'food' ? 'eat' : 'drink');
              this.later(2000, token, () => {
                if (item === 'food') {
                  this.foodFilled = false;
                  this.foodFill.setVisible(false);
                } else {
                  this.waterFilled = false;
                  this.waterFill.setVisible(false);
                }
                this.dog.animate('tail_wag');
                this.callbacks.sound('happy');
                consumed();
                dogDone = true;
                settle();
              });
            });
            this.walkBoy(pickupX, pickupY, token, () => {
              this.carriedSupply = null;
              image
                .setPosition(home.x, home.y)
                .setAngle(0)
                .setDepth(home.y + 1);
              this.carePhase = 'return_home';
              this.walkBoy(BOY_HOME.x, BOY_HOME.y, token, () => {
                boyDone = true;
                settle();
              });
            });
          });
        }),
      );
    });
  }
  private act(action: HomeAction, input: 'tap' | 'drag') {
    if (
      (action === 'food' && this.careItem === 'food') ||
      (action === 'water' && this.careItem === 'bottle')
    )
      return;
    this.cancel();
    const token = this.serial,
      before = { ...this.needs.state };
    if (
      (this.owner === 'jini' || this.owner === 'jiyul') &&
      action !== 'pet' &&
      action !== 'carrot'
    ) {
      const holder = this.owner === 'jini' ? this.dog : this.boy;
      this.owner = 'floor';
      this.items.carrot.setPosition(holder.x - 50, holder.y + 20).setDepth(holder.y + 21);
    }
    const behavior = this.needs.reaction(action);
    this.behavior = behavior;
    this.selected = null;
    this.line(behavior === 'eat' ? 'bring_food' : behavior === 'drink' ? 'bring_water' : behavior);
    this.callbacks.sound('tap');
    const finish = (outcome: string = behavior, settled = true) => {
      if (token !== this.serial) return;
      this.needs.finish(behavior);
      if (behavior === 'eat') this.life.afterMeal();
      if (settled) this.behavior = 'idle';
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
              this.tidyCarrot(token, () => finish('returned_carrot', false));
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
      this.serveCare(behavior === 'eat' ? 'food' : 'bottle', token, () => finish(behavior, false));
    } else if (behavior === 'rest') {
      this.callbacks.dogSound('yawn');
      this.dog.animate('tired');
      this.later(500, token, () =>
        this.travel(590, 502, 'walk', token, () => {
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
      .ellipse(HOME_W / 2, HOME_H / 2, 340, 340, 0xf0ffed, 0.85)
      .setStrokeStyle(18, 0x48ad68)
      .setDepth(3000);
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
    if (
      this.behavior !== 'idle' ||
      this.dragOwner !== undefined ||
      this.roaming ||
      this.life.phase === 'happening'
    )
      return;
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
  private wander() {
    if (
      this.reduced ||
      this.roaming ||
      this.dragOwner !== undefined ||
      this.selected ||
      !['idle', 'seek_food', 'seek_water'].includes(this.behavior) ||
      ['happening', 'cleaning'].includes(this.life.phase) ||
      this.owner === 'jini'
    )
      return;
    const desire = this.needs.state.desire;
    this.nextRoamAt = this.life.elapsed + 1600;
    if (desire === 'rest') {
      this.dog.animate('tired');
      return;
    }
    const spots =
      desire === 'food'
        ? [
            { x: 390, y: 710 },
            { x: 510, y: 745 },
            { x: 350, y: 790 },
          ]
        : desire === 'water'
          ? [
              { x: 530, y: 700 },
              { x: 610, y: 760 },
              { x: 440, y: 735 },
            ]
          : [
              { x: 300, y: 590 },
              { x: 490, y: 630 },
              { x: 380, y: 750 },
              { x: 260, y: 830 },
              { x: 540, y: 700 },
            ];
    const candidates = spots.filter(
      (p) =>
        Phaser.Math.Distance.Between(p.x, p.y, this.dog.x, this.dog.y) > 100 &&
        Phaser.Math.Distance.Between(p.x, p.y, this.boy.x, this.boy.y) > 115 &&
        (!this.poop || Phaser.Math.Distance.Between(p.x, p.y, this.poop.x, this.poop.y) > 115),
    );
    const target = this.variation.shuffle(candidates)[0];
    if (!target) return;
    this.roaming = true;
    this.travel(target.x, target.y, desire === 'play' ? 'run' : 'walk', this.serial, () => {
      this.roaming = false;
      this.nextRoamAt = this.life.elapsed + 1000;
      this.dog.animate(desire === 'play' ? 'tail_wag' : 'sit');
      if (desire !== 'play')
        this.dog.lookAt(desire === 'food' ? this.foodBowl.x : this.waterBowl.x);
    });
  }
  private beginAccident() {
    // A natural pause in play, never in the middle of feeding, fetching or sleep.
    if (
      !this.life.due ||
      this.behavior !== 'idle' ||
      this.dragOwner !== undefined ||
      this.selected ||
      this.owner === 'jini' ||
      this.needs.state.desire === 'rest'
    )
      return;
    this.cancel();
    if (!this.life.begin()) return;
    this.behavior = 'accident';
    const token = this.serial;
    this.dog.animate('sit');
    this.later(1200, token, () => {
      this.life.appear();
      const p = floor(this.dog.x - 45, this.dog.y + 14);
      this.poop = this.add
        .image(p.x, p.y, 'home-poop')
        .setDisplaySize(80, 64)
        .setDepth(p.y + 1)
        .setInteractive({ useHandCursor: true });
      this.poop.on('pointerup', () => {
        if (!this.frozen && this.life.phase === 'waiting') this.line('accident_hint');
      });
      this.line('accident');
      this.publish();
      this.travel(Phaser.Math.Clamp(p.x + 140, 160, 620), p.y - 45, 'walk', token, () => {
        this.behavior = 'idle';
        this.dog.animate('sit');
        this.nextRoamAt = this.life.elapsed + 1400;
        this.publish();
      });
    });
  }
  private callMom() {
    if (!this.life.callMom() || !this.poop) return;
    this.cancel();
    this.boy.animate('waving');
    this.line('call_mom');
    this.showPositiveFeedback();
    this.callbacks.sound('happy');
    this.log('call_mom', 'tap', this.needs.state, 'asked_mom');
    const token = this.serial;
    this.later(900, token, () => this.boy.animate('idle'));
    const poop = this.poop;
    this.cleaningBrush = this.add
      .image(poop.x - 25, poop.y - 32, 'home-cleaningBrush')
      .setDisplaySize(80, 90)
      .setDepth(1800);
    if (!this.reduced)
      this.tweens.add({
        targets: this.cleaningBrush,
        x: poop.x + 25,
        angle: 18,
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    // Cleanup belongs to Mom and continues if the child starts another activity.
    this.time.delayedCall(1900, () => {
      poop.destroy();
      this.poop = undefined;
      this.cleaningBrush?.destroy();
      this.cleaningBrush = undefined;
      this.life.cleaned();
      this.line('cleaned');
      this.publish();
    });
  }
  private applyCue() {
    if (!this.cue) return;
    const desire = this.needs.state.desire;
    this.cueIcon
      .setTexture(
        `home-${desire === 'food' ? 'bowl' : desire === 'water' ? 'waterBowl' : desire === 'rest' ? 'bed' : 'carrot'}`,
      )
      .setDisplaySize(desire === 'play' ? 66 : 105, desire === 'play' ? 82 : 65);
    this.cueIcon.setVisible(true);
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
        ...(this.poop ? { poop: this.poop } : {}),
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
      viewport: { height: HOME_H, offset: 0 },
      state: { ...this.needs.state },
      behavior: this.behavior,
      animation: this.dog?.animation ?? 'idle',
      selected: this.selected,
      owner: this.owner,
      positiveFeedback: !!this.positiveFeedback,
      feedback: this.positiveFeedback
        ? { x: this.positiveFeedback.x, y: this.positiveFeedback.y, diameter: 340 }
        : null,
      accident: this.life.phase,
      roaming: this.roaming,
      carePhase: this.carePhase,
      carriedSupply: this.carriedSupply,
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
      if (this.items && !this.careItem) {
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
    if (id === 'call_mom') this.callMom();
    else if (id in this.items) this.tapItem(id as Item);
    else if (id === 'jini') {
      if (this.owner === 'jini') this.takeCarrot();
      else this.act('pet', 'tap');
    } else if (id === 'bed') this.act('bed', 'tap');
    else if (id === 'box') this.openBox();
    else if (id === 'waterBowl') this.drop('bottle', 614, 807, 'tap');
    else if (id === 'bowl') this.drop('food', 454, 807, 'tap');
    else if (id === 'jiyul') {
      if (this.boyBusy()) this.cancel();
      this.selected = 'jiyul';
      this.boy.animate('waving');
    } else if (id === 'floor') {
      if (this.selected && this.selected !== 'jiyul') this.drop(this.selected, 350, 850, 'tap');
      else this.moveBoy(300, 790);
    }
  }
  update(time: number, delta: number) {
    if (!this.items || this.frozen) return;
    this.life.advance(delta);
    this.beginAccident();
    if (this.life.elapsed >= this.nextRoamAt) this.wander();
    this.fitArtwork();
    if (this.carriedSupply) {
      const hand = this.boy.hand();
      this.items[this.carriedSupply]
        .setPosition(hand.x, hand.y)
        .setAngle(this.carePhase === 'pour' ? 65 : -12)
        .setDepth(this.boy.y + 3);
    }
    if (this.pourEffect && this.careItem) {
      const target = this.careItem === 'food' ? this.foodBowl : this.waterBowl;
      const graphic = this.pourEffect;
      graphic.clear();
      graphic.fillStyle(this.careItem === 'food' ? 0xaa7748 : 0x67bbdf, 0.9);
      for (let i = 0; i < 9; i++) {
        const progress = this.reduced ? i / 9 : (time / 650 + i / 9) % 1;
        graphic.fillEllipse(
          target.x - 14 + progress * 14,
          target.y - (65 - progress * 47) / this.verticalZoom,
          7,
          9 / this.verticalZoom,
        );
      }
    }
    this.dog.tick(time, this.reduced);
    this.boy.tick(time, this.reduced);
    if ((this.owner === 'jini' || this.owner === 'jiyul') && this.dragOwner === undefined) {
      const p = this.owner === 'jini' ? this.dog.mouth() : this.boy.hand();
      this.items.carrot
        .setPosition(p.x, p.y)
        .setDepth((this.owner === 'jini' ? this.dog.y : this.boy.y) + 2)
        .setAngle(this.owner === 'jini' ? 75 : -18);
    } else this.items.carrot.setAngle(0);
    this.cue
      .setPosition(
        Phaser.Math.Clamp(this.dog.x - 40, 90, 630),
        this.dog.y - 240 / this.verticalZoom,
      )
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

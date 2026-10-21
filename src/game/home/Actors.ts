import Phaser from 'phaser';
export type DogAnimation =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'lie_down'
  | 'tail_wag'
  | 'eat'
  | 'drink'
  | 'sleep'
  | 'happy'
  | 'tired'
  | 'carry_carrot'
  | 'play_carrot';
export type HumanAnimation =
  | 'idle'
  | 'walk'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'thinking'
  | 'holding'
  | 'waving'
  | 'playing_blocks';
const part = (s: Phaser.Scene, key: string, x: number, y: number) =>
  s.add.image(x, y, `home-${key}`);
export class DogActor extends Phaser.GameObjects.Container {
  animation: DogAnimation = 'idle';
  private paws: Phaser.GameObjects.Image[];
  private head: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Image;
  private tail: Phaser.GameObjects.Image;
  private torso: Phaser.GameObjects.Image;
  private facing = 1;
  private face: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.shadow = scene.add.ellipse(0, -2, 151, 23, 0x6f674e, 0.14);
    this.tail = part(scene, 'dogTail', -68, -69).setOrigin(0.25, 0.85);
    this.torso = part(scene, 'dogBody', -13, -63);
    this.paws = [-54, -20, 14, 43].map((px, i) =>
      part(scene, 'dogPaw', px, -23 + (i % 2) * 5)
        .setDisplaySize(25, 38)
        .setOrigin(0.5, 0.15),
    );
    this.head = scene.add.container(38, -97);
    this.eyes = part(scene, 'dogEyes', 0, 0);
    this.head.add([part(scene, 'dogHead', 0, 0), this.eyes]);
    this.face = scene.add.container(0, 0, [
      this.tail,
      this.paws[0],
      this.paws[2],
      this.torso,
      this.paws[1],
      this.paws[3],
      this.head,
    ]);
    this.add([this.shadow, this.face]);
    this.setSize(175, 165).setInteractive(
      new Phaser.Geom.Rectangle(2.5, -77.5, 175, 175),
      Phaser.Geom.Rectangle.Contains,
    );
  }
  lookAt(x: number) {
    if (Math.abs(x - this.x) > 8) this.facing = x < this.x ? -1 : 1;
  }
  animate(name: DogAnimation) {
    this.animation = name;
  }
  mouth() {
    return { x: this.x + this.facing * 47 * this.scaleX, y: this.y - 72 * this.scaleY };
  }
  tick(time: number, reduced: boolean) {
    const a = this.animation,
      resting = ['lie_down', 'sleep', 'tired'].includes(a);
    const moving = ['walk', 'run', 'carry_carrot'].includes(a);
    const t = reduced ? 0 : time / (a === 'run' ? 85 : 140);
    this.face.scaleX = this.facing;
    this.face.scaleY = resting ? 0.64 : 1;
    this.face.y = resting ? 4 : 0;
    this.torso.y = -63 + (moving ? Math.sin(t * 2) * 2 : Math.sin(t / 4) * 0.7);
    this.paws.forEach((p, i) => {
      p.angle = moving ? Math.sin(t + i * Math.PI) * 19 : 0;
      p.y = -23 + (i % 2) * 5 + (resting ? 0 : 0);
    });
    this.tail.angle = reduced
      ? 0
      : ['tail_wag', 'happy', 'play_carrot', 'carry_carrot'].includes(a)
        ? Math.sin(time / 70) * 27
        : Math.sin(time / 450) * 7;
    this.head.y = ['eat', 'drink'].includes(a)
      ? -61 + Math.sin(t * 2) * 4
      : -97 + (moving ? Math.sin(t * 2) * 2 : 0);
    this.head.angle =
      a === 'idle'
        ? Math.sin(t / 10) * 3
        : a === 'sit'
          ? 9
          : a === 'play_carrot'
            ? Math.sin(t) * 10
            : 0;
    this.head.scaleY = a === 'tired' ? 1 + Math.max(0, Math.sin(t / 3)) * 0.08 : 1;
    this.eyes.setTexture(`home-${resting || time % 4100 > 3930 ? 'dogClosed' : 'dogEyes'}`);
    this.shadow.scaleX = resting ? 1.1 : 1;
    this.setDepth(this.y);
  }
}
export class HumanActor extends Phaser.GameObjects.Container {
  animation: HumanAnimation = 'idle';
  private legs: Phaser.GameObjects.Image[];
  private arms: Phaser.GameObjects.Image[];
  private head: Phaser.GameObjects.Container;
  private eyes: Phaser.GameObjects.Image;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.legs = [-22, 20].map((px) => part(scene, 'boyLeg', px, -37).setOrigin(0.5, 0));
    this.arms = [-39, 39].map((px) => part(scene, 'boyArm', px, -120).setOrigin(0.5, 0.1));
    this.eyes = part(scene, 'boyEyes', 0, 0);
    this.head = scene.add.container(0, -166, [part(scene, 'boyHead', 0, 0), this.eyes]);
    this.add([
      scene.add.ellipse(0, 2, 95, 18, 0x6f674e, 0.14),
      ...this.legs,
      ...this.arms,
      part(scene, 'boyBody', 0, -86),
      this.head,
    ]);
    this.setSize(120, 240).setInteractive(
      new Phaser.Geom.Rectangle(0, -110, 120, 245),
      Phaser.Geom.Rectangle.Contains,
    );
  }
  animate(a: HumanAnimation) {
    this.animation = a;
  }
  hand() {
    return { x: this.x + 43 * this.scaleX, y: this.y - 98 * this.scaleY };
  }
  tick(time: number, reduced: boolean) {
    const t = reduced ? 0 : time / 140,
      a = this.animation;
    this.legs.forEach((p, i) => (p.angle = a === 'walk' ? Math.sin(t + i * Math.PI) * 17 : 0));
    this.arms[0].angle = a === 'walk' ? -Math.sin(t) * 18 : a === 'thinking' ? -35 : 0;
    this.arms[1].angle =
      a === 'waving'
        ? -145 + Math.sin(t * 1.7) * 15
        : a === 'holding'
          ? -65
          : a === 'playing_blocks'
            ? -45
            : a === 'walk'
              ? Math.sin(t) * 18
              : 0;
    this.head.y = -166 + (a === 'walk' ? Math.sin(t * 2) * 2 : a === 'happy' ? Math.sin(t) * 2 : 0);
    this.head.angle = a === 'sad' ? 7 : a === 'thinking' ? -6 : 0;
    this.head.scaleY = a === 'surprised' ? 1.06 : 1;
    this.eyes.setTexture(
      `home-${['happy', 'waving', 'holding'].includes(a) ? 'boyHappy' : 'boyEyes'}`,
    );
    this.setDepth(this.y);
  }
}

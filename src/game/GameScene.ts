import Phaser from 'phaser';
import { characterSvg, svgUrl } from './art';
import { playRoomSvg } from './playArt';
import type { Session } from '../engine/types';
import type { SceneState } from './playState';
export class GameScene extends Phaser.Scene {
  private actors: Phaser.GameObjects.Image[] = [];
  private background?: Phaser.GameObjects.Image;
  private state: SceneState;
  private lastReaction = -1;
  private lastTouch = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(
    private session: Session,
    private onTouch: (target: string) => void,
    initial: SceneState,
    private onReady: () => void,
  ) {
    super('day');
    this.state = initial;
  }
  preload() {
    this.load.svg('room', svgUrl(playRoomSvg(this.session.episode.place === 'school')));
    for (const name of ['jiyul', 'jini', 'hauri'] as const)
      for (const mood of ['neutral', 'happy', 'sad', 'thinking', 'surprised'] as const) {
        this.load.svg(`${name}-${mood}`, svgUrl(characterSvg(name, mood)));
        this.load.svg(`${name}-${mood}-blink`, svgUrl(characterSvg(name, mood, true)));
      }
  }
  create() {
    this.background = this.add.image(0, 0, 'room').setOrigin(0);
    this.actors = [
      this.add.image(0, 0, 'jiyul-neutral'),
      this.add.image(0, 0, `${this.session.episode.character}-${this.state.mood}`),
    ];
    this.actors.forEach((actor, index) => {
      actor
        .setOrigin(0.5, 0.9)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.onTouch(index ? 'friend' : 'jiyul');
          if (!this.reduced)
            this.tweens.add({ targets: actor, angle: 3, duration: 130, yoyo: true, repeat: 1 });
        });
    });
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.time.addEvent({ delay: 3100, loop: true, callback: () => this.blink() });
    this.time.addEvent({ delay: 2700, loop: true, callback: () => this.showNeed() });
    this.apply(this.state);
    this.onReady();
  }
  private layout() {
    if (!this.background) return;
    this.tweens.killTweensOf(this.actors);
    const { width: w, height: h } = this.scale;
    this.background.setDisplaySize(w, h);
    this.actors.forEach((actor, i) => {
      const mainHeight = Math.min(w * 0.4, h * 0.33);
      const height =
        i && this.session.episode.character === 'hauri'
          ? mainHeight * 0.92
          : i
            ? Math.min(w * 0.49, h * 0.33)
            : mainHeight;
      actor
        .setDisplaySize(height * 0.8, height)
        .setPosition(w * (i ? 0.64 : 0.19), h * 0.66)
        .setAngle(0);
    });
    this.game.canvas.dataset.actorHeights = JSON.stringify(
      this.actors.map((actor) => actor.displayHeight),
    );
    if (this.state.reaction && (this.state.phase === 'response' || this.state.phase === 'complete'))
      this.respond();
  }
  apply(state: SceneState) {
    this.state = state;
    if (!this.actors.length) return;
    this.actors[1].setTexture(`${this.session.episode.character}-${state.mood}`);
    this.actors[0].setTexture(`jiyul-${state.mood === 'happy' ? 'happy' : 'thinking'}`);
    if (state.reaction && state.reaction.id !== this.lastReaction) {
      this.lastReaction = state.reaction.id;
      this.respond();
    }
    if (state.phase === 'observe') {
      this.tweens.killTweensOf(this.actors);
      this.layout();
      this.showNeed();
    }
    if (state.touchCount !== this.lastTouch) {
      this.lastTouch = state.touchCount;
      if (!this.reduced && !state.paused && ['observe', 'choose'].includes(state.phase)) {
        this.tweens.killTweensOf(this.actors[1]);
        this.tweens.add({
          targets: this.actors[1],
          angle: -5,
          y: this.scale.height * 0.64,
          duration: 160,
          yoyo: true,
          repeat: 1,
        });
      }
    }
  }
  private blink() {
    if (this.state.paused) return;
    for (const actor of this.actors) {
      const key = actor.texture.key.replace('-blink', '');
      actor.setTexture(`${key}-blink`);
      this.time.delayedCall(140, () => {
        if (actor.active && actor.texture.key === `${key}-blink`) actor.setTexture(key);
      });
    }
  }
  private showNeed() {
    if (this.reduced || this.state.paused || !['observe', 'choose'].includes(this.state.phase))
      return;
    const friend = this.actors[1];
    if (!friend || this.tweens.isTweening(friend)) return;
    const state = this.session.variation.state;
    const { width: w, height: h } = this.scale;
    if (this.session.episode.id === 'jini-needs') {
      const x = state === 'hungry' ? w * 0.54 : state === 'thirsty' ? w * 0.68 : w * 0.77;
      this.tweens.add({
        targets: friend,
        x,
        y: h * (state === 'walk' ? 0.6 : 0.675),
        angle: state === 'walk' ? 7 : -8,
        duration: 650,
        yoyo: true,
        hold: 350,
        ease: 'Sine.easeInOut',
      });
    } else
      this.tweens.add({
        targets: friend,
        angle: state === 'rest' ? -3 : 3,
        y: friend.y - 5,
        duration: 700,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
  }
  private respond() {
    const reaction = this.state.reaction;
    if (!reaction || !this.actors.length) return;
    this.tweens.killTweensOf(this.actors);
    const { width: w, height: h } = this.scale;
    const friend = this.actors[1];
    const main = this.actors[0];
    const duration = this.reduced ? 0 : 600;
    const action = reaction.actionId;
    if (this.session.episode.id === 'jini-needs' && reaction.complete) {
      if (action === 'walk') {
        this.tweens.add({ targets: friend, x: w * 0.78, y: h * 0.59, angle: 0, duration });
        this.tweens.add({ targets: main, x: w * 0.59, y: h * 0.62, angle: 0, duration });
      } else {
        this.tweens.add({
          targets: friend,
          x: w * (action === 'food' ? 0.54 : 0.7),
          y: h * 0.7,
          angle: -9,
          duration,
          onComplete: () => {
            if (!this.reduced)
              this.tweens.add({ targets: friend, angle: -3, duration: 260, yoyo: true, repeat: 5 });
          },
        });
      }
    } else if (action === 'respect' && reaction.complete) {
      this.tweens.add({ targets: main, x: w * 0.18, duration });
      this.tweens.add({ targets: friend, y: h * 0.69, angle: -3, duration });
    } else if (reaction.complete) {
      this.tweens.add({
        targets: [main, friend],
        y: h * 0.63,
        angle: 0,
        duration: duration / 2,
        yoyo: !this.reduced,
        repeat: this.reduced ? 0 : 1,
      });
    } else if (!this.reduced) {
      this.tweens.add({ targets: friend, angle: 5, duration: 300, yoyo: true, repeat: 1 });
    }
  }
}

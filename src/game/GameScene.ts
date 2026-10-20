import Phaser from 'phaser';
import { characterSvg, roomSvg, svgUrl } from './art';
import type { Mood, Session } from '../engine/types';
export class GameScene extends Phaser.Scene {
  private actors: Phaser.GameObjects.Image[]=[];
  private ready=false;
  constructor(private session:Session, private onTouch:(target:string)=>void) {super('day');}
  preload() {
    this.load.svg('room',svgUrl(roomSvg(this.session.episode.place==='school')));
    for(const name of ['jiyul','jini','hauri'] as const) for(const mood of ['neutral','happy','sad','thinking','surprised'] as const) {
      this.load.svg(`${name}-${mood}`,svgUrl(characterSvg(name,mood)));
      this.load.svg(`${name}-${mood}-blink`,svgUrl(characterSvg(name,mood,true)));
    }
  }
  create() {
    this.add.image(360,250,'room');
    const {episode,variation}=this.session;
    this.addProps();
    const main=this.add.image(295,302,'jiyul-neutral').setDisplaySize(147,184);
    const friend=this.add.image(466,302,`${episode.character}-${variation.mood}`).setDisplaySize(158,198);
    this.actors=[main,friend];
    for (const [index,actor] of this.actors.entries()) {
      actor.setInteractive({useHandCursor:true}).on('pointerdown',()=>{this.onTouch(index===1?'friend':'jiyul');this.tweens.add({targets:actor,y:actor.y-9,duration:160,yoyo:true});});
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches) this.tweens.add({targets:actor,angle:index?1.2:-1.2,duration:1900,yoyo:true,repeat:-1});
    }
    this.time.addEvent({delay:3200,loop:true,callback:()=>{
      for(const actor of this.actors){const key=actor.texture.key.replace('-blink',''); actor.setTexture(`${key}-blink`);this.time.delayedCall(140,()=>actor.active&&actor.setTexture(key));}
    }});
    this.ready=true;
  }
  setMood(mood:Mood) {if(this.ready){this.actors[1].setTexture(`${this.session.episode.character}-${mood}`);this.actors[0].setTexture(`jiyul-${mood==='happy'?'happy':'thinking'}`);}}
  private addProps() {
    const {episode,variation:v}=this.session;
    const g=this.add.graphics();
    const hotspot=(x:number,y:number,w:number,h:number,id:string)=>this.add.zone(x,y,w,h).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.onTouch(id));
    if(episode.id==='jini-needs') {
      g.fillStyle(0xc78163).fillEllipse(413,414,67,27);g.fillStyle(0xf4ead4).fillEllipse(413,406,62,18);
      g.fillStyle(0x7baeb8).fillEllipse(505,414,59,24);g.fillStyle(0xe4eeee).fillEllipse(505,407,54,16);
      hotspot(413,410,85,80,'bowl');hotspot(505,410,85,80,'water');
      if(v.state==='walk'){g.lineStyle(8,0xb88c60).strokeCircle(564,357,15).lineBetween(576,368,601,400);hotspot(580,375,90,90,'leash');}
    }
    if(episode.id==='jini-ball') {
      g.fillStyle(0xc3976a).fillRoundedRect(533,351,70,59,6);g.lineStyle(3,0xa77b53).lineBetween(568,351,568,408);
      const coords:Record<string,number[]>={sofa:[143,347],box:[607,383],room:[620,308]};const [x,y]=coords[v.id];
      g.fillStyle(0xdc785d).fillCircle(x,y,14);g.lineStyle(3,0xffe4ad).strokeCircle(x,y,9);
      hotspot(143,340,150,82,'sofa');hotspot(570,380,110,92,'box');hotspot(620,272,100,140,'door');
    }
    if(episode.place==='school') {
      const blocks=v.id==='tower'?[[376,412],[408,424],[350,430]]:v.id==='shortage'?[[380,418]]:[[355,418],[384,418],[370,389],[413,430]];
      blocks.forEach(([x,y],i)=>{g.fillStyle([0xdca16a,0x8eaaa8,0xe5bf63][i%3]).fillRoundedRect(x,y,26,26,3);});
      if(v.id==='rest'){g.fillStyle(0xb9b5cc).fillEllipse(480,405,116,33);}
      if(v.id==='toy'){g.fillStyle(0xba9873).fillRoundedRect(550,365,65,44,7);g.lineStyle(3,0xf1d9b4).strokeRect(556,370,53,31);}
      if(v.id==='lost'){g.fillStyle(0xe9d5ad).fillRoundedRect(535,382,95,50,5);g.lineStyle(3,0xb6a080).strokeRect(545,390,74,33);}
      hotspot(385,418,115,85,'blocks');
    }
  }
}

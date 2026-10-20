export interface SpeechProvider { speak(text:string,rate:number,audioUrl?:string): Promise<boolean>; stop():void; }
export class BrowserSpeechProvider implements SpeechProvider {
  private audio?:HTMLAudioElement;
  private finish?: (ok:boolean)=>void;
  stop() { this.finish?.(false); this.finish=undefined; this.audio?.pause(); if('speechSynthesis' in globalThis) speechSynthesis.cancel(); }
  async speak(text:string,rate:number,audioUrl?:string):Promise<boolean> {
    this.stop();
    if(audioUrl) { try { this.audio=new Audio(audioUrl); this.audio.playbackRate=rate; await this.audio.play(); return true; } catch { /* 녹음 재생 실패 시 기기 음성을 사용해요. */ } }
    try {
      if(!('speechSynthesis' in globalThis)) return false;
      const voices=speechSynthesis.getVoices();
      const voice=voices.find(v=>v.lang.startsWith('ko') && v.localService);
      if(!voice) return false;
      return await new Promise<boolean>(resolve=>{
        const utterance=new SpeechSynthesisUtterance(text); utterance.lang='ko-KR';utterance.voice=voice;utterance.rate=rate;
        const timer=setTimeout(()=>done(false),20000);
        const done=(ok:boolean)=>{clearTimeout(timer);this.finish=undefined;resolve(ok);};
        this.finish=done;utterance.onend=()=>done(true);utterance.onerror=()=>done(false);speechSynthesis.speak(utterance);
      });
    } catch { return false; }
  }
}

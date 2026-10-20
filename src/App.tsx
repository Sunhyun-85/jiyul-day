import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ParentSettings } from './components/ParentSettings';
const GameCanvas=lazy(()=>import('./components/GameCanvas').then(module=>({default:module.GameCanvas}))); 
import { ScenarioEngine, episodes } from './engine/ScenarioEngine';
import { DialogueEngine, type Phase } from './engine/DialogueEngine';
import { loadSettings, saveSettings, storage } from './engine/ProgressStorage';
import { BrowserSpeechProvider } from './engine/SpeechProvider';
import type { Choice, Mood, Place, Session, Settings } from './engine/types';
import { characterSvg, placeSvg, svgUrl } from './game/art';
const engine=new ScenarioEngine();const speech=new BrowserSpeechProvider();
export default function App() {
 const [page,setPage]=useState<'home'|'places'|'episodes'|'game'>('home');const [place,setPlace]=useState<Place>('home');const [parent,setParent]=useState(false);const [settings,setSettings]=useState(loadSettings);
 const [session,setSession]=useState<Session>();const dialogue=useRef<DialogueEngine|undefined>(undefined);const [phase,setPhase]=useState<Phase>('observe');const [touched,setTouched]=useState(false);const [text,setText]=useState('');const [choices,setChoices]=useState<Choice[]>([]);const [mood,setMood]=useState<Mood>('neutral');const [hintUsed,setHintUsed]=useState(false);const [spoken,setSpoken]=useState(false);const [voiceFailed,setVoiceFailed]=useState(false);const [storageError,setStorageError]=useState('');const [busy,setBusy]=useState(false);const [update,setUpdate]=useState<ServiceWorker>();
 const shownAt=useRef(0);const lock=useRef(false);const speechToken=useRef(0);const memoryHistory=useRef<Record<string,string[]>>({});
 useEffect(()=>{const listener=(event:Event)=>setUpdate((event as CustomEvent<ServiceWorker>).detail);window.addEventListener('game-update',listener);return()=>window.removeEventListener('game-update',listener);},[]);
 const say=useCallback((line:string)=>{const token=++speechToken.current;setVoiceFailed(false);if(settings.voice)void speech.speak(line,settings.speed==='slow'?.8:1).then(ok=>{if(token===speechToken.current)setVoiceFailed(!ok);});},[settings.voice,settings.speed]);
 useEffect(()=>{speechToken.current++;speech.stop();},[settings.voice,settings.speed,parent]);
 const changeSettings=(next:Settings)=>{setSettings(next);try{saveSettings(next);}catch{setStorageError('설정을 저장할 수 없어요. 이번 놀이에는 적용됩니다.');}};
 const reveal=useCallback(()=>{if(!session||dialogue.current?.phase!=='observe')return;dialogue.current.reveal();setChoices(engine.variation.choices(session.variation.actions,settings.choices,session.episode.id));shownAt.current=performance.now();setPhase('choose');},[session,settings.choices]);
 useEffect(()=>{if(page!=='game'||!touched||phase!=='observe'||parent)return;const timer=setTimeout(reveal,settings.wait*1000);return()=>clearTimeout(timer);},[page,touched,phase,settings.wait,reveal,parent]);
 useEffect(()=>{if(session&&phase==='choose'){setChoices(engine.variation.choices(session.variation.actions,settings.choices,session.episode.id));shownAt.current=performance.now();}},[settings.choices]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page]);
 const start=async(id:string)=>{
  if(lock.current)return;lock.current=true;setBusy(true);speech.stop();
  try {const episode=episodes.find(e=>e.id===id)!;let history=memoryHistory.current[id]??[];try{history=await storage.history(id);}catch{setStorageError('기록 저장을 사용할 수 없어요. 이번에는 저장 없이 놀 수 있어요.');}
   const next=engine.start(episode,history);memoryHistory.current[id]=[...history,next.variation.id];
   try{await storage.visit(next.id,id,next.variation.id);}catch{setStorageError('기록 저장을 사용할 수 없어요. 이번에는 저장 없이 놀 수 있어요.');}
   dialogue.current=new DialogueEngine(next,engine.variation);setSession(next);setPhase('observe');setTouched(false);setHintUsed(false);setSpoken(false);setMood(next.variation.mood);setText(engine.variation.line(`${id}:${next.variation.id}:intro`,next.variation.lines));setChoices([]);setPage('game');setVoiceFailed(false);
  }finally{setBusy(false);lock.current=false;}
 };
 const touch=(target:string)=>{
  if(!session||parent||phase==='complete')return;
  if(!touched){setTouched(true);say(text);return;}
  if(target!=='friend'&&target!=='jiyul'){setText(session.variation.clue);say(session.variation.clue);}else say(text);
 };
 const select=(choice:Choice)=>{
  if(lock.current||!session||dialogue.current?.phase!=='choose')return;
  lock.current=true;const result=dialogue.current.select(choice);setText(result.text);setMood(result.mood);setPhase('response');say(result.text);
  void storage.add({id:crypto.randomUUID(),date:new Date().toISOString(),sessionId:session.id,episodeId:session.episode.id,variationId:session.variation.id,actionId:choice.id,intent:choice.intent,order:choices.map(c=>c.id),responseMs:Math.max(0,Math.round(performance.now()-shownAt.current)),hintUsed,spoken,repeatCount:session.repeatCount,completed:choice.complete}).catch(()=>setStorageError('이번 선택을 저장하지 못했어요. 놀이는 계속할 수 있어요.')).finally(()=>{lock.current=false;});
 };
 const next=()=>{const p=dialogue.current?.next();if(!p)return;setPhase(p);setHintUsed(false);setSpoken(false);if(p==='complete'){speech.stop();setMood('happy');}else{setText('친구의 말을 들었어요. 이제 어떻게 해 볼까요?');setChoices([]);}};
 const leave=(target:typeof page)=>{speechToken.current++;speech.stop();setPage(target);setSession(undefined);dialogue.current=undefined;lock.current=false;};
 const friend=session?.episode.character==='jini'?'지니':'하우리';
 return <div className="app-shell"><header className="app-header" inert={parent}><button className="brand" onClick={()=>leave('home')} aria-label="처음으로"><span className="brand-mark">☀</span><span>지율이의 하루<small>함께 자라는 작은 모험</small></span></button><button className="parent-link" onClick={()=>setParent(true)}><span aria-hidden="true">⚙</span><span>부모님</span></button></header>
 <main inert={parent}>
 {page==='home'&&<>
 <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> 오늘도, 즐거운 하루!</div><h1>작은 마음들이 만나<br/><em>신나는 하루</em>가 돼요</h1><p>지율이와 지니, 하우리의 이야기 속으로.<br/>천천히 살펴보고, 함께 이야기해요.</p><button className="primary start-button" onClick={()=>{setPage('places');say('오늘은 어디에서 놀까요?');}}>함께 놀러 가기 <span>↗</span></button><div className="hero-note"><span>♡</span> 정답을 서두르지 않는, 우리만의 놀이</div></div>
 <div className="hero-art" aria-label="지율이, 강아지 지니, 친구 하우리가 함께 웃는 그림" role="img"><span className="sun-doodle">☀</span><span className="cloud cloud-one"/><span className="cloud cloud-two"/><span className="hero-speech">우리 같이 놀까?</span><div className="art-hill"/><img className="hero-boy" src={svgUrl(characterSvg('jiyul','happy'))} alt=""/><img className="hero-dog" src={svgUrl(characterSvg('jini','happy'))} alt=""/><img className="hero-friend" src={svgUrl(characterSvg('hauri','happy'))} alt=""/><span className="flower flower-one">✿</span><span className="flower flower-two">✿</span><span className="art-tag">지율이와 친구들</span></div></section>
 <section className="world-section"><div className="section-heading"><div><div className="eyebrow">우리의 작은 세상</div><h2>어디에서 놀아 볼까요?</h2></div><span className="tiny-label">두 곳의 따뜻한 이야기</span></div><div className="place-grid">{(['home','school'] as const).map((p,i)=><button key={p} className="place-card" onClick={()=>{setPlace(p);setPage('episodes');say(p==='home'?'지니가 기다리는 우리 집이에요.':'하우리와 함께 유치원에서 놀아요.');}}><img src={svgUrl(placeSvg(p==='school'))} alt=""/><div className="place-card-info"><div><span className="place-label">{i?'친구와 사이좋게':'지니와 오순도순'}</span><h3>{i?'유치원':'우리 집'}</h3><p>{i?'블록을 쌓고, 마음을 나눠요.':'작은 신호에 귀 기울여요.'}</p></div><span className="round-arrow">↗</span></div></button>)}</div></section>
 <section className="together-note"><span className="note-icon">🌱</span><div><h3>아이의 속도로, 함께해 주세요</h3><p>잠깐 기다리는 시간도 놀이예요. 말하지 않아도 괜찮아요.</p></div><span className="note-heart">♡</span></section>
 </>}
 {page==='places'&&<section className="selection-page"><div className="eyebrow">오늘의 작은 모험</div><h1>어디에서 놀까요?</h1><p>마음에 드는 곳을 톡 눌러요.</p><div className="place-grid">{(['home','school'] as const).map(p=><button key={p} className="place-card" onClick={()=>{setPlace(p);setPage('episodes');say(p==='home'?'지니를 만나러 가요.':'하우리를 만나러 가요.');}}><img src={svgUrl(placeSvg(p==='school'))} alt=""/><div className="place-card-info"><h2>{p==='home'?'우리 집':'유치원'}</h2><span className="round-arrow">↗</span></div></button>)}</div><p className="future-note">🌳 놀이터와 게임방 이야기는 다음에 만나요.</p></section>}
 {page==='episodes'&&<section className="selection-page"><button className="text-button" onClick={()=>setPage('places')}>← 장소 고르기</button><div className="eyebrow">{place==='home'?'지니와 함께하는':'하우리와 함께하는'} 시간</div><h1>{place==='home'?'우리 집':'유치원'}에 왔어요!</h1><p>어떤 이야기를 만나 볼까요?</p><div className="episode-grid">{episodes.filter(e=>e.place===place).map((e,i)=><button disabled={busy} className="episode-card" key={e.id} onClick={()=>void start(e.id)}><div className={`episode-illustration episode-${i}`}><img src={svgUrl(characterSvg(e.character,i===0?'happy':'thinking'))} alt=""/><span>{e.icon}</span></div><div className="episode-content"><small>이야기 {String(i+1).padStart(2,'0')}</small><h2>{e.title}</h2><p>{e.subtitle}</p><span className="episode-play">이야기 시작 <span>▶</span></span></div></button>)}</div>{busy&&<p role="status">친구를 만나러 가는 중이에요…</p>}</section>}
 {page==='game'&&session&&<section className="play-page"><div className="play-header"><button className="icon-button" aria-label="이야기 고르기로 돌아가기" onClick={()=>leave('episodes')}>←</button><div><span className="eyebrow">{session.episode.place==='home'?'우리 집':'유치원'}의 작은 이야기</span><h1>{session.episode.title}</h1></div><button className="icon-button" aria-label={settings.voice?'음성 끄기':'음성 켜기'} onClick={()=>changeSettings({...settings,voice:!settings.voice})}>{settings.voice?'♫':'♩'}</button></div>
 <Suspense fallback={<div className="scene-frame loading-scene" role="status">친구들이 놀이를 준비하고 있어요…</div>}><GameCanvas session={session} mood={mood} onTouch={touch}/></Suspense>
 {phase==='complete'?<div className="completion"><span className="completion-flower">✿</span><div className="eyebrow">함께해서 즐거웠어!</div><h2>마음을 나눈 하루</h2><p>친구의 모습을 살펴보고<br/>서로의 마음을 알아보았어요.</p><button className="primary" onClick={()=>leave('episodes')}>다른 이야기 만나기 <span>→</span></button><button className="text-button" onClick={()=>leave('home')}>오늘 놀이는 여기까지</button></div>:<div className="dialogue-area"><div className="dialogue-card" aria-live="polite"><div className="dialogue-speaker"><span className="speaker-dot"/>{session.episode.character==='jini'?'지니의 이야기':friend}<button aria-label="대사 다시 듣기" className="replay" onClick={()=>say(text)}>♫ <span>다시 듣기</span></button></div><p>{text}</p>{voiceFailed&&<small className="voice-note">기기 음성이 준비되지 않았어요. 글과 그림으로 함께해 주세요.</small>}</div>
 {!touched?<button className="touch-prompt" onClick={()=>touch('friend')}>☝ {friend}를 톡 눌러 볼까요?</button>:<>
 {phase==='observe'&&<div className="observation-area"><p>👀 천천히 살펴보고 이야기해요.</p><button className="text-button" onClick={reveal}>선택지 보기 →</button></div>}
 {phase==='choose'&&<div className="choices">{choices.map(choice=><div className="choice-row" key={choice.id}><button className="choice-button" data-action={choice.id} onClick={()=>select(choice)}><span className="choice-icon">{choice.icon}</span><span>{choice.label}</span><span className="choice-arrow">›</span></button>{settings.voice&&<button className="choice-audio" aria-label={`${choice.label} 듣기`} onClick={()=>say(choice.label)}>♫</button>}</div>)}</div>}
 {phase==='response'&&<button className="primary continue-button" onClick={next}>이야기 이어가기 <span>→</span></button>}
 <div className="play-tools">{settings.hints&&phase!=='response'&&<button className="text-button" onClick={()=>{setHintUsed(true);setText(session.variation.hint);say(session.variation.hint);}}>☀ 함께 살펴보기</button>}{settings.parentMode&&phase!=='response'&&<button className={`text-button ${spoken?'observed':''}`} onClick={()=>setSpoken(true)}>{spoken?'✓ 발화를 기록할게요':'♡ 말했어요'}</button>}</div>
 </>}
 </div>}
 </section>}
 </main>
 <footer inert={parent}><span className="footer-brand">☀ 지율이의 신나는 하루</span><span>작은 발견, 따뜻한 마음, 함께하는 놀이</span><small>부모와 함께하는 놀이 보조 게임 · 광고와 개인정보 수집이 없어요</small></footer>
 {storageError&&<div className="storage-notice" role="status">{storageError}<button aria-label="안내 닫기" onClick={()=>setStorageError('')}>✕</button></div>}
 {update&&page!=='game'&&<div className="update-notice">새 이야기가 준비됐어요.<button onClick={()=>{update.postMessage({type:'SKIP_WAITING'});}}>새 버전 열기</button></div>}
 {parent&&<ParentSettings settings={settings} onChange={changeSettings} onClose={()=>setParent(false)}/>}
 </div>;
}

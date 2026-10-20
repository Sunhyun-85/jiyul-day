import { useEffect, useState } from 'react';
import { episodes } from '../engine/ScenarioEngine';
import { storage } from '../engine/ProgressStorage';
import type { PlayRecord, Settings } from '../engine/types';
export function ParentSettings({settings,onChange,onClose}:{settings:Settings;onChange:(s:Settings)=>void;onClose:()=>void}) {
 const [code]=useState(()=>String(Math.floor(1000+Math.random()*9000)));const [answer,setAnswer]=useState('');const [unlocked,setUnlocked]=useState(false);const [error,setError]=useState('');const [records,setRecords]=useState<PlayRecord[]>([]);
 useEffect(()=>{if(unlocked)storage.recent().then(setRecords).catch(()=>setError('이 기기에서 기록을 불러올 수 없어요.'));},[unlocked]);
 const update=<K extends keyof Settings>(key:K,value:Settings[K])=>onChange({...settings,[key]:value});
 const recent=records.slice(0,5);const counts=recent.reduce<Record<string,number>>((all,r)=>({...all,[r.intent]:(all[r.intent]??0)+1}),{});const common=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
 return <div className="modal-shade" onKeyDown={e=>{if(e.key==='Escape')onClose();}}><section className="parent-panel" role="dialog" aria-modal="true" aria-labelledby="parent-title"><header className="flex items-center justify-between gap-3"><h2 id="parent-title">부모님 공간</h2><button className="icon-button" aria-label="부모 설정 닫기" onClick={onClose}>✕</button></header>
 {!unlocked?<form onSubmit={e=>{e.preventDefault();if(answer===code){setUnlocked(true);setError('');}else setError('숫자를 다시 확인해 주세요.');}}><p>어른이 아래 숫자를 입력해 주세요.</p><div className="gate-code">{code}</div><label>확인 숫자<input autoFocus inputMode="numeric" maxLength={4} value={answer} onChange={e=>setAnswer(e.target.value)} aria-label="확인 숫자"/></label><p className="small">실수로 들어오는 것을 줄이는 장치이며 보안 인증은 아닙니다.</p><button className="primary w-full" type="submit">설정 열기</button></form>:<>
 <p className="small">아이의 속도에 맞춰 주세요. 설정은 바로 반영됩니다.</p>
 <div className="setting-row"><label htmlFor="choices">선택지 개수</label><select id="choices" value={settings.choices} onChange={e=>update('choices',Number(e.target.value) as Settings['choices'])}>{[2,3,4].map(n=><option key={n} value={n}>{n}개</option>)}</select></div>
 <div className="setting-row"><label htmlFor="speed">대화 속도</label><select id="speed" value={settings.speed} onChange={e=>update('speed',e.target.value as Settings['speed'])}><option value="slow">느림</option><option value="normal">보통</option></select></div>
 <div className="setting-row"><label htmlFor="wait">선택지 기다리기</label><select id="wait" value={settings.wait} onChange={e=>update('wait',Number(e.target.value) as Settings['wait'])}><option value="0">바로 표시</option><option value="4">4초</option><option value="8">8초</option></select></div>
 {(['hints','voice','parentMode'] as const).map((key,i)=><label className="setting-row" key={key}>{['힌트 사용','음성 사용','부모 발화 확인 버튼'][i]}<input type="checkbox" checked={settings[key]} onChange={e=>update(key,e.target.checked)}/></label>)}
 <h3 className="mt-7">함께한 놀이 기록</h3><p className="small">이 기기에만 저장됩니다. 발달 평가나 진단이 아닌, 함께 놀이를 돌아보기 위한 기록입니다.</p>
 {common&&<p className="observation">최근 {recent.length}회 선택 중 같은 의도의 행동을 {common[1]}회 선택했습니다.</p>}
 {!records.length&&<p className="empty-record">아직 기록이 없어요. 첫 이야기를 만나 볼까요?</p>}
 <div className="record-list">{records.map(r=>{const episode=episodes.find(e=>e.id===r.episodeId);const variation=episode?.variations.find(v=>v.id===r.variationId);const action=variation?.actions.find(a=>a.id===r.actionId);return <article key={r.id}><strong>{episode?.title??r.episodeId}</strong><span>{new Date(r.date).toLocaleString('ko-KR')}</span><p>{variation?.clue??r.variationId}</p><p>{action?.lines[0]??r.actionId} · {(r.responseMs/1000).toFixed(1)}초</p><small>힌트 {r.hintUsed?'사용':'미사용'} · 발화 {r.spoken?'부모가 관찰함':'확인 기록 없음'} · {r.repeatCount}번째 놀이 · {r.completed?'마무리 행동':'대화 중'}</small><details><summary>표시 순서 보기</summary>{r.order.map(id=>variation?.actions.find(a=>a.id===id)?.lines[0]??id).join(' → ')}</details></article>;})}</div>
 </>}{error&&<p role="alert">{error}</p>}</section></div>;
}

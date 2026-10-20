import { createId } from './engine/createId';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ParentSettings } from './components/ParentSettings';
import { GameUI } from './components/GameUI';
import { ScenarioEngine, episodes } from './engine/ScenarioEngine';
import { DialogueEngine, type Phase } from './engine/DialogueEngine';
import { loadSettings, saveSettings, storage } from './engine/ProgressStorage';
import { BrowserSpeechProvider } from './engine/SpeechProvider';
import type { Choice, Mood, Place, Session, Settings } from './engine/types';
import { WorldMap, EpisodeRoom } from './components/WorldMap';
import { SoundEffects } from './engine/SoundEffects';
const engine = new ScenarioEngine();
const speech = new BrowserSpeechProvider();
const effects = new SoundEffects();
export default function App() {
  const [page, setPage] = useState<'home' | 'places' | 'episodes' | 'game'>('home');
  const [place, setPlace] = useState<Place>('home');
  const [parent, setParent] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [session, setSession] = useState<Session>();
  const dialogue = useRef<DialogueEngine | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>('observe');
  const [touched, setTouched] = useState(false);
  const [text, setText] = useState('');
  const [choices, setChoices] = useState<Choice[]>([]);
  const [mood, setMood] = useState<Mood>('neutral');
  const [hintUsed, setHintUsed] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [update, setUpdate] = useState<ServiceWorker>();
  const shownAt = useRef(0);
  const lock = useRef(false);
  const speechToken = useRef(0);
  const memoryHistory = useRef<Record<string, string[]>>({});
  useEffect(() => {
    const listener = (event: Event) => setUpdate((event as CustomEvent<ServiceWorker>).detail);
    window.addEventListener('game-update', listener);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg?.waiting) setUpdate(reg.waiting);
        })
        .catch(() => {});
    }
    return () => window.removeEventListener('game-update', listener);
  }, []);
  const say = useCallback(
    (line: string) => {
      const token = ++speechToken.current;
      setVoiceFailed(false);
      if (settings.voice)
        void speech.speak(line, settings.speed === 'slow' ? 0.8 : 1).then((ok) => {
          if (token === speechToken.current) setVoiceFailed(!ok);
        });
    },
    [settings.voice, settings.speed],
  );
  useEffect(() => {
    speechToken.current++;
    speech.stop();
  }, [settings.voice, settings.speed, parent]);
  const changeSettings = (next: Settings) => {
    setSettings(next);
    try {
      saveSettings(next);
    } catch {
      setStorageError('설정을 저장할 수 없어요. 이번 놀이에는 적용됩니다.');
    }
  };
  const reveal = useCallback(() => {
    if (!session || dialogue.current?.phase !== 'observe') return;
    dialogue.current.reveal();
    setChoices(
      engine.variation.choices(session.variation.actions, settings.choices, session.episode.id),
    );
    shownAt.current = performance.now();
    setPhase('choose');
  }, [session, settings.choices]);
  useEffect(() => {
    if (page !== 'game' || !touched || phase !== 'observe' || parent) return;
    const timer = setTimeout(reveal, settings.wait * 1000);
    return () => clearTimeout(timer);
  }, [page, touched, phase, settings.wait, reveal, parent]);
  useEffect(() => {
    if (session && phase === 'choose') {
      setChoices(
        engine.variation.choices(session.variation.actions, settings.choices, session.episode.id),
      );
      shownAt.current = performance.now();
    }
  }, [settings.choices]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);
  const start = async (id: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    speech.stop();
    if (settings.voice) effects.play('tap');
    try {
      const episode = episodes.find((e) => e.id === id)!;
      let history = memoryHistory.current[id] ?? [];
      try {
        history = await storage.history(id);
      } catch {
        setStorageError('기록 저장을 사용할 수 없어요. 이번에는 저장 없이 놀 수 있어요.');
      }
      const next = engine.start(episode, history);
      memoryHistory.current[id] = [...history, next.variation.id];
      try {
        await storage.visit(next.id, id, next.variation.id);
      } catch {
        setStorageError('기록 저장을 사용할 수 없어요. 이번에는 저장 없이 놀 수 있어요.');
      }
      dialogue.current = new DialogueEngine(next, engine.variation);
      setSession(next);
      setPhase('observe');
      setTouched(false);
      setHintUsed(false);
      setSpoken(false);
      setMood(next.variation.mood);
      setText(engine.variation.line(`${id}:${next.variation.id}:intro`, next.variation.lines));
      setChoices([]);
      setPage('game');
      setVoiceFailed(false);
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const touch = (target: string) => {
    if (!session || parent || phase === 'complete') return;
    if (settings.voice) effects.play('tap');
    if (!touched) {
      setTouched(true);
      say(text);
      return;
    }
    if (target !== 'friend' && target !== 'jiyul') {
      setText(session.variation.clue);
      say(session.variation.clue);
    } else say(text);
  };
  const select = (choice: Choice, input: 'tap' | 'drag' = 'tap') => {
    if (lock.current || !session || dialogue.current?.phase !== 'choose') return false;
    const result = dialogue.current.select(choice);
    setText(result.text);
    setMood(result.mood);
    setPhase('response');
    say(result.text);
    if (settings.voice) effects.play(choice.complete ? 'happy' : 'drop');
    void storage
      .add({
        id: createId(),
        date: new Date().toISOString(),
        sessionId: session.id,
        episodeId: session.episode.id,
        variationId: session.variation.id,
        actionId: choice.id,
        intent: choice.intent,
        input,
        order: choices.map((c) => c.id),
        responseMs: Math.max(0, Math.round(performance.now() - shownAt.current)),
        hintUsed,
        spoken,
        repeatCount: session.repeatCount,
        completed: choice.complete,
      })
      .catch(() => setStorageError('이번 선택을 저장하지 못했어요. 놀이는 계속할 수 있어요.'));
    return true;
  };
  const next = useCallback(() => {
    const p = dialogue.current?.next();
    if (!p) return;
    setPhase(p);
    setHintUsed(false);
    setSpoken(false);
    if (p === 'complete') {
      speech.stop();
      setMood('happy');
    } else {
      setText(session?.variation.clue ?? '천천히 살펴봐요.');
      setChoices([]);
    }
  }, [session]);
  const leave = (target: typeof page) => {
    speechToken.current++;
    speech.stop();
    setPage(target);
    setSession(undefined);
    dialogue.current = undefined;
    lock.current = false;
  };
  const choosePlace = (selected: Place) => {
    setPlace(selected);
    setPage('episodes');
    say(selected === 'home' ? '지니야, 나 왔어!' : '하우리야, 같이 놀자!');
    if (settings.voice) effects.play('tap');
  };
  return (
    <div className="game-app">
      <nav className="game-toolbar" aria-label="게임 메뉴" inert={parent}>
        {page === 'home' || page === 'places' ? (
          <button
            className="round-control"
            aria-label={settings.voice ? '음성 끄기' : '음성 켜기'}
            onClick={() => changeSettings({ ...settings, voice: !settings.voice })}
          >
            {settings.voice ? '♫' : '♩'}
          </button>
        ) : (
          <button
            className="round-control"
            aria-label={page === 'game' ? '이야기 고르기로 돌아가기' : '처음으로'}
            onClick={() => leave(page === 'game' ? 'episodes' : 'home')}
          >
            ←
          </button>
        )}
        {page !== 'home' && page !== 'places' && (
          <span className="location-tag">{place === 'home' ? '우리 집' : '유치원'}</span>
        )}
        <div className="toolbar-right">
          {page === 'game' && (
            <button
              className="round-control"
              aria-label={settings.voice ? '음성 끄기' : '음성 켜기'}
              onClick={() => changeSettings({ ...settings, voice: !settings.voice })}
            >
              {settings.voice ? '♫' : '♩'}
            </button>
          )}
          <button
            className="round-control parent-entry"
            aria-label="부모님"
            onClick={() => setParent(true)}
          >
            ⚙
          </button>
        </div>
      </nav>
      <main className="game-main" inert={parent}>
        {(page === 'home' || page === 'places') && <WorldMap onPlace={choosePlace} />}
        {page === 'episodes' && (
          <EpisodeRoom
            place={place}
            episodes={episodes}
            busy={busy}
            onStart={(id) => void start(id)}
          />
        )}
        {page === 'game' && session && (
          <GameUI
            key={session.id}
            session={session}
            phase={phase}
            mood={mood}
            settings={settings}
            text={text}
            touched={touched}
            voiceFailed={voiceFailed}
            spoken={spoken}
            choices={choices}
            paused={parent}
            touch={touch}
            leave={leave}
            say={say}
            reveal={reveal}
            select={select}
            next={next}
            onHint={() => {
              setHintUsed(true);
              setText(session.variation.hint);
              say(session.variation.hint);
            }}
            onSpoken={() => setSpoken(true)}
            onAgain={() => void start(session.episode.id)}
          />
        )}
      </main>
      {storageError && (
        <div className="storage-notice" role="status">
          {storageError}
          <button aria-label="안내 닫기" onClick={() => setStorageError('')}>
            ✕
          </button>
        </div>
      )}
      {update && page !== 'game' && (
        <div className="update-notice">
          새 이야기가 준비됐어요.
          <button
            onClick={() => {
              update.postMessage({ type: 'SKIP_WAITING' });
            }}
          >
            새 버전 열기
          </button>
        </div>
      )}
      {parent && (
        <ParentSettings
          settings={settings}
          onChange={changeSettings}
          onClose={() => setParent(false)}
        />
      )}
    </div>
  );
}

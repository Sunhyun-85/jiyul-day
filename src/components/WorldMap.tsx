import { useEffect, useRef, useState } from 'react';
import type { Episode, Place } from '../engine/types';
import { characterSvg, svgUrl } from '../game/art';
import { mapSvg, playRoomSvg, toySvg, buildingSvg } from '../game/playArt';
export function WorldMap({
  onPlace,
  paused,
  onTitle,
}: {
  onPlace: (place: Place) => void;
  paused: boolean;
  onTitle: () => void;
}) {
  const actor = useRef<HTMLImageElement>(null);
  const travel = useRef<Animation | null>(null);
  const [destination, setDestination] = useState<Place>();
  const latest = useRef(onPlace);
  latest.current = onPlace;
  useEffect(() => () => travel.current?.cancel(), []);
  useEffect(() => {
    if (paused) travel.current?.pause();
    else travel.current?.play();
  }, [paused]);
  const walk = (place: Place, button: HTMLButtonElement) => {
    if (destination || paused || !actor.current) return;
    setDestination(place);
    const from = actor.current.getBoundingClientRect();
    const to = button.getBoundingClientRect();
    const dx = to.x + to.width * 0.5 - (from.x + from.width * 0.5);
    const dy = to.y + to.height * 0.82 - from.bottom;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const steps = Array.from({ length: 13 }, (_, i) => ({
      transform: `translate(${(dx * i) / 12}px, ${(dy * i) / 12 - (reduced ? 0 : (i % 2) * 5)}px) rotate(${reduced ? 0 : i % 2 ? 3 : -3}deg) scale(${1 - (0.18 * i) / 12})`,
    }));
    travel.current = actor.current.animate(steps, {
      duration: reduced ? 250 : 1700,
      fill: 'forwards',
      easing: 'ease-in-out',
    });
    travel.current.onfinish = () => latest.current(place);
  };
  return (
    <section className="world-map" aria-label="놀이 지도">
      <img className="world-backdrop" src={svgUrl(mapSvg())} alt="" />
      <h1 className="map-title">
        <button className="map-title-voice" aria-label="제목 음성 듣기" onClick={onTitle}>
          <span>지율이의</span>신나는 하루
        </button>
      </h1>
      <button
        className="map-place map-school"
        aria-label="유치원"
        disabled={!!destination}
        onClick={(e) => walk('school', e.currentTarget)}
      >
        <img src={svgUrl(buildingSvg(true))} alt="" />
        <span className="wood-sign">유치원</span>
        <img className="map-friend" src={svgUrl(characterSvg('hauri', 'happy'))} alt="" />
      </button>
      <button
        className="map-place map-home"
        aria-label="우리 집"
        disabled={!!destination}
        onClick={(e) => walk('home', e.currentTarget)}
      >
        <img src={svgUrl(buildingSvg())} alt="" />
        <span className="wood-sign">우리 집</span>
        <img className="map-friend" src={svgUrl(characterSvg('jini', 'happy'))} alt="" />
      </button>
      <img
        ref={actor}
        className={`map-jiyul${destination ? ' map-walking' : ''}`}
        src={svgUrl(characterSvg('jiyul', 'happy'))}
        alt="지율이"
      />
      <span className="map-greeting" role="status">
        {destination
          ? destination === 'home'
            ? '집으로 가자!'
            : '우리 만나러 가자!'
          : '어디 갈까?'}
      </span>
      <span className="map-flower flower-a">✿</span>
      <span className="map-flower flower-b">✿</span>
    </section>
  );
}
export function EpisodeRoom({
  place,
  episodes,
  busy,
  onStart,
}: {
  place: Place;
  episodes: Episode[];
  busy: boolean;
  onStart: (id: string) => void;
}) {
  const school = place === 'school';
  const names: Record<string, string> = {
    'jini-needs': '지니 돌보기',
    'jini-ball': '공 찾기',
    'hauri-blocks': '블록 놀이',
    'hauri-feelings': '마음 듣기',
  };
  const toys: Record<string, string> = {
    'jini-needs': 'bowl',
    'jini-ball': 'ball',
    'hauri-blocks': 'blocks',
    'hauri-feelings': 'listen',
  };
  return (
    <section className="episode-room" aria-label={`${school ? '유치원' : '우리 집'} 놀이 고르기`}>
      <img className="world-backdrop" src={svgUrl(playRoomSvg(school))} alt="" />
      <div className="room-greeting">{school ? '우리야, 같이 놀자!' : '지니야, 나 왔어!'}</div>
      <img className="lobby-jiyul" src={svgUrl(characterSvg('jiyul', 'happy'))} alt="지율이" />
      <img
        className={`lobby-friend${school ? ' lobby-woori' : ''}`}
        src={svgUrl(characterSvg(school ? 'hauri' : 'jini', 'happy'))}
        alt={school ? '우리' : '지니'}
      />
      <div className="room-activities">
        {episodes
          .filter((e) => e.place === place)
          .map((e) => (
            <button
              key={e.id}
              className="activity-object"
              aria-label={e.title}
              disabled={busy}
              onClick={() => onStart(e.id)}
            >
              <img src={svgUrl(toySvg(toys[e.id] ?? 'ask'))} alt="" />
              <span>{names[e.id] ?? e.title}</span>
            </button>
          ))}
      </div>
      {busy && (
        <span className="room-loading" role="status">
          잠깐만…
        </span>
      )}
    </section>
  );
}

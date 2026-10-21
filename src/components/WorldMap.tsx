import type { Episode, Place } from '../engine/types';
import { characterSvg, svgUrl } from '../game/art';
import { mapSvg, playRoomSvg, toySvg, buildingSvg } from '../game/playArt';
export function WorldMap({ onPlace }: { onPlace: (place: Place) => void }) {
  return (
    <section className="world-map" aria-label="놀이 지도">
      <img className="world-backdrop" src={svgUrl(mapSvg())} alt="" />
      <h1 className="map-title">
        <span>지율이의</span>신나는 하루
      </h1>
      <button
        className="map-place map-school"
        aria-label="유치원"
        onClick={() => onPlace('school')}
      >
        <img src={svgUrl(buildingSvg(true))} alt="" />
        <span className="wood-sign">유치원</span>
        <img className="map-friend" src={svgUrl(characterSvg('hauri', 'happy'))} alt="" />
      </button>
      <button className="map-place map-home" aria-label="우리 집" onClick={() => onPlace('home')}>
        <img src={svgUrl(buildingSvg())} alt="" />
        <span className="wood-sign">우리 집</span>
        <img className="map-friend" src={svgUrl(characterSvg('jini', 'happy'))} alt="" />
      </button>
      <img className="map-jiyul" src={svgUrl(characterSvg('jiyul', 'happy'))} alt="지율이" />
      <span className="map-greeting">어디 갈까?</span>
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

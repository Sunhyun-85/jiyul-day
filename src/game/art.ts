import type { Mood } from '../engine/types';
const wrap = (body: string, w = 240, h = 300) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
export const svgUrl = (svg: string) =>
  `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new TextEncoder().encode(svg)))}`;
export function characterSvg(
  character: 'jiyul' | 'hauri' | 'jini',
  mood: Mood = 'neutral',
  blink = false,
): string {
  const eyes = blink
    ? '<path d="M87 108h12m42 0h12" stroke="#49392d" stroke-width="5" stroke-linecap="round"/>'
    : mood === 'happy'
      ? '<path d="M88 110q6-12 12 0m41 0q6-12 12 0" fill="none" stroke="#49392d" stroke-width="4" stroke-linecap="round"/>'
      : `<ellipse cx="94" cy="108" rx="5" ry="${mood === 'surprised' ? 9 : 6}" fill="#49392d"/><ellipse cx="147" cy="108" rx="5" ry="${mood === 'surprised' ? 9 : 6}" fill="#49392d"/>${mood === 'thinking' ? '<path d="M87 94l14-4m39 0 14 4" stroke="#8c7663" stroke-width="3" fill="none" stroke-linecap="round"/>' : ''}`;
  const mouth =
    mood === 'sad'
      ? '<path d="M110 135q12-14 24 0" fill="none" stroke="#654331" stroke-width="4" stroke-linecap="round"/>'
      : mood === 'surprised'
        ? '<ellipse cx="121" cy="131" rx="8" ry="10" fill="#805044"/>'
        : mood === 'thinking'
          ? '<path d="M115 133h13" stroke="#654331" stroke-width="4" stroke-linecap="round"/>'
          : '<path d="M108 128q13 17 26 0" fill="#bf6858" stroke="#654331" stroke-width="3" stroke-linejoin="round"/>';
  if (character === 'jini')
    return wrap(
      `<ellipse cx="120" cy="270" rx="76" ry="13" fill="#817953" opacity=".12"/><path d="M177 209q60-55 32-63" fill="none" stroke="#fffdf7" stroke-width="23" stroke-linecap="round"/><ellipse cx="122" cy="210" rx="65" ry="54" fill="#faf9f2" stroke="#dcd9ce" stroke-width="3"/><ellipse cx="81" cy="253" rx="23" ry="19" fill="#fffdf9"/><ellipse cx="158" cy="253" rx="23" ry="19" fill="#fffdf9"/><path d="M69 183q51 24 104-2" stroke="#7aab90" stroke-width="15" fill="none"/><circle cx="121" cy="197" r="10" fill="#e6b854"/><path d="M43 98Q17 80 35 58Q30 30 59 29Q74 4 101 22Q124 1 143 21Q175 5 184 34Q217 28 213 60Q244 79 220 103Q240 134 214 150Q213 181 183 179Q159 202 139 184Q113 202 91 184Q56 196 49 167Q16 160 30 133Q11 109 43 98" fill="#fffefb" stroke="#dcd9ce" stroke-width="3"/><ellipse cx="51" cy="120" rx="20" ry="36" fill="#ebe7de"/><ellipse cx="195" cy="120" rx="20" ry="36" fill="#ebe7de"/><ellipse cx="77" cy="134" rx="15" ry="9" fill="#f3cbc1"/><ellipse cx="167" cy="134" rx="15" ry="9" fill="#f3cbc1"/>${eyes}<ellipse cx="121" cy="128" rx="10" ry="7" fill="#49392d"/>${mood === 'sad' ? '<path d="M109 150q12-10 24 0" stroke="#49392d" stroke-width="3" fill="none"/>' : '<path d="M109 143q12 15 24 0" stroke="#49392d" stroke-width="3" fill="none"/>'}${mood === 'happy' ? '<path d="M115 149v9q7 12 13 0v-9" fill="#ef9a97"/>' : ''}`,
    );
  const shirt = character === 'jiyul' ? '#ecb551' : '#8aaa93';
  const hair = character === 'jiyul' ? '#594235' : '#70503a';
  return wrap(
    `<ellipse cx="120" cy="280" rx="67" ry="10" fill="#817953" opacity=".14"/><path d="M88 232v34m63-34v34" stroke="#e5ae86" stroke-width="24" stroke-linecap="round"/><path d="M71 267h35v16H65q-8-12 6-16m66 0h36q14 4 10 16h-46" fill="#faf5e7" stroke="#c8bc9b" stroke-width="2"/><path d="M76 214h87l-4 32h-35l-5-19-6 19H79Z" fill="#768ca1"/><path d="M77 165q-22 15-24 49m108-49q20 17 24 47" stroke="#f0bd94" stroke-width="21" fill="none" stroke-linecap="round"/><path d="M89 153h58q24 9 26 38l-9 31H75l-8-31q2-29 22-38" fill="${shirt}"/><path d="M102 154q16 18 33 0" stroke="#fff4d3" stroke-width="8" fill="none"/><rect x="127" y="181" width="24" height="22" rx="5" fill="#ffffff" opacity=".24"/><circle cx="60" cy="108" r="17" fill="#edb38c"/><circle cx="180" cy="108" r="17" fill="#edb38c"/><path d="M60 79q0-59 60-59t60 59v40q-3 50-60 50t-60-50Z" fill="#f5c6a0"/><path d="M58 100Q37 31 89 23Q121-5 159 23Q197 31 182 103l-15-33q-14 6-29-20-24 34-63 20Z" fill="${hair}"/><path d="M86 37q20-13 31-10" stroke="#ffffff" stroke-opacity=".1" stroke-width="7" fill="none" stroke-linecap="round"/><ellipse cx="79" cy="129" rx="15" ry="8" fill="#eeb09a"/><ellipse cx="162" cy="129" rx="15" ry="8" fill="#eeb09a"/>${eyes}${mouth}`,
  );
}
export function roomSvg(school = false): string {
  return wrap(
    `<rect width="720" height="500" fill="${school ? '#f4e7d5' : '#f5ead6'}"/><path d="M0 335h720v165H0Z" fill="#dfc5a0"/><path d="M0 341h720" stroke="#c6aa85" stroke-width="7"/><path d="M0 420h720M130 341v79m320-79v79M270 420v80m330-80v80" stroke="#cfb38e" stroke-width="2"/><rect x="292" y="35" width="158" height="168" rx="70" fill="#fff9ec"/><path d="M305 116q0-68 66-68t66 68v72H305Z" fill="#c9e3de"/><circle cx="403" cy="87" r="22" fill="#fae2a0"/><path d="M305 163q39-54 80 0 22-27 52-5v30H305" fill="#aac6a0"/><path d="M371 47v141m-66-67h132" stroke="#fff9ec" stroke-width="8"/><path d="M283 198h177" stroke="#c49d72" stroke-width="11" stroke-linecap="round"/><rect x="52" y="50" width="83" height="95" rx="5" fill="#cba678"/><rect x="60" y="58" width="67" height="79" fill="#fffaf0"/><path d="M68 120l22-38 14 24 17-14v36H68Z" fill="#9db695"/><circle cx="111" cy="76" r="9" fill="#edc66b"/><rect x="510" y="60" width="150" height="10" rx="5" fill="#c3a27a"/><path d="M535 60V27h14v33m9 0V19h18v41m8 0V32h13v28" stroke="#9cae9a" stroke-width="8"/><path d="M619 58l-7-24h34l-7 24" fill="#dca37c"/><path d="M629 34q-25-33-15-30 23 8 15 30m0 0q22-34 24-21 1 16-24 21" fill="#85a27b"/><ellipse cx="363" cy="405" rx="238" ry="66" fill="${school ? '#c4cfae' : '#e6d99b'}"/><ellipse cx="363" cy="405" rx="218" ry="53" fill="none" stroke="#fff7db" stroke-width="3" stroke-dasharray="8 9"/>${school ? '<rect x="34" y="226" width="176" height="112" rx="9" fill="#c5a47c"/><path d="M45 235h154v88H45Z" fill="#ead7b4"/><path d="M45 280h154m-77-45v88" stroke="#c5a47c" stroke-width="9"/><rect x="59" y="245" width="42" height="28" rx="5" fill="#d9a68a"/><rect x="138" y="291" width="42" height="25" rx="5" fill="#9dadb3"/><path d="M146 269l18-29 18 29" fill="#e7be5c"/>' : '<rect x="30" y="227" width="200" height="105" rx="28" fill="#a6b7a0"/><rect x="28" y="278" width="205" height="55" rx="16" fill="#8ea58b"/><rect x="23" y="263" width="32" height="73" rx="14" fill="#9eb098"/><rect x="207" y="263" width="32" height="73" rx="14" fill="#9eb098"/><path d="M57 333v20m146-20v20" stroke="#957451" stroke-width="9"/><rect x="72" y="241" width="52" height="41" rx="10" fill="#e9cf91" transform="rotate(-9 98 261)"/>'}<rect x="569" y="189" width="103" height="147" rx="48" fill="#c7aa85"/><path d="M581 240q0-40 39-40t40 40v96h-79Z" fill="#ead6b7"/><circle cx="646" cy="275" r="5" fill="#a58561"/>`,
    720,
    500,
  );
}
export function placeSvg(school = false): string {
  return wrap(
    `<rect width="400" height="245" rx="24" fill="${school ? '#e7eddd' : '#f3e6cd'}"/><circle cx="326" cy="53" r="25" fill="#f3d27b"/><path d="M0 205q96-43 209 0t191-7v47H0" fill="${school ? '#c8d5b6' : '#ced5b3'}"/><path d="M291 184v-59" stroke="#997c55" stroke-width="9"/><circle cx="292" cy="115" r="35" fill="#a4bb8b"/><circle cx="314" cy="139" r="27" fill="#a4bb8b"/><path d="M96 110h167v101H96Z" fill="${school ? '#f3d9a1' : '#fbf4df'}"/><path d="M77 113l101-76 104 76Z" fill="${school ? '#92aaa4' : '#d68f71'}"/><path d="M155 210v-65q24-22 48 0v65" fill="${school ? '#9bb6b0' : '#b4bd97'}"/><rect x="111" y="134" width="28" height="34" rx="3" fill="#afd0d3"/><rect x="221" y="134" width="28" height="34" rx="3" fill="#afd0d3"/><path d="M125 134v34m110-34v34" stroke="#fff9ec" stroke-width="3"/><path d="M169 211l-20 34h67l-23-34" fill="#edddbf"/>${school ? '<path d="M179 41V16m0 0h31l-9 12h-22" stroke="#d6a260" fill="#d6a260" stroke-width="3"/>' : '<rect x="224" y="55" width="21" height="39" rx="3" fill="#c27c63"/>'}<path d="M53 206v-31m-13 15h26" stroke="#93a67f" stroke-width="5"/><circle cx="53" cy="170" r="8" fill="#e9b2a0"/>`,
    400,
    245,
  );
}

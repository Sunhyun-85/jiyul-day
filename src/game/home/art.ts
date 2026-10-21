// Original vector artwork. Each part can be replaced with a transparent PNG in assets.ts.
const svg = (body: string, w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const fur = '#fffdf6',
  edge = '#d8d3c4';
export const art = {
  poop: svg(
    '<ellipse cx="50" cy="65" rx="42" ry="9" fill="#746149" opacity=".15"/><path d="M17 60Q8 44 28 39Q20 24 41 22Q38 11 49 7Q49 18 60 22Q78 27 70 39Q91 44 83 60Q52 72 17 60Z" fill="#a77950" stroke="#805c3e" stroke-width="3"/><path d="M29 40q20 8 40 0M40 24q9 6 20 0" fill="none" stroke="#c2966c" stroke-width="4" stroke-linecap="round"/>',
    100,
    80,
  ),
  mom: svg(
    '<circle cx="60" cy="60" r="57" fill="#fff5df"/><path d="M18 62Q12 10 60 9Q110 11 101 67L91 89H29Z" fill="#674a38"/><path d="M17 116Q18 81 60 81T103 116" fill="#c18da0"/><path d="M48 79v15q12 9 24 0V79" fill="#efbc98"/><ellipse cx="60" cy="55" rx="31" ry="34" fill="#f5c6a0"/><path d="M27 47Q32 11 64 21Q86 21 94 46Q68 42 58 30Q48 46 27 47" fill="#674a38"/><path d="M40 55q5-7 10 0m20 0q5-7 10 0M49 70q11 12 22 0" fill="none" stroke="#684334" stroke-width="3" stroke-linecap="round"/><circle cx="39" cy="65" r="6" fill="#eeb0a0"/><circle cx="81" cy="65" r="6" fill="#eeb0a0"/>',
    120,
    120,
  ),
  cleaningBrush: svg(
    '<path d="M47 8v54" stroke="#ba9369" stroke-width="12" stroke-linecap="round"/><path d="M28 60h39l14 36H14Z" fill="#e8bd70" stroke="#b58d51" stroke-width="3"/><path d="M32 70l-6 20m18-20v20m13-20 7 20" stroke="#c89b52" stroke-width="3"/>',
    95,
    105,
  ),
  dogBody: svg(
    `<path d="M35 30Q11 23 12 49Q2 61 13 74Q13 96 38 96H106Q129 98 132 75Q144 58 132 44Q132 23 112 28Q100 12 82 25Q61 13 48 29Z" fill="${fur}" stroke="${edge}" stroke-width="3"/><path d="M28 68q41 22 85 0" fill="none" stroke="#ece9df" stroke-width="5"/>`,
    145,
    108,
  ),
  dogHead: svg(
    `<path d="M33 31Q16 28 10 55Q2 79 19 94Q37 104 44 84L51 40M97 31Q114 28 120 55Q128 79 111 94Q93 104 86 84L79 40" fill="#a5754f" stroke="#865d41" stroke-width="3"/><path d="M20 55q-5 16 3 27m86-28q5 16-3 28" fill="none" stroke="#bd916b" stroke-width="5" stroke-linecap="round"/><path d="M35 26Q31 11 48 14Q61 2 70 14Q86 5 92 23Q107 22 106 40Q120 50 109 65Q112 89 88 94Q64 106 39 92Q15 85 22 64Q11 43 29 38Z" fill="${fur}" stroke="${edge}" stroke-width="3"/><ellipse cx="65" cy="77" rx="25" ry="18" fill="#fffefa"/><path d="M55 69q10-8 20 0q-1 11-10 12-9-1-10-12" fill="#514139"/><path d="M65 81v4m0 0q-9 9-16 0m16 0q9 9 16 0" fill="none" stroke="#6a5144" stroke-width="2.5" stroke-linecap="round"/>`,
    130,
    110,
  ),
  dogEyes: svg(
    '<ellipse cx="42" cy="55" rx="5" ry="6" fill="#423830"/><ellipse cx="87" cy="55" rx="5" ry="6" fill="#423830"/><circle cx="44" cy="53" r="1.5" fill="white"/><circle cx="89" cy="53" r="1.5" fill="white"/>',
    130,
    110,
  ),
  dogClosed: svg(
    '<path d="M36 55q6 6 12 0m33 0q6 6 12 0" fill="none" stroke="#645144" stroke-width="3" stroke-linecap="round"/>',
    130,
    110,
  ),
  dogPaw: svg(
    `<path d="M9 4Q22-3 32 5L35 35Q43 48 30 52H10Q-2 48 4 36Z" fill="${fur}" stroke="${edge}" stroke-width="2"/><path d="M15 43v6m10-6v6" stroke="#e1dcd0" stroke-width="2"/>`,
    42,
    55,
  ),
  dogTail: svg(
    `<path d="M8 51Q-2 24 19 12Q41-2 39 18Q34 31 21 25Q9 27 16 44" fill="none" stroke="${edge}" stroke-width="19" stroke-linecap="round"/><path d="M8 51Q-2 24 19 12Q41-2 39 18Q34 31 21 25Q9 27 16 44" fill="none" stroke="${fur}" stroke-width="15" stroke-linecap="round"/>`,
    55,
    65,
  ),
  boyHead: svg(
    '<path d="M17 53q-13-3-12 10t16 11m80-21q13-3 12 10t-16 11" fill="#efb88e"/><path d="M16 40q2-34 43-34t43 34v32q-4 37-43 37T16 72Z" fill="#f6c79c"/><path d="M17 60Q1 23 30 16Q45-5 69 8Q107 7 103 62L91 39Q77 44 66 23Q48 50 25 37Z" fill="#624738"/><path d="M29 22q13-10 26-9" fill="none" stroke="#8b6850" stroke-width="5" stroke-linecap="round"/><ellipse cx="30" cy="80" rx="10" ry="6" fill="#efaa8a"/><ellipse cx="87" cy="80" rx="10" ry="6" fill="#efaa8a"/>',
    118,
    115,
  ),
  boyEyes: svg(
    '<ellipse cx="39" cy="67" rx="4" ry="5" fill="#523d31"/><ellipse cx="78" cy="67" rx="4" ry="5" fill="#523d31"/><path d="M51 85q8 10 17 0" fill="none" stroke="#9d5d49" stroke-width="3" stroke-linecap="round"/>',
    118,
    115,
  ),
  boyHappy: svg(
    '<path d="M34 68q5-8 10 0m29 0q5-8 10 0" fill="none" stroke="#523d31" stroke-width="3" stroke-linecap="round"/><path d="M50 83q9 19 20 0Z" fill="#b66956"/>',
    118,
    115,
  ),
  boyBody: svg(
    '<path d="M20 11Q40-1 60 11Q78 17 77 66L67 78H13L3 66Q2 17 20 11" fill="#edb44e" stroke="#daa14a" stroke-width="2"/><path d="M27 9q13 14 26 0" fill="none" stroke="#fff0c6" stroke-width="7"/><rect x="48" y="36" width="18" height="19" rx="4" fill="#f6ce77"/><path d="M12 75h57l-2 22H44l-5-12-3 12H15Z" fill="#7792a3"/>',
    80,
    100,
  ),
  boyArm: svg(
    '<path d="M15 9q9-1 9 10l-3 31q-7 13-15 1L7 20q0-9 8-11" fill="#f2bd93"/><path d="M4 7q13-8 23 2v16H4Z" fill="#edb44e"/>',
    32,
    65,
  ),
  boyLeg: svg(
    '<path d="M8 1h18v28H8" fill="#edb88e"/><path d="M7 26h20l7 8q3 7-5 8H3q-5-9 4-16" fill="#fff8e6" stroke="#d9ccb0" stroke-width="2"/>',
    36,
    45,
  ),
  carrot: svg(
    '<path d="M43 36Q20 2 35 5q13 3 16 26Q50-4 63 5q6 9-2 27Q83 8 87 21q-3 17-24 21" fill="#75a86c" stroke="#548954" stroke-width="3" stroke-linecap="round"/><path d="M28 43Q43 28 67 40Q83 48 72 67L32 110Q17 123 18 103L19 59Q19 48 28 43Z" fill="#ef9952" stroke="#cc743e" stroke-width="3"/><path d="M27 56l15 7m-18 13 11 5m7-34 13 7m-9 29 10 5" stroke="#d77c40" stroke-width="3" stroke-linecap="round"/><path d="M27 48q11-10 26-6" fill="none" stroke="#ffc37f" stroke-width="5" stroke-linecap="round"/><path d="M25 95l-2 12" stroke="#f9bf83" stroke-width="3" stroke-dasharray="3 2"/>',
    100,
    125,
  ),
  food: svg(
    '<path d="M19 14h69l-4 19 9 76q-39 13-79 0l9-76Z" fill="#e3b760" stroke="#9e7b43" stroke-width="3"/><path d="M19 14h69l-4 13H23Z" fill="#bf944d"/><ellipse cx="53" cy="69" rx="30" ry="29" fill="#fff4ce"/><path d="M29 75q25-26 48 0v9H29Z" fill="#a86d3d"/><ellipse cx="43" cy="65" rx="8" ry="5" fill="#c58e50"/><ellipse cx="61" cy="61" rx="9" ry="5" fill="#b78246"/><path d="M24 96h58" stroke="#f3d28c" stroke-width="4"/>',
    108,
    125,
  ),
  bottle: svg(
    '<path d="M35 13h32v24l16 17v54q-30 15-59 0V54l11-17Z" fill="#bee1df" stroke="#6b999b" stroke-width="3"/><path d="M27 67q15-8 28 0t25 0v39q-27 10-53 0Z" fill="#8cc8d1"/><rect x="32" y="6" width="38" height="17" rx="6" fill="#91b8aa" stroke="#608c81" stroke-width="3"/><path d="M52 72q-22 27 0 29 21-2 0-29" fill="#eaf8ef"/><path d="M35 47v14" stroke="#f7fffa" stroke-width="6" stroke-linecap="round"/>',
    108,
    125,
  ),
  bowl: svg(
    '<ellipse cx="80" cy="71" rx="73" ry="17" fill="#6f624b" opacity=".13"/><path d="M9 27l13 37q57 26 115 0l14-37" fill="#dea27e" stroke="#967554" stroke-width="3"/><ellipse cx="80" cy="27" rx="71" ry="23" fill="#fff0cd" stroke="#967554" stroke-width="4"/><path d="M31 58q49 15 97 0" fill="none" stroke="#f6caa8" stroke-width="6" stroke-linecap="round"/>',
    160,
    92,
  ),
  waterBowl: svg(
    '<ellipse cx="80" cy="71" rx="73" ry="17" fill="#6f624b" opacity=".13"/><path d="M9 27l13 37q57 26 115 0l14-37" fill="#87bdbe" stroke="#627e78" stroke-width="3"/><ellipse cx="80" cy="27" rx="71" ry="23" fill="#e7f4e6" stroke="#627e78" stroke-width="4"/><path d="M31 58q49 15 97 0" fill="none" stroke="#b4dcd7" stroke-width="6" stroke-linecap="round"/>',
    160,
    92,
  ),
  bed: svg(
    '<ellipse cx="110" cy="103" rx="105" ry="33" fill="#7a7656" opacity=".12"/><path d="M8 75Q-1 13 56 14h107q59 0 51 64l-8 37q-94 37-192 0Z" fill="#a4baa0" stroke="#7e967b" stroke-width="3"/><ellipse cx="110" cy="79" rx="91" ry="44" fill="#e5e4c9"/><ellipse cx="110" cy="85" rx="72" ry="31" fill="#f5ecd3"/><path d="M9 76q12-13 27 1l12 27q61 19 125-1l10-26q12-14 29-1l-5 39q-98 35-192 0Z" fill="#b8c9a8" stroke="#8b9f81" stroke-width="3"/><path d="M54 119q57 13 112 0" stroke="#d9e2bf" stroke-width="5" stroke-dasharray="4 6" fill="none"/>',
    220,
    150,
  ),
  box: svg(
    '<path d="M13 41l67-25 69 25-4 90q-66 23-127 0Z" fill="#bfa082" stroke="#907254" stroke-width="3"/><path d="M18 55q64 23 126 0v70q-66 20-126 0Z" fill="#ddbd90"/><path d="M25 49q57 16 110 0" stroke="#e6d1ac" stroke-width="7"/><path d="M59 96q20-22 40 0l-4 17H63Z" fill="#f6e9c5"/><path d="M70 89v-8q10-12 20 0v8" fill="none" stroke="#a6b38f" stroke-width="5"/>',
    160,
    150,
  ),
  lid: svg(
    '<path d="M8 27L78 2l75 25-4 21Q80 70 12 48Z" fill="#e8c997" stroke="#a1815b" stroke-width="3"/><path d="M16 31q65 23 130 0" fill="none" stroke="#f6e2b9" stroke-width="5"/>',
    160,
    70,
  ),
  heart: svg(
    '<path d="M30 52Q-12 27 8 9q13-12 22 5Q41-3 54 9q20 18-24 43" fill="#e8a298" stroke="#d68a81" stroke-width="2"/>',
    60,
    60,
  ),
};

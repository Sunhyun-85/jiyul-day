import type { Hand } from '../../engine/SchoolPlayEngine';
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">${body}</svg>`;
export function handSvg(hand: Hand) {
  if (hand === 'rock')
    return wrap(`
    <ellipse cx="80" cy="148" rx="50" ry="7" fill="#796844" opacity=".12"/>
    <path d="M49 134L35 111Q28 99 29 80V58Q29 42 44 42Q51 42 55 48Q55 31 70 31Q80 31 84 41Q87 29 100 34Q110 37 111 48Q126 44 131 58L133 91Q133 115 113 133Z" fill="#f5c69e" stroke="#a77b59" stroke-width="4" stroke-linejoin="round"/>
    <path d="M55 49V74Q55 83 44 83M83 43V72Q83 84 70 84M111 50V74Q111 86 98 86M130 78Q126 89 115 87" fill="none" stroke="#c18c67" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M38 101Q31 91 40 83Q47 77 57 82L85 94Q94 98 89 108Q85 116 74 112L59 106" fill="#f5c69e" stroke="#a77b59" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 132H112V152H52Z" fill="#e7b252" stroke="#b99148" stroke-width="3"/>`);
  const shapes = {
    rock: 'M44 130V85q-19-25-4-34 12-5 23 14V49q0-20 17-15 8-17 21-7 17-8 23 9 17-1 18 16v48q-1 24-23 35H62Z',
    scissors:
      'M53 136V100L38 83q-12-16 1-23 9-4 21 11L44 25q-4-17 10-18 11-1 16 17l14 37 8-42q3-17 16-13 12 4 7 22l-7 43q22-12 29 8l-1 30q-2 24-24 31Z',
    paper:
      'M49 139L22 95q-9-16 4-22 10-4 22 14V36q0-18 14-17 12 1 12 18V20q0-18 14-16 11 2 11 18v15-13q0-16 13-14 12 2 12 17v29-14q0-15 12-13 11 2 11 16v56q0 27-28 41Z',
  };
  return wrap(
    `<ellipse cx="84" cy="148" rx="52" ry="7" fill="#796844" opacity=".12"/><path d="${shapes[hand]}" fill="#f5c69e" stroke="#a77b59" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 114q15-17 38-10" fill="none" stroke="#d59e7b" stroke-width="4" stroke-linecap="round"/><path d="M51 132h67v20H51Z" fill="#e7b252" stroke="#b99148" stroke-width="3"/>`,
  );
}
export function blockSvg(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="116" height="44" viewBox="0 0 116 44"><path d="M2 11L13 2h101v31l-11 9H2Z" fill="${color}" stroke="#655c54" stroke-width="2"/><path d="M3 11h100l10-8H14Z" fill="#fff" opacity=".28"/><path d="M103 12v28l10-8V4Z" fill="#000" opacity=".12"/><path d="M9 18h86" stroke="#fff" opacity=".25" stroke-width="3"/></svg>`;
}

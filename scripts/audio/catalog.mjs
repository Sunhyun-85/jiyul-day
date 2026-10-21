import { createHash } from 'node:crypto';
/** Stable content IDs keep edited dialogue from silently playing an older recording. */
export function dialogueId(character, text) {
  return `${character}_${createHash('sha256').update(text.normalize('NFC')).digest('hex').slice(0, 16)}`;
}
export function extractDialogue(episodes, home) {
  const lines = new Map();
  function add(text, character, emotion = 'warm') {
    if (!text?.trim()) return;
    const id = dialogueId(character, text);
    lines.set(id, {
      dialogue_id: id,
      character_id: character,
      text,
      audio_path: `/audio/${character}/${id}.mp3`,
      emotion,
    });
  }
  for (const episode of episodes)
    for (const v of episode.variations) {
      const speaker = episode.character === 'jini' ? 'narrator' : 'hauri';
      for (const line of v.lines) add(line, speaker, v.mood);
      add(v.clue, 'narrator');
      add(v.hint, 'narrator');
      for (const a of v.actions) for (const line of a.result) add(line, speaker, a.mood);
    }
  for (const s of home.situations) for (const line of s.intro) add(line, 'narrator');
  for (const lines of Object.values(home.dialogue)) for (const line of lines) add(line, 'narrator');
  add('지니야, 나 왔어!', 'narrator');
  add('하우리야, 같이 놀자!', 'narrator');
  // These entries accept real recorded dog sounds, never human TTS.
  for (const [text, emotion] of [
    ['멍!', 'bark'],
    ['낑…', 'whine'],
    ['하암…', 'yawn'],
  ])
    add(text, 'jini', emotion);
  return [...lines.values()].sort((a, b) => a.dialogue_id.localeCompare(b.dialogue_id));
}

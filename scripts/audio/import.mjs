import { copyFile, readFile, mkdir } from 'node:fs/promises';
import { resolve, basename, extname } from 'node:path';
import { buildAudio, validAudioHeader } from './build.mjs';
// Offline provider contract. Future paid adapters must be explicitly selected and authorized.
// provider.render({dialogue_id,character_id,text,emotion}, {voiceProfile,outputPath}) => Promise<void>
// Recorded audio is the implemented provider; no network request or API key is used here.
const [id, source] = process.argv.slice(2);
if (!id || !source)
  throw new Error('사용법: npm run audio:import -- narrator_ID /path/to/recording.mp3');
const manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8'));
const entry = manifest.entries.find((e) => e.dialogue_id === id);
if (!entry) throw new Error('대사 ID가 없습니다. npm run audio:catalog 후 manifest를 확인하세요.');
const ext = extname(source).slice(1).toLowerCase();
if (!['mp3', 'wav', 'ogg'].includes(ext) || !validAudioHeader(await readFile(source), ext))
  throw new Error('재생 가능한 MP3, WAV, OGG 녹음이 필요합니다.');
const destination = resolve('public/audio', entry.character_id, `${basename(id)}.${ext}`);
await mkdir(resolve('public/audio', entry.character_id), { recursive: true });
await copyFile(resolve(source), destination);
await buildAudio();
console.log('녹음 등록:', destination);

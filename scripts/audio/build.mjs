import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { extractDialogue } from './catalog.mjs';
export function validAudioHeader(buffer, extension) {
  if (buffer.length < 44) return false;
  if (extension === 'wav')
    return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WAVE';
  if (extension === 'ogg') return buffer.toString('ascii', 0, 4) === 'OggS';
  return (
    buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 255 && (buffer[1] & 224) === 224)
  );
}
export async function buildAudio(root = process.cwd(), strict = false) {
  const episodes = JSON.parse(await readFile(`${root}/src/data/episodes.json`, 'utf8'));
  const home = JSON.parse(await readFile(`${root}/src/data/home.json`, 'utf8'));
  const school = JSON.parse(await readFile(`${root}/src/data/school.json`, 'utf8'));
  const entries = extractDialogue(episodes, home, school);
  let available = 0;
  const invalid = [];
  const probe = spawnSync('ffprobe', ['-version'], { stdio: 'ignore' }).status === 0;
  for (const entry of entries) {
    entry.available = false;
    for (const ext of ['mp3', 'wav', 'ogg']) {
      const path = `/audio/${entry.character_id}/${entry.dialogue_id}.${ext}`;
      try {
        await access(root + '/public' + path);
      } catch {
        continue;
      }
      const bytes = await readFile(root + '/public' + path);
      let valid = validAudioHeader(bytes, ext);
      if (valid && probe) {
        const r = spawnSync(
          'ffprobe',
          [
            '-v',
            'error',
            '-select_streams',
            'a:0',
            '-show_entries',
            'stream=codec_type',
            '-of',
            'csv=p=0',
            root + '/public' + path,
          ],
          { encoding: 'utf8' },
        );
        valid = r.status === 0 && r.stdout.includes('audio');
      }
      if (!valid) {
        invalid.push(path);
        continue;
      }
      entry.audio_path = path;
      entry.available = true;
      available++;
      break;
    }
  }
  await mkdir(root + '/public/audio', { recursive: true });
  await mkdir(root + '/src/data', { recursive: true });
  const manifest = {
    version: 1,
    validation: probe ? 'header-and-ffprobe' : 'header-only',
    entries,
  };
  await writeFile(root + '/public/audio/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(root + '/src/data/audio-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    root + '/public/audio/missing.json',
    JSON.stringify(
      entries.filter((e) => !e.available),
      null,
      2,
    ) + '\n',
  );
  console.log(
    `음성: ${available}/${entries.length}개 준비, 누락 ${entries.length - available}개; 검증 ${manifest.validation}`,
  );
  if (invalid.length) throw new Error(`잘못된 음성 파일: ${invalid.join(', ')}`);
  if (strict && available !== entries.length)
    throw new Error('미생성 음성이 있습니다. public/audio/missing.json을 확인하세요.');
  return manifest;
}
if (process.argv[1]?.endsWith('/build.mjs'))
  buildAudio(process.cwd(), process.argv.includes('--strict')).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });

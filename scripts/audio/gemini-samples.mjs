/** Build-time voice generation. No network calls without --generate; no automatic retries.
 * Run: node --env-file=.env.audio.local scripts/audio/gemini-samples.mjs [--generate]
 * Samples stay outside public/. --missing publishes new lines using the approved voice.
 */
import { mkdir, access, writeFile, readFile } from 'node:fs/promises';
import { dialogueId } from './catalog.mjs';
import { validAudioHeader } from './build.mjs';
const model = 'gemini-3.8-flash-tts';
const maxOutputTokens = 750;
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice(8)) : Infinity;
if (limitArg && (!Number.isInteger(limit) || limit < 1 || limit > 200))
  throw new Error('--limit은 1~200 정수여야 합니다.');
const allMissing = process.argv.includes('--missing');
if (allMissing && process.argv.includes('--title'))
  throw new Error('--missing과 --title은 함께 사용할 수 없습니다.');
const titleOnly = process.argv.includes('--title');
const voice = titleOnly ? 'Puck' : 'Leda';
const character = titleOnly ? 'narrator' : 'hauri';
const texts = titleOnly
  ? ['지율이의 신나는 하루']
  : [
      '지율아, 같이 놀자! 어떤 놀이 할까?',
      '빨강 블록을 올려 줄래?',
      '괜찮아! 우리 다시 같이 쌓자.',
    ];
const direction = titleOnly
  ? '한국어로 어린이 게임 제목을 따뜻하고 밝게 소개하세요. 자연스럽고 경쾌하게, 과장하거나 노래하지 말고 제목만 읽으세요. 배경음은 넣지 마세요.'
  : '가상의 한국인 유치원생 남자아이 우리가 또래 친구 지율이에게 말하는 장면입니다. 다섯 살 어린아이처럼 작고 맑은 높은 음색, 가볍고 부드러운 발성, 짧은 호흡으로 연기하세요. 변성기 전 아이의 목소리로, 성인 남성의 낮고 굵은 공명이나 어른이 아이에게 설명하는 말투를 쓰지 마세요. 귀여움을 과장하거나 소리를 억지로 높이지 말고 또래끼리 노는 자연스러운 한국어 반말로 말하세요. 질문은 호기심 있게, 위로는 다정하게 표현하세요. 대사만 읽고 배경음이나 설명은 넣지 마세요.';
const folder = allMissing
  ? 'audio-previews/generated'
  : titleOnly
    ? 'audio-previews/title-puck'
    : 'audio-previews/woori-leda-child-v1';
let jobs = texts.map((text) => ({
  text,
  id: dialogueId(character, text),
  path: `${folder}/${dialogueId(character, text)}.wav`,
}));
if (allMissing) {
  const manifest = JSON.parse(await readFile('public/audio/manifest.json', 'utf8'));
  const school = JSON.parse(await readFile('src/data/school.json', 'utf8'));
  // Active school and home lines first, then retained legacy episodes. Never synthesize the dog.
  const active = new Set(school.dialogue);
  const home = JSON.parse(await readFile('src/data/home.json', 'utf8'));
  Object.values(home.dialogue)
    .flat()
    .forEach((text) => active.add(text));
  home.situations.flatMap((s) => s.intro).forEach((text) => active.add(text));
  jobs = manifest.entries
    .filter((e) => !e.available && e.character_id !== 'jini')
    .sort((a, b) => Number(active.has(b.text)) - Number(active.has(a.text)))
    .map((e) => ({
      text: e.text,
      id: e.dialogue_id,
      character: e.character_id,
      path: `public/audio/${e.character_id}/${e.dialogue_id}.wav`,
    }));
}
jobs = jobs.slice(0, limit);
const args = process.argv.slice(2);
if (
  args.some(
    (arg) => arg !== '--generate' && arg !== '--title' && arg !== '--missing' && arg !== limitArg,
  )
)
  throw new Error('지원 옵션: --generate, --title, --missing, --limit=N');
console.log(
  JSON.stringify(
    { model, voice, maxOutputTokens, requests: jobs.length, automaticRetries: false, jobs },
    null,
    2,
  ),
);
if (!args.includes('--generate')) {
  console.log('준비 확인만 완료했습니다. 생성 요청·과금은 하지 않았습니다.');
  process.exit(0);
}
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error('GEMINI_API_KEY가 없습니다. --env-file=.env.audio.local로 실행하세요.');
await mkdir(folder, { recursive: true });
for (const job of jobs) {
  let exists = true;
  try {
    await access(job.path);
  } catch {
    exists = false;
  }
  if (exists) {
    console.log(`기존 샘플 유지: ${job.id}`);
    continue;
  }
  const jobVoice = job.character === 'narrator' ? 'Puck' : voice;
  const jobDirection =
    job.character === 'narrator'
      ? '따뜻하고 밝은 성인 내레이터로 자연스러운 한국어로 말하세요. 어린이가 놀이하는 상황을 짧고 다정하게 설명하세요. 과장하거나 노래하지 말고, 질문의 억양을 자연스럽게 살리세요. 대사만 읽고 배경음은 넣지 마세요.'
      : direction;
  await mkdir(job.path.slice(0, job.path.lastIndexOf('/')), { recursive: true });
  let response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            type: 'user_input',
            content: [
              {
                type: 'text',
                text: job.text,
                annotations: [{ type: 'speech_metadata', style: jobDirection }],
              },
            ],
          },
        ],
        response_format: { type: 'audio' },
        generation_config: {
          max_output_tokens: maxOutputTokens,
          speech_config: [{ voice: jobVoice }],
        },
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error('음성 요청 연결 실패. 중복 과금을 피하려고 자동 재시도하지 않습니다.');
  }
  if (!response.ok) {
    // Print only quota identifiers, never raw response text, request headers or credentials.
    const error = await response.json().catch(() => ({}));
    const details = error.error?.details ?? [];
    const safeId = (value) =>
      typeof value === 'string' && /^[a-zA-Z0-9_./:-]{1,200}$/.test(value) ? value : undefined;
    const quotas = details
      .flatMap((d) => d.violations ?? [])
      .map((v) => ({
        metric: safeId(v.quotaMetric),
        id: safeId(v.quotaId),
      }));
    const retryDelay = details.map((d) => safeId(d.retryDelay)).find(Boolean);
    console.log(JSON.stringify({ httpStatus: response.status, quotas, retryDelay }));
    throw new Error(`음성 요청 실패(HTTP ${response.status}). 자동 재시도하지 않습니다.`);
  }
  const body = await response.json();
  if (body.status !== 'completed')
    throw new Error('음성이 정상 완료되지 않아 중단합니다. 자동 재시도하지 않습니다.');
  const chunks = (body.steps ?? [])
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'audio' && part.data);
  const chunk = chunks.at(-1);
  if (!chunk) throw new Error('음성 데이터가 없습니다.');
  const wav = Buffer.from(chunk.data, 'base64');
  if (!validAudioHeader(wav, 'wav'))
    throw new Error('올바른 WAV 파일이 아니므로 저장하지 않습니다.');
  await writeFile(job.path, wav, { flag: 'wx' });
  await writeFile(
    `${folder}/${job.id}.json`,
    JSON.stringify(
      {
        ...job,
        model,
        voice: jobVoice,
        direction: jobDirection,
        usage: body.usage,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`음성 저장: ${job.path} (${wav.length} bytes)`);
  if (allMissing) await new Promise((resolve) => setTimeout(resolve, 21000));
}

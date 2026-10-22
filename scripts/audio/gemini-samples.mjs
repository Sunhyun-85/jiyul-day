/** Offline preview only. No network calls without --generate; no automatic retries.
 * Run: node --env-file=.env.audio.local scripts/audio/gemini-samples.mjs [--generate]
 * Samples stay outside public/ until the voice has been reviewed.
 */
import { mkdir, access, writeFile } from 'node:fs/promises';
import { dialogueId } from './catalog.mjs';
import { validAudioHeader } from './build.mjs';
const model = 'gemini-3.8-flash-tts';
const voice = 'Puck';
const maxOutputTokens = 750;
const titleOnly = process.argv.includes('--title');
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
  : '한국어로 친구에게 직접 이야기하듯 밝고 다정하게 말해 주세요. 친근한 어린 친구 느낌이지만 억지로 높은 목소리나 과장된 만화 연기는 피하세요. 자연스러운 대화 속도로, 질문은 질문 억양으로 말하세요. 아래 대사만 읽고 설명이나 배경음은 넣지 마세요.';
const folder = titleOnly ? 'audio-previews/title-puck' : 'audio-previews/woori-puck';
const jobs = texts.map((text) => ({
  text,
  id: dialogueId(character, text),
  path: `${folder}/${dialogueId(character, text)}.wav`,
}));
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--generate' && arg !== '--title'))
  throw new Error('지원 옵션: --generate, --title');
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
                annotations: [{ type: 'speech_metadata', style: direction }],
              },
            ],
          },
        ],
        response_format: { type: 'audio' },
        generation_config: { max_output_tokens: maxOutputTokens, speech_config: [{ voice }] },
      }),
      signal: AbortSignal.timeout(120000),
    });
  } catch {
    throw new Error('음성 요청 연결 실패. 중복 과금을 피하려고 자동 재시도하지 않습니다.');
  }
  if (!response.ok)
    throw new Error(`음성 요청 실패(HTTP ${response.status}). 자동 재시도하지 않습니다.`);
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
      { ...job, model, voice, direction, usage: body.usage, createdAt: new Date().toISOString() },
      null,
      2,
    ) + '\n',
  );
  console.log(`샘플 저장: ${job.path} (${wav.length} bytes)`);
}

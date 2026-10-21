import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
test('파일 음성은 실제 Audio로 재생되고 누락 파일은 TTS 없이 실패 값을 반환해요', async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const samples = 2205,
    bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(22050, 24);
  bytes.writeUInt32LE(44100, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    bytes.writeInt16LE(Math.round(Math.sin((i * 2 * Math.PI * 440) / 22050) * 1000), 44 + i * 2);
  await page.route('**/audio/effects/test.wav', (route) =>
    route.fulfill({ contentType: 'audio/wav', body: bytes }),
  );
  await page.route('**/audio/effects/missing.wav', (route) =>
    route.fulfill({ status: 404, body: 'missing' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: '우리 집', exact: true }).click();
  const source = (await readFile('src/engine/SpeechProvider.ts', 'utf8'))
    .replace(/^import manifest.*;$/m, 'const manifest={entries:[] as any[]};')
    .replaceAll('export ', '');
  const script = ts.transpileModule(
    source + '\n(globalThis as any).TestFileSpeechProvider=FileSpeechProvider;',
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } },
  ).outputText;
  await page.addScriptTag({ content: script });
  const result = await page.evaluate(async () => {
    const synth = window.speechSynthesis;
    let calls = 0;
    Object.defineProperty(synth, 'speak', { value: () => calls++, configurable: true });
    const provider = new (globalThis as any).TestFileSpeechProvider();
    return {
      played: await provider.speak('테스트', 1, '/audio/effects/test.wav'),
      missing: await provider.speak('누락', 1, '/audio/effects/missing.wav'),
      absent: await provider.speak('등록되지 않음', 1),
      calls,
    };
  });
  expect(result).toEqual({ played: true, missing: false, absent: false, calls: 0 });
  await context.close();
});

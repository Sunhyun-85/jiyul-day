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

test('생성한 제목과 우리 목소리를 실제 파일로 재생하고 부모 공간에서 네 개를 들어요', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'jiyul-settings',
      JSON.stringify({
        voice: true,
        speed: 'normal',
        wait: 0,
        choices: 4,
        hints: true,
        captions: true,
        parentMode: true,
      }),
    );
    const original = HTMLMediaElement.prototype.play;
    (window as any).playedAudio = [];
    HTMLMediaElement.prototype.play = function () {
      (window as any).playedAudio.push(this);
      return original.call(this);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '유치원', exact: true }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const audio = (window as any).playedAudio.at(-1) as HTMLAudioElement;
        return audio?.currentTime > 0 && audio?.src.includes('hauri_e2618e11c45ff84e.wav');
      }),
    )
    .toBe(true);
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.getByLabel('확인 숫자').fill(await page.locator('.gate-code').innerText());
  await page.getByRole('button', { name: '설정 열기' }).click();
  await expect(page.locator('.voice-preview audio')).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await page
      .locator('.voice-preview audio')
      .nth(i)
      .evaluate(async (element) => {
        await (element as HTMLAudioElement).play();
      });
    await expect
      .poll(() =>
        page
          .locator('.voice-preview audio')
          .nth(i)
          .evaluate((element) => (element as HTMLAudioElement).currentTime),
      )
      .toBeGreaterThan(0);
    expect(
      await page
        .locator('.voice-preview audio')
        .evaluateAll((elements) => elements.filter((e) => !(e as HTMLAudioElement).paused).length),
    ).toBe(1);
  }
  await page.getByRole('button', { name: '부모 설정 닫기' }).click();
  expect(
    await page.evaluate(() =>
      (window as any).playedAudio.every((audio: HTMLAudioElement) => audio.paused),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: '처음으로', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '유치원', exact: true }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
  await expect
    .poll(() => page.evaluate(() => (window as any).playedAudio.at(-1)?.currentTime ?? 0))
    .toBeGreaterThan(0);
});

test('등록된 실제 음성 파일 전체가 디코딩되고 무음 파일이 아니에요', async ({ page }) => {
  await page.goto('/');
  const checked = await page.evaluate(async () => {
    const manifest = await (await fetch('/audio/manifest.json')).json();
    const decoder = new OfflineAudioContext(1, 1, 24000);
    const results = [];
    for (const entry of manifest.entries.filter((e: { available: boolean }) => e.available)) {
      const response = await fetch(entry.audio_path);
      if (!response.ok) throw new Error(`음성 파일 누락: ${entry.dialogue_id}`);
      const buffer = await decoder.decodeAudioData(await response.arrayBuffer());
      const samples = buffer.getChannelData(0);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
      results.push({ id: entry.dialogue_id, duration: buffer.duration, peak });
    }
    return results;
  });
  expect(checked.length).toBeGreaterThanOrEqual(4);
  for (const audio of checked) {
    expect(audio.duration, audio.id).toBeGreaterThan(0.3);
    expect(audio.duration, audio.id).toBeLessThan(30);
    expect(audio.peak, audio.id).toBeGreaterThan(0.01);
  }
});

test('가위바위보 결과 음성이 길어도 자르지 않고 다음 판으로 넘어가요', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
    localStorage.setItem('jiyul-settings', JSON.stringify({ voice: true, speed: 'normal' }));
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      // Exercise a long real recording without depending on the device's decode speed.
      if (this.src.includes('hauri_4583ded083629b79')) {
        this.playbackRate = 0.5;
        (window as any).roundAudio = this;
      }
      return original.call(this);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: '유치원', exact: true }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
  await page.getByRole('button', { name: '가위바위보', exact: true }).click();
  await page.getByRole('button', { name: '가위', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).roundAudio?.currentTime ?? 0))
    .toBeGreaterThan(0);
  await page.waitForTimeout(3900);
  expect(await page.evaluate(() => !(window as any).roundAudio.paused)).toBe(true);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'rps-reveal');
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'rps-pick', {
    timeout: 8000,
  });
  expect(await page.evaluate(() => (window as any).roundAudio.ended)).toBe(true);
});

import { test, expect, type Page } from '@playwright/test';
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function sceneReady(page: Page) {
  await expect(page.locator('canvas')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('canvas')
        .evaluate(
          (canvas) =>
            (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(10, 10, 1, 1).data[3],
        ),
    )
    .toBe(255);
}
import data from '../../src/data/episodes.json' with { type: 'json' };
async function setup(page: Page, wait = 0) {
  await page.addInitScript(
    ({ wait }) => {
      if (!localStorage.getItem('jiyul-settings'))
        localStorage.setItem(
          'jiyul-settings',
          JSON.stringify({
            choices: 4,
            speed: 'normal',
            wait,
            hints: true,
            voice: true,
            parentMode: true,
          }),
        );
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          getVoices: () => [],
          cancel: () => {},
          speak: () => {
            throw new Error('음성 없음');
          },
        },
        configurable: true,
      });
    },
    { wait },
  );
  await page.goto('/');
}
async function parent(page: Page) {
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  const code = await page.locator('.gate-code').innerText();
  await page.getByLabel('확인 숫자').fill(code);
  await page.getByRole('button', { name: '설정 열기' }).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const buttons = await page.locator('button:visible').evaluateAll((nodes) =>
    nodes.map((n) => ({
      height: n.getBoundingClientRect().height,
      width: n.getBoundingClientRect().width,
    })),
  );
  for (const b of buttons) {
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.width).toBeGreaterThanOrEqual(44);
  }
}
test('360px 화면과 태블릿에서 주요 화면이 잘리지 않아요', async ({ page }) => {
  await setup(page);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '함께 놀러 가기' }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: '우리 집' }).click();
  await noOverflow(page);
  await page.getByRole('button', { name: /지니가 배고파요/ }).click();
  await sceneReady(page);
  await noOverflow(page);
  await page.getByRole('button', { name: '지니 만지기' }).click();
  await expect(page.locator('.choice-button')).toHaveCount(4);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/game-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 800, height: 1100 });
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/game-tablet.png', fullPage: true });
});
test('4개 에피소드가 음성 없이 완료되고 기록과 부모 설정이 남아요', async ({ page }) => {
  await setup(page);
  for (const e of data) {
    await page.getByRole('button', { name: '처음으로' }).click();
    await page.getByRole('button', { name: '함께 놀러 가기' }).click();
    await page
      .getByRole('button', { name: e.place === 'home' ? '우리 집' : '유치원', exact: false })
      .click();
    await page.getByRole('button', { name: new RegExp(e.title) }).click();
    await page
      .getByRole('button', { name: e.character === 'jini' ? '지니 만지기' : '하우리 만지기' })
      .click();
    await expect(page.locator('.choice-button')).toHaveCount(4);
    await expect(page.locator('.voice-note')).toBeVisible();
    await page.getByRole('button', { name: '말했어요' }).click();
    await page.getByRole('button', { name: '함께 살펴보기' }).click();
    let completed = false;
    for (let n = 0; n < 4; n++) {
      const action = e.variations
        .flatMap((v) => v.actions)
        .map((a) => a.id)
        .filter((id, i, all) => all.indexOf(id) === i)[n];
      await page.locator(`[data-action="${action}"]`).click();
      await page.getByRole('button', { name: '이야기 이어가기' }).click();
      if (await page.getByText('마음을 나눈 하루', { exact: true }).isVisible()) {
        completed = true;
        break;
      }
      await expect(page.locator('.choice-button')).toHaveCount(4);
    }
    expect(completed).toBe(true);
    await page.getByRole('button', { name: '다른 이야기 만나기' }).click();
    await expect(page.locator('.episode-card')).toHaveCount(2);
  }
  await parent(page);
  await expect(page.locator('.record-list article')).not.toHaveCount(0);
  await expect(page.locator('.record-list')).toContainText('부모가 관찰함');
  await page.getByLabel('선택지 개수').selectOption('2');
  await page.getByLabel('선택지 기다리기').selectOption('8');
  await page.getByLabel('음성 사용').uncheck();
  await page.reload();
  await parent(page);
  await expect(page.getByLabel('선택지 개수')).toHaveValue('2');
  await expect(page.getByLabel('선택지 기다리기')).toHaveValue('8');
  await expect(page.getByLabel('음성 사용')).not.toBeChecked();
  await expect(page.locator('.record-list article')).not.toHaveCount(0);
});
test('관찰 시간에는 선택지를 숨기고 건너뛰거나 설정을 즉시 바꿀 수 있어요', async ({ page }) => {
  await setup(page, 8);
  await page.getByRole('button', { name: '함께 놀러 가기' }).click();
  await page.getByRole('button', { name: '우리 집' }).click();
  await page.getByRole('button', { name: /지니가 배고파요/ }).click();
  await page.getByRole('button', { name: '지니 만지기' }).click();
  await expect(page.locator('.choice-button')).toHaveCount(0);
  await page.getByRole('button', { name: '선택지 보기' }).click();
  await expect(page.locator('.choice-button')).toHaveCount(4);
  await parent(page);
  await page.getByLabel('선택지 개수').selectOption('2');
  await page.getByRole('button', { name: '부모 설정 닫기' }).click();
  await expect(page.locator('.choice-button')).toHaveCount(2);
});
test('첫 캐시 저장 후 오프라인에서도 새로 열고 이야기로 들어가요', async ({ page, context }) => {
  await setup(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: '함께 놀러 가기' })).toBeVisible();
  await page.getByRole('button', { name: '함께 놀러 가기' }).click();
  await page.getByRole('button', { name: '우리 집' }).click();
  await page.getByRole('button', { name: /지니가 배고파요/ }).click();
  await sceneReady(page);
  await page.getByRole('button', { name: '지니 만지기' }).click();
  await expect(page.locator('.choice-button')).toHaveCount(4);
  await context.setOffline(false);
});

test('새 버전은 놀이를 나간 뒤 적용하고 첫 방문에서도 갱신돼요', async ({ page }) => {
  test.setTimeout(90000);
  const { readFile, writeFile } = await import('node:fs/promises');
  const workerPath = new URL('../../dist/sw.js', import.meta.url);
  const original = await readFile(workerPath, 'utf8');
  try {
    await setup(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.getByRole('button', { name: '함께 놀러 가기' }).click();
    await page.getByRole('button', { name: '우리 집' }).click();
    await page.getByRole('button', { name: /지니가 배고파요/ }).click();
    await sceneReady(page);
    await writeFile(workerPath, original + '\n// 새 버전 전환 검증\n');
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration!.update();
    });
    await expect
      .poll(() =>
        page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting),
      )
      .toBe(true);
    await expect(page.getByRole('button', { name: '새 버전 열기' })).toHaveCount(0);
    await page.getByRole('button', { name: '이야기 고르기로 돌아가기' }).click();
    await expect(page.getByRole('button', { name: '새 버전 열기' })).toBeVisible();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', { name: '새 버전 열기' }).click(),
    ]);
    await expect(page.getByRole('button', { name: '함께 놀러 가기' })).toBeVisible();
    await parent(page);
    await expect(page.getByLabel('선택지 개수')).toHaveValue('4');
  } finally {
    await writeFile(workerPath, original);
  }
});

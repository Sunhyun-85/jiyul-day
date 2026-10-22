import { test, expect, type Page } from '@playwright/test';
import data from '../../src/data/episodes.json' with { type: 'json' };
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function setup(page: Page, wait = 0, random = 0.1) {
  await page.addInitScript(
    ({ wait, random }) => {
      Math.random = () => random;
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
            captions: false,
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
    { wait, random },
  );
  await page.goto('/');
}
async function ready(page: Page) {
  await expect(page.locator('.game-canvas')).toHaveAttribute('data-ready', 'true');
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
async function start(page: Page, episodeId = 'jini-needs') {
  const episode = data.find((e) => e.id === episodeId)!;
  await page
    .getByRole('button', { name: episode.place === 'home' ? '우리 집' : '유치원', exact: true })
    .click();
  await page.getByRole('button', { name: '기존 이야기 고르기' }).click();
  await page.getByRole('button', { name: episode.title, exact: true }).click();
  await ready(page);
  await page
    .getByRole('button', { name: episode.character === 'jini' ? '지니 만지기' : '우리 만지기' })
    .click();
}
async function parent(page: Page) {
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.getByLabel('확인 숫자').fill(await page.locator('.gate-code').innerText());
  await page.getByRole('button', { name: '설정 열기' }).click();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  const bounds = await page.locator('button:visible').evaluateAll((nodes) =>
    nodes
      .filter((n) => !n.closest('.parent-panel'))
      .map((n) => {
        const b = n.getBoundingClientRect();
        return { h: b.height, w: b.width, x: b.x, y: b.y, right: b.right, bottom: b.bottom };
      }),
  );
  const size = page.viewportSize()!;
  for (const b of bounds) {
    expect(b.h).toBeGreaterThanOrEqual(44);
    expect(b.w).toBeGreaterThanOrEqual(44);
    expect(b.x).toBeGreaterThanOrEqual(-1);
    expect(b.y).toBeGreaterThanOrEqual(-1);
    expect(b.right).toBeLessThanOrEqual(size.width + 1);
    expect(b.bottom).toBeLessThanOrEqual(size.height + 1);
  }
}
async function useToy(page: Page, episodeId: string, actionId: string) {
  await page.locator(`[data-action="${actionId}"]`).click();
  const target =
    episodeId === 'jini-needs'
      ? ({ food: 'bowl', water: 'waterBowl', walk: 'door' } as Record<string, string>)[actionId]
      : episodeId === 'hauri-blocks' && actionId === 'share_idea'
        ? 'building'
        : undefined;
  if (target) await page.locator(`[data-target="${target}"]`).click();
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const open = indexedDB.open('jiyul-day', 1);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('plays').objectStore('plays').getAll();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('그림 지도와 놀이 장면은 모바일·태블릿에서 스크롤 없이 보여요', async ({ page }) => {
  await setup(page);
  await expect(page.locator('.world-map')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/v2-map-mobile.png' });
  await page.getByRole('button', { name: '우리 집', exact: true }).click();
  await page.getByRole('button', { name: '기존 이야기 고르기' }).click();
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/v2-room-mobile.png' });
  await page.getByRole('button', { name: '지니가 배고파요', exact: true }).click();
  await ready(page);
  await page.getByRole('button', { name: '지니 만지기' }).click();
  await expect(page.locator('.toy-item')).toHaveCount(4);
  await page.waitForTimeout(350);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/v2-play-mobile.png' });
  await page.setViewportSize({ width: 800, height: 1100 });
  await page.waitForTimeout(350);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/v2-play-tablet.png' });
  await page.setViewportSize({ width: 900, height: 500 });
  await page.waitForTimeout(350);
  await noOverflow(page);
  await page.screenshot({ path: 'test-results/v2-play-landscape.png' });
});

test('밥 주기는 끌어놓기로, 잘못 놓으면 기록 없이 돌아와요', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await start(page);
  await expect(page.locator('.play-world')).toHaveAttribute('data-variation', 'hungry');
  const toy = page.locator('[data-action="food"]');
  await expect(toy).toBeVisible();
  const original = (await toy.boundingBox())!;
  const wrong = (await page.locator('[data-target="waterBowl"]').boundingBox())!;
  await page.mouse.move(original.x + original.width / 2, original.y + original.height / 2);
  await page.mouse.down();
  await page.mouse.move(wrong.x + wrong.width / 2, wrong.y + wrong.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.play-world')).toHaveAttribute('data-phase', 'choose');
  expect(await records(page)).toHaveLength(0);
  const bowl = (await page.locator('[data-target="bowl"]').boundingBox())!;
  await page.mouse.move(original.x + original.width / 2, original.y + original.height / 2);
  await page.mouse.down();
  await page.mouse.move(bowl.x + bowl.width / 2, bowl.y + bowl.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.food-effect')).toBeVisible();
  await expect(page.locator('.success-ring')).toBeVisible();
  const ring = (await page.locator('.success-ring').boundingBox())!;
  const board = (await page.locator('.play-world').boundingBox())!;
  expect(Math.abs(ring.x + ring.width / 2 - (board.x + board.width / 2))).toBeLessThan(2);
  expect(Math.abs(ring.y + ring.height / 2 - (board.y + board.height / 2))).toBeLessThan(2);
  await expect(page.locator('.short-speech')).toContainText('냠냠');
  await expect.poll(async () => (await records(page)).length).toBe(1);
  expect((await records(page))[0]).toMatchObject({
    actionId: 'food',
    input: 'drag',
    completed: true,
  });
  await page.screenshot({ path: 'test-results/v2-feeding.png' });
  await expect(page.locator('.success-ring')).not.toBeVisible({ timeout: 4000 });
  await expect(page.getByRole('button', { name: '다시 놀기', exact: true })).toBeVisible({
    timeout: 10000,
  });
});

for (const scenario of [
  { random: 0.5, variant: 'thirsty', action: 'water', effect: '.water-effect' },
  { random: 0.95, variant: 'walk', action: 'walk', effect: '.grown-up' },
]) {
  test(`${scenario.variant}: 같은 방에서도 필요한 행동이 달라져요`, async ({ page }) => {
    await setup(page, 0, scenario.random);
    await start(page);
    await expect(page.locator('.play-world')).toHaveAttribute('data-variation', scenario.variant);
    await expect(page.locator('.toy-item')).toHaveCount(4);
    await useToy(page, 'jini-needs', 'food');
    await expect(page.locator('.play-world')).toHaveAttribute('data-phase', 'response');
    await expect(page.locator('.short-speech')).not.toContainText('냠냠');
    await page.getByRole('button', { name: '이야기 이어가기' }).click();
    await expect(page.locator('.toy-item')).toHaveCount(4);
    await useToy(page, 'jini-needs', scenario.action);
    await expect(page.locator(scenario.effect)).toBeVisible();
    await page.getByRole('button', { name: '이야기 이어가기' }).click();
    await expect(page.getByRole('button', { name: '다시 놀기', exact: true })).toBeVisible();
  });
}

test('집의 기존 이야기가 끝나고 부모 기록·설정은 남아요', async ({ page }) => {
  // Four map walks and two friend greetings deliberately take real animation time.
  test.setTimeout(60000);
  await setup(page);
  for (const episode of data.filter((e) => e.place === 'home')) {
    await start(page, episode.id);
    await expect(page.locator('.toy-item')).toHaveCount(4);
    await page.getByRole('button', { name: '말했어요', exact: true }).click();
    await page.getByRole('button', { name: '함께 살펴보기' }).click();
    const variantId = await page.locator('.play-world').getAttribute('data-variation');
    const variant = episode.variations.find((v) => v.id === variantId)!;
    const ending = variant.actions.find((a) => a.complete)!;
    await useToy(page, episode.id, ending.id);
    await page.getByRole('button', { name: '이야기 이어가기' }).click();
    await expect(page.getByRole('button', { name: '다른 이야기 만나기' })).toBeVisible();
    await page.getByRole('button', { name: '다른 이야기 만나기' }).click();
    await expect(page.locator('.activity-object')).toHaveCount(2);
    await page.getByRole('button', { name: '처음으로', exact: true }).click();
  }
  await parent(page);
  await expect(page.locator('.record-list article')).toHaveCount(2);
  await expect(page.locator('.record-list')).toContainText('부모가 관찰함');
  await page.getByLabel('선택지 개수').selectOption('2');
  await page.getByLabel('선택지 기다리기').selectOption('8');
  await page.getByLabel('전체 대사 자막').check();
  await page.reload();
  await parent(page);
  await expect(page.getByLabel('선택지 개수')).toHaveValue('2');
  await expect(page.getByLabel('선택지 기다리기')).toHaveValue('8');
  await expect(page.getByLabel('전체 대사 자막')).toBeChecked();
  await expect(page.locator('.record-list article')).toHaveCount(2);
});

test('관찰을 건너뛰고 선택지 개수를 바꿀 수 있으며 부모 화면에서는 반응이 멈춰요', async ({
  page,
}) => {
  await setup(page, 8);
  await start(page);
  await expect(page.locator('.toy-item')).toHaveCount(0);
  await page.getByRole('button', { name: '기다리기 건너뛰기' }).click();
  await expect(page.locator('.toy-item')).toHaveCount(4);
  await parent(page);
  await page.getByLabel('선택지 개수').selectOption('2');
  await page.getByRole('button', { name: '부모 설정 닫기' }).click();
  await expect(page.locator('.toy-item')).toHaveCount(2);
  await useToy(page, 'jini-needs', 'food');
  await parent(page);
  await page.waitForTimeout(4000);
  await page.getByRole('button', { name: '부모 설정 닫기' }).click();
  await expect(page.locator('.play-world')).toHaveAttribute('data-phase', 'response');
  await page.getByRole('button', { name: '이야기 이어가기' }).click();
  await expect(page.getByRole('button', { name: '다시 놀기', exact: true })).toBeVisible();
});

test('오프라인에서도 그림 지도와 직접 조작 장면을 열어요', async ({ page, context }) => {
  await setup(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await start(page);
  await expect(page.locator('.toy-item')).toHaveCount(4);
  await useToy(page, 'jini-needs', 'food');
  await expect(page.locator('.food-effect')).toBeVisible();
  await context.setOffline(false);
});

test('놀이를 마친 뒤 새 버전을 적용해도 설정을 유지해요', async ({ page }) => {
  test.setTimeout(120000);
  const { readFile, writeFile } = await import('node:fs/promises');
  const path = new URL('../../dist/sw.js', import.meta.url);
  const original = await readFile(path, 'utf8');
  try {
    await setup(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await start(page);
    await writeFile(path, original + '\n// 새 놀이 버전 전환 검증\n');
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
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
    await expect(page.locator('.world-map')).toBeVisible();
    await parent(page);
    await expect(page.getByLabel('선택지 개수')).toHaveValue('4');
  } finally {
    await writeFile(path, original);
  }
});

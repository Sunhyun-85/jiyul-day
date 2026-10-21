import { test, expect, type Page } from '@playwright/test';
async function open(page: Page, random = 0.1) {
  await page.addInitScript((r) => {
    Math.random = () => r;
    localStorage.setItem(
      'jiyul-settings',
      JSON.stringify({ voice: false, parentMode: true, choices: 4, speed: 'normal', wait: 0 }),
    );
  }, random);
  await page.goto('/');
  await page.getByRole('button', { name: '우리 집', exact: true }).click();
  await expect(page.locator('.home-game')).toHaveAttribute('data-ready', 'true');
}
async function state(page: Page) {
  return JSON.parse((await page.locator('.home-game').getAttribute('data-state'))!);
}
async function point(page: Page, x: number, y: number) {
  const b = (await page.locator('canvas').boundingBox())!;
  const v = (await state(page)).viewport;
  return { x: b.x + (x * b.width) / 720, y: b.y + ((y + v.offset) * b.height) / v.height };
}
async function tap(page: Page, x: number, y: number) {
  const p = await point(page, x, y);
  await page.mouse.click(p.x, p.y);
}
async function item(page: Page, id: string, dy = 0) {
  const p = (await state(page)).objects[id];
  await tap(page, p.x, p.y + dy);
}
async function drag(page: Page, id: string, x: number, y: number) {
  const object = (await state(page)).objects[id];
  const a = await point(page, object.x, object.y),
    b = await point(page, x, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 15 });
  await page.mouse.up();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const e: string[] = [];
  errors.set(page, e);
  page.on('pageerror', (x) => e.push(x.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('BROWSER', m.text());
  });
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
test('집에서 당근을 끌면 지니가 물고 돌아오고 다시 받을 수 있어요', async ({ page }) => {
  await open(page);
  await page.screenshot({ path: 'test-results/home-mobile.png' });
  await drag(page, 'carrot', 330, 850);
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
  await expect.poll(async () => (await state(page)).behavior, { timeout: 10000 }).toBe('idle');
  expect((await state(page)).state.energy).toBe(79);
  expect((await state(page)).positiveFeedback).toBe(true);
  await page.screenshot({ path: 'test-results/home-carrot.png' });
  await expect.poll(async () => (await state(page)).positiveFeedback).toBe(false);
  await item(page, 'carrot');
  await expect.poll(async () => (await state(page)).owner).toBe('jiyul');
  await tap(page, 330, 880);
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
  await page.setViewportSize({ width: 800, height: 1100 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'test-results/home-tablet.png' });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});
test('배고픈 지니는 당근보다 밥그릇을 보고 사료를 먹은 뒤 놀아요', async ({ page }) => {
  await open(page, 0.4);
  expect((await state(page)).state.desire).toBe('food');
  await item(page, 'carrot');
  await tap(page, 340, 870);
  await expect.poll(async () => (await state(page)).behavior).toBe('seek_food');
  expect((await state(page)).owner).toBe('floor');
  expect((await state(page)).positiveFeedback).toBe(false);
  await drag(page, 'food', 350, 880);
  await page.waitForTimeout(300);
  expect((await state(page)).foodFilled).toBe(false);
  await drag(page, 'food', 454, 807);
  await expect.poll(async () => (await state(page)).animation, { timeout: 7000 }).toBe('eat');
  await expect.poll(async () => (await state(page)).state.hunger, { timeout: 7000 }).toBe(15);
  expect((await state(page)).foodFilled).toBe(false);
  expect((await state(page)).positiveFeedback).toBe(true);
  await item(page, 'carrot');
  await tap(page, 340, 875);
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
});
test('목마름과 피곤함은 물과 휴식으로 달라져요', async ({ page }) => {
  await open(page, 0.6);
  expect((await state(page)).state.desire).toBe('water');
  await item(page, 'waterBowl');
  await expect.poll(async () => (await state(page)).animation, { timeout: 7000 }).toBe('drink');
  await expect.poll(async () => (await state(page)).state.thirst, { timeout: 7000 }).toBe(13);
  expect((await state(page)).positiveFeedback).toBe(true);
});
test('피곤하면 당근을 쫓지 않고 침대에서 쉬어요', async ({ page }) => {
  await open(page, 0.95);
  expect((await state(page)).state.desire).toBe('rest');
  await item(page, 'carrot');
  await tap(page, 320, 850);
  await expect.poll(async () => (await state(page)).animation, { timeout: 8000 }).toBe('sleep');
  expect((await state(page)).owner).toBe('floor');
  await page.screenshot({ path: 'test-results/home-sleep.png' });
  await expect.poll(async () => (await state(page)).state.energy, { timeout: 7000 }).toBe(73);
});
test('부모 창은 진행을 멈추고 기존 이야기와 저장 기록을 유지해요', async ({ page }) => {
  await open(page, 0.4);
  await drag(page, 'food', 454, 807);
  await expect.poll(async () => (await state(page)).animation, { timeout: 7000 }).toBe('eat');
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.waitForTimeout(2400);
  expect((await state(page)).state.hunger).toBe(85);
  await page.getByLabel('확인 숫자').fill(await page.locator('.gate-code').innerText());
  await page.getByRole('button', { name: '설정 열기' }).click();
  await page.getByRole('button', { name: '부모 설정 닫기', exact: true }).click();
  await expect.poll(async () => (await state(page)).state.hunger, { timeout: 7000 }).toBe(15);
  await page.getByRole('button', { name: '기존 이야기 고르기' }).click();
  await expect(page.getByRole('button', { name: '지니가 배고파요', exact: true })).toBeVisible();
});
test('지율이 이동, 연속 끌기, 가로 화면, 오프라인 집 실행', async ({ page, context }) => {
  await open(page);
  await tap(page, 320, 650);
  await expect
    .poll(async () => Math.abs((await state(page)).objects.jiyul.x - 320))
    .toBeLessThan(3);
  await drag(page, 'carrot', 360, 850);
  await drag(page, 'carrot', 280, 650);
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
  await page.setViewportSize({ width: 900, height: 500 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/home-landscape.png' });
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '우리 집', exact: true }).click();
  await expect(page.locator('.home-game')).toHaveAttribute('data-ready', 'true');
});

test('휴대폰 터치 끌기와 키보드 대체 조작도 같은 놀이로 연결돼요', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await open(page);
  const carrot = (await state(page)).objects.carrot;
  const a = await point(page, carrot.x, carrot.y),
    b = await point(page, 350, 865);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: a.x, y: a.y }],
  });
  for (let i = 1; i <= 12; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 }],
    });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
  await expect.poll(async () => (await state(page)).behavior, { timeout: 10000 }).toBe('idle');
  const control = page.getByRole('button', { name: '물그릇 채우기', exact: true });
  await control.focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).animation, { timeout: 7000 }).toBe('drink');
  await expect.poll(async () => (await state(page)).state.thirst, { timeout: 7000 }).toBe(0);
  const saved = await page.evaluate(
    () =>
      new Promise<any[]>((resolve, reject) => {
        const r = indexedDB.open('jiyul-day', 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction('plays').objectStore('plays').getAll();
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
      }),
  );
  expect(
    saved.some(
      (r) =>
        r.episodeId === 'home-free' &&
        r.input === 'drag' &&
        r.freePlay?.outcome === 'returned_carrot',
    ),
  ).toBe(true);
  expect(saved.some((r) => r.actionId === 'water' && r.freePlay?.after.thirst === 0)).toBe(true);
});

test('졸린 지니를 침대에서 쉬게 하면 동작 줄이기에서도 초록 동그라미가 보여요', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, 0.95);
  await item(page, 'bed');
  await expect.poll(async () => (await state(page)).state.energy, { timeout: 9000 }).toBe(73);
  expect((await state(page)).positiveFeedback).toBe(true);
  await expect.poll(async () => (await state(page)).positiveFeedback).toBe(false);
});

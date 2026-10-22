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
test('지니가 가져온 당근을 지율이가 받아 정리하고 상자에서 다시 꺼내요', async ({ page }) => {
  await open(page);
  await page.screenshot({ path: 'test-results/home-mobile.png' });
  await drag(page, 'carrot', 330, 850);
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jini');
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jiyul');
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('box');
  await expect.poll(async () => (await state(page)).behavior).toBe('idle');
  expect((await state(page)).objects.jiyul).toEqual({ x: 165, y: 680 });
  expect((await state(page)).state.energy).toBe(66);
  expect((await state(page)).positiveFeedback).toBe(true);
  await page.screenshot({ path: 'test-results/home-carrot.png' });
  await expect.poll(async () => (await state(page)).positiveFeedback).toBe(false);
  await item(page, 'box');
  await expect.poll(async () => (await state(page)).behavior).toBe('retrieving');
  await expect.poll(async () => (await state(page)).owner).toBe('jiyul');
  expect((await state(page)).objects.jiyul.y).toBeCloseTo(570, 0);
  expect((await state(page)).selected).toBe('carrot');
  await tap(page, 330, 880);
  await expect.poll(async () => (await state(page)).behavior, { intervals: [50] }).toBe('throwing');
  await expect.poll(async () => (await state(page)).owner, { intervals: [50] }).toBe('floor');
  const flying = await state(page);
  expect(flying.behavior).toBe('throwing');
  expect(flying.objects.carrot.y).toBeLessThan(880);
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  const paused = (await state(page)).objects.carrot;
  await page.waitForTimeout(1100);
  expect((await state(page)).behavior).toBe('throwing');
  expect((await state(page)).objects.carrot).toEqual(paused);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/home-carrot-flight.png' });
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
  await expect.poll(async () => (await state(page)).objects.food).toEqual({ x: 95, y: 878 });
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
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('jiyul');
  await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('box');
  await expect.poll(async () => (await state(page)).behavior).toBe('idle');
  expect((await state(page)).objects.jiyul).toEqual({ x: 165, y: 680 });
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

test('정리 도중 당근을 다시 끌어도 인형이 사라지지 않고 새 놀이를 마쳐요', async ({ page }) => {
  await open(page);
  await drag(page, 'carrot', 340, 850);
  // Catch the stationary handoff, before the walking animation moves the hit target.
  await expect
    .poll(async () => (await state(page)).owner, {
      timeout: 12000,
      intervals: [50, 100],
    })
    .toBe('jiyul');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await drag(page, 'carrot', 350, 870);
  await expect.poll(async () => (await state(page)).owner).toBe('floor');
  await expect.poll(async () => (await state(page)).owner, { timeout: 12000 }).toBe('jini');
  await page.setViewportSize({ width: 800, height: 1100 });
  await expect.poll(async () => (await state(page)).owner, { timeout: 12000 }).toBe('box');
  expect((await state(page)).state.energy).toBe(66);
  await item(page, 'box');
  await expect.poll(async () => (await state(page)).selected).toBe('carrot');
  expect((await state(page)).owner).toBe('jiyul');
});

for (const [id, random, fill, animation, need, expected] of [
  ['food', 0.4, 'foodFilled', 'eat', 'hunger', 15],
  ['bottle', 0.6, 'waterFilled', 'drink', 'thirst', 13],
] as const) {
  test(`${id}: 선택하면 지율이가 들고 부은 뒤 용기를 놓고 처음 자리로 돌아와요`, async ({
    page,
  }) => {
    await open(page, random);
    const home = (await state(page)).objects[id];
    await item(page, id);
    await expect.poll(async () => (await state(page)).carriedSupply, { timeout: 7000 }).toBe(id);
    await expect
      .poll(async () => (await state(page)).carePhase, { timeout: 7000, intervals: [100] })
      .toBe('pour');
    expect((await state(page)).objects[id]).not.toEqual(home);
    expect((await state(page))[fill]).toBe(false);
    await page.screenshot({ path: `test-results/home-pour-${id}.png` });
    await expect.poll(async () => (await state(page))[fill], { timeout: 5000 }).toBe(true);
    await expect.poll(async () => (await state(page)).animation, { timeout: 7000 }).toBe(animation);
    await expect
      .poll(async () => (await state(page)).state[need], { timeout: 7000 })
      .toBe(expected);
    await expect.poll(async () => (await state(page)).behavior).toBe('idle');
    expect((await state(page)).carriedSupply).toBeNull();
    expect((await state(page)).objects[id]).toEqual(home);
    expect((await state(page)).objects.jiyul).toEqual({ x: 165, y: 680 });
    expect((await state(page))[fill]).toBe(false);
  });
}

test('사료를 붓기 전에 다른 놀이를 하면 먹은 것으로 기록하지 않고 봉지를 돌려놓아요', async ({
  page,
}) => {
  await open(page, 0.4);
  await item(page, 'food');
  await expect
    .poll(async () => (await state(page)).carePhase, { intervals: [50, 100] })
    .toBe('carry');
  await page.getByRole('button', { name: '지니 침대에서 쉬기', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).carePhase).toBeNull();
  expect((await state(page)).state.hunger).toBe(85);
  expect((await state(page)).foodFilled).toBe(false);
  expect((await state(page)).objects.food).toEqual({ x: 95, y: 878 });
});

test('짧게 두 번 놀고 나면 당근 대신 물과 밥을 원하고 돌봄 후에도 제자리로 돌아와요', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  for (let round = 0; round < 2; round++) {
    if (round) {
      await item(page, 'box');
      await expect.poll(async () => (await state(page)).owner).toBe('jiyul');
      await tap(page, 350, 870);
    } else await drag(page, 'carrot', 350, 870);
    await expect.poll(async () => (await state(page)).owner, { timeout: 10000 }).toBe('box');
    await expect.poll(async () => (await state(page)).behavior).toBe('idle');
    expect((await state(page)).objects.jiyul).toEqual({ x: 165, y: 680 });
  }
  expect((await state(page)).state.desire).toBe('water');
  await item(page, 'bottle');
  await expect.poll(async () => (await state(page)).state.desire, { timeout: 8000 }).toBe('food');
  await expect.poll(async () => (await state(page)).behavior).toBe('idle');
  await item(page, 'food');
  await expect.poll(async () => (await state(page)).state.desire, { timeout: 8000 }).toBe('play');
  await expect.poll(async () => (await state(page)).behavior).toBe('idle');
  expect((await state(page)).objects.jiyul).toEqual({ x: 165, y: 680 });
  expect((await state(page)).objects.food).toEqual({ x: 95, y: 878 });
  expect((await state(page)).objects.bottle).toEqual({ x: 221, y: 878 });
});

test('배고픈 지니도 요구를 유지하며 주변을 걸어 다니고 돌봄을 선택하면 따라요', async ({
  page,
}) => {
  await open(page, 0.4);
  const initial = (await state(page)).objects.jini;
  await expect.poll(async () => (await state(page)).roaming, { timeout: 7000 }).toBe(true);
  await expect
    .poll(async () => {
      const p = (await state(page)).objects.jini;
      return Math.hypot(p.x - initial.x, p.y - initial.y);
    })
    .toBeGreaterThan(35);
  expect((await state(page)).state.desire).toBe('food');
  await item(page, 'food');
  await expect.poll(async () => (await state(page)).carePhase).not.toBeNull();
  expect((await state(page)).roaming).toBe(false);
  await expect.poll(async () => (await state(page)).state.hunger, { timeout: 12000 }).toBe(15);
});

test('배변은 가끔 생기고 엄마를 부르면 중앙의 큰 동그라미와 정리로 반응해요', async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.install();
  await open(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  expect((await state(page)).accident).toBe('clear');
  await page.clock.runFor(62000);
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await expect(page.getByRole('button', { name: '부모 설정 닫기', exact: true })).toBeVisible();
  await page.clock.runFor(10000);
  expect((await state(page)).accident).toBe('clear');
  await page.getByRole('button', { name: '부모 설정 닫기', exact: true }).click();
  await page.clock.runFor(11000);
  await expect(page.getByRole('button', { name: '엄마 부르기', exact: true })).toBeVisible();
  expect((await state(page)).accident).toBe('waiting');
  expect((await state(page)).objects.poop).toBeDefined();
  await page.screenshot({ path: 'test-results/home-accident.png' });
  await item(page, 'poop');
  await page.clock.runFor(100);
  expect((await state(page)).positiveFeedback).toBe(false);
  expect((await state(page)).accident).toBe('waiting');
  await page.getByRole('button', { name: '엄마 부르기', exact: true }).click();
  await page.clock.runFor(300);
  expect((await state(page)).accident).toBe('cleaning');
  expect((await state(page)).feedback).toEqual({ x: 360, y: 500, diameter: 340 });
  await page.screenshot({ path: 'test-results/home-mom-feedback.png' });
  await page.clock.runFor(2300);
  expect((await state(page)).accident).toBe('clear');
  expect((await state(page)).objects.poop).toBeUndefined();
  expect((await state(page)).positiveFeedback).toBe(false);
  await expect(page.getByRole('button', { name: '엄마 부르기', exact: true })).toHaveCount(0);
});

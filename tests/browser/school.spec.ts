import { test, expect, type Page } from '@playwright/test';
import { COLORS } from '../../src/engine/SchoolPlayEngine';
async function setup(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => 0.5;
    localStorage.setItem(
      'jiyul-settings',
      JSON.stringify({
        voice: false,
        speed: 'normal',
        choices: 4,
        wait: 0,
        hints: true,
        captions: true,
        parentMode: true,
      }),
    );
  });
  await page.goto('/');
}
async function enter(page: Page) {
  await setup(page);
  await page.getByRole('button', { name: '유치원', exact: true }).click();
  await expect(page.locator('.map-jiyul')).toHaveClass(/map-walking/);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
}
async function state(page: Page) {
  return JSON.parse((await page.locator('.school-game').getAttribute('data-state'))!);
}
async function point(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  return { x: box.x + (box.width * x) / 720, y: box.y + (box.height * y) / 1000 };
}
test('장소로 걸어가고 우리가 다가와 놀이를 제안해요', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await expect(
    page.getByRole('button', { name: '우리: 지율아, 같이 놀자! 어떤 놀이 할까?' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '가위바위보', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '무지개 블록' })).toBeVisible();
  await expect(page.getByRole('button', { name: '기존 이야기 고르기' })).toHaveCount(0);
  await expect(page.getByText('이야기 놀이', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/school-invite.png' });
  expect(errors).toEqual([]);
});
test('그림으로 가위바위보를 내고 비긴 뒤 3승, 기록과 다시 놀기를 지원해요', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '가위바위보', exact: true }).click();
  await page.getByRole('button', { name: '바위', exact: true }).click();
  expect((await state(page)).scores).toEqual({ jiyul: 0, woori: 0 });
  await expect(page.getByText('똑같네! 한 번 더 하자.')).toBeVisible();
  await expect(page.getByRole('button', { name: '한 번 더!', exact: true })).toHaveCount(0);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'rps-pick');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: '보', exact: true }).click();
    expect((await state(page)).scores.jiyul).toBe(i);
    if (i < 3) await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'rps-pick');
  }
  await expect(page.getByText('지율이가 이겼어!', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/school-rps.png' });
  await page.getByRole('button', { name: '또 같이 놀자!' }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.getByLabel('확인 숫자').fill(await page.locator('.gate-code').innerText());
  await page.getByRole('button', { name: '설정 열기' }).click();
  await expect(page.getByText('우리와 가위바위보', { exact: true })).toBeVisible();
});
test('일곱 색, 잘못 고른 색의 힌트, 드래그 쌓기와 서로 색 골라 주기', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '무지개 블록' }).click();
  const s = await state(page);
  await expect(page.locator('.school-colors button')).toHaveCount(7);
  await page
    .getByRole('button', { name: `${COLORS[(s.requested + 1) % 7].name} 블록`, exact: true })
    .click();
  expect((await state(page)).blocks).toBe(0);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'block-color');
  await page.getByRole('button', { name: `${COLORS[s.requested].name} 블록`, exact: true }).click();
  const from = await point(page, 175, 755),
    target = await point(page, s.target.x, s.target.y);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'friend-color');
  await page.getByRole('button', { name: '파랑 블록', exact: true }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'block-color');
  expect((await state(page)).blocks).toBe(2);
  await page.screenshot({ path: 'test-results/school-blocks.png' });
});
test('가장자리에 놓아 무너뜨린 쪽이 지며 다시 시작할 수 있어요', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '무지개 블록' }).click();
  const s = await state(page);
  await page.getByRole('button', { name: `${COLORS[s.requested].name} 블록`, exact: true }).click();
  const edge = await point(page, 510, s.target.y);
  await page.mouse.click(edge.x, edge.y);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'result');
  expect((await state(page)).loser).toBe('jiyul');
  await page.getByRole('button', { name: '또 같이 놀자!' }).click();
  await page.getByRole('button', { name: '무지개 블록' }).click();
  expect((await state(page)).blocks).toBe(0);
  expect((await state(page)).loser).toBeNull();
});
test('부모 설정 중 친구의 차례가 멈추고 태블릿에서도 버튼이 보여요', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '무지개 블록' }).click();
  const s = await state(page);
  await page.getByRole('button', { name: `${COLORS[s.requested].name} 블록`, exact: true }).click();
  await page.getByRole('button', { name: '가운데에 올리기' }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'friend-color');
  await page.getByRole('button', { name: '초록 블록', exact: true }).click();
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.waitForTimeout(1600);
  expect((await state(page)).phase).toBe('friend-place');
  await page.keyboard.press('Escape');
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'block-color');
  for (const size of [
    { width: 360, height: 800 },
    { width: 800, height: 1100 },
    { width: 800, height: 500 },
  ]) {
    await page.setViewportSize(size);
    const boxes = await page.locator('.school-colors button').evaluateAll((nodes) =>
      nodes.map((n) => {
        const b = n.getBoundingClientRect();
        return { x: b.x, y: b.y, right: b.right, bottom: b.bottom, w: b.width, h: b.height };
      }),
    );
    for (const b of boxes) {
      expect(b.w).toBeGreaterThanOrEqual(44);
      expect(b.h).toBeGreaterThanOrEqual(44);
      expect(b.bottom).toBeLessThanOrEqual(size.height);
      expect(b.right).toBeLessThanOrEqual(size.width);
    }
  }
});

test('우리도 같은 균형 규칙으로 탑을 넘어뜨리면 패배해요', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => {
    Math.random = () => 0.99;
  });
  await page.getByRole('button', { name: '무지개 블록' }).click();
  for (let i = 0; i < 2; i++) {
    const s = await state(page);
    await page
      .getByRole('button', { name: `${COLORS[s.requested].name} 블록`, exact: true })
      .click();
    await page.getByRole('button', { name: '가운데에 올리기' }).click();
    await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'friend-color');
    await page.getByRole('button', { name: '노랑 블록', exact: true }).click();
    await expect(page.locator('.school-game')).toHaveAttribute(
      'data-phase',
      i === 0 ? 'block-color' : 'result',
    );
  }
  expect((await state(page)).loser).toBe('woori');
  await expect(page.getByText('지율이가 이겼어!', { exact: true })).toBeVisible();
});

test('지도 이동 중 부모 설정에서는 멈추고 선택한 집으로만 들어가요', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: '우리 집', exact: true }).click();
  await expect(page.getByRole('button', { name: '유치원', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.waitForTimeout(1900);
  await expect(page.locator('.world-map')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.home-game')).toHaveAttribute('data-ready', 'true');
});

test('휴대폰 터치로 블록을 끌고 오프라인에서도 유치원을 다시 열어요', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await enter(page);
  await page.getByRole('button', { name: '무지개 블록' }).click();
  const s = await state(page);
  await page.getByRole('button', { name: `${COLORS[s.requested].name} 블록`, exact: true }).click();
  const a = await point(page, 175, 755),
    b = await point(page, s.target.x, s.target.y);
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
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'friend-color');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '유치원', exact: true }).click();
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
});

test('다음 판 자동 진행은 부모 창에서 멈추고 놀이를 바꾸면 취소돼요', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: '가위바위보', exact: true }).click();
  await page.getByRole('button', { name: '바위', exact: true }).click();
  await page.getByRole('button', { name: '부모님', exact: true }).click();
  await page.waitForTimeout(4100);
  expect((await state(page)).phase).toBe('rps-reveal');
  await page.keyboard.press('Escape');
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'rps-pick');
  await page.getByRole('button', { name: '바위', exact: true }).click();
  await page.getByRole('button', { name: '놀이 다시 고르기' }).click();
  await page.getByRole('button', { name: '무지개 블록' }).click();
  await page.waitForTimeout(4100);
  await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'block-color');
});

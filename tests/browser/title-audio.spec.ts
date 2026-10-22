import { test, expect } from '@playwright/test';
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  },
});
test.describe('제목 자동 재생과 반복 방지', () => {
  async function observeTitle(
    page: import('@playwright/test').Page,
    blocked = false,
    muted = false,
  ) {
    await page.addInitScript(
      ({ blocked, muted }) => {
        localStorage.setItem('jiyul-settings', JSON.stringify({ voice: !muted, speed: 'normal' }));
        (window as any).titleCalls = 0;
        (window as any).titleMedia = [];
        const original = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.src.includes('narrator_b5df1916438eb387')) {
            (window as any).titleCalls++;
            (window as any).titleMedia.push(this);
            if (blocked && (window as any).titleCalls === 1)
              return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
          }
          return original.call(this);
        };
      },
      { blocked, muted },
    );
    await page.goto('/');
  }
  test('클릭 없이 한 번 재생하고 제목 터치나 지도 재방문으로 반복하지 않아요', async ({ page }) => {
    await observeTitle(page);
    await expect
      .poll(() => page.evaluate(() => (window as any).titleMedia[0]?.currentTime ?? 0))
      .toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: '제목 음성 듣기' })).toHaveCount(0);
    await page.locator('.map-title').click();
    await page.locator('.map-title').click();
    expect(await page.evaluate(() => (window as any).titleCalls)).toBe(1);
    await page.getByRole('button', { name: '유치원', exact: true }).click();
    await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
    await page.getByRole('button', { name: '처음으로', exact: true }).click();
    await page.locator('.map-title').click();
    expect(await page.evaluate(() => (window as any).titleCalls)).toBe(1);
  });
  test('자동 재생이 막혀도 장소 선택이나 제목 터치 때 뒤늦게 재생하지 않아요', async ({ page }) => {
    await observeTitle(page, true);
    await expect.poll(() => page.evaluate(() => (window as any).titleCalls)).toBe(1);
    await page.locator('.map-title').click();
    await page.getByRole('button', { name: '유치원', exact: true }).click();
    await expect(page.locator('.school-game')).toHaveAttribute('data-phase', 'menu');
    expect(await page.evaluate(() => (window as any).titleCalls)).toBe(1);
    expect(await page.evaluate(() => (window as any).titleMedia[0].currentTime)).toBe(0);
  });
  test('음소거 설정이면 자동 재생도 터치 재생도 하지 않아요', async ({ page }) => {
    await observeTitle(page, false, true);
    await page.locator('.map-title').click();
    await page.locator('.map-greeting').click();
    expect(await page.evaluate(() => (window as any).titleCalls)).toBe(0);
  });
});

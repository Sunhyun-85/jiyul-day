import { describe, expect, it } from 'vitest';
import { HomeLifeEngine } from '../src/engine/HomeLifeEngine';
describe('가끔 발생하는 배변과 어른에게 도움 요청', () => {
  it('처음부터 발생하지 않고 실제 놀이 시간이 충분히 지난 뒤 대기해요', () => {
    const life = new HomeLifeEngine(() => 0);
    life.advance(64000);
    expect(life.begin()).toBe(false);
    life.advance(1000);
    expect(life.begin()).toBe(true);
    expect(life.due).toBe(false);
    expect(life.callMom()).toBe(false);
    life.appear();
    expect(life.callMom()).toBe(true);
    expect(life.callMom()).toBe(false);
  });
  it('식사 직후 바로 발생하지 않고 정리 후에도 충분한 간격을 둬요', () => {
    const life = new HomeLifeEngine(() => 0);
    life.advance(10000);
    life.afterMeal();
    life.advance(19999);
    expect(life.due).toBe(false);
    life.advance(1);
    expect(life.begin()).toBe(true);
    life.appear();
    life.callMom();
    life.cleaned();
    life.afterMeal();
    life.advance(89999);
    expect(life.due).toBe(false);
    life.advance(1);
    expect(life.due).toBe(true);
  });
  it('중간에 다른 행동을 하면 잠시 미루고 도움 대기·정리는 취소하지 않아요', () => {
    const life = new HomeLifeEngine(() => 0);
    life.advance(65000);
    life.begin();
    life.interrupt();
    expect(life.phase).toBe('clear');
    expect(life.due).toBe(false);
    life.advance(5000);
    life.begin();
    life.appear();
    life.interrupt();
    expect(life.phase).toBe('waiting');
    life.callMom();
    life.interrupt();
    expect(life.phase).toBe('cleaning');
  });
});

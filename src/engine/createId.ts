let sequence = 0;
// 로컬 와이파이의 HTTP 개발 환경에서도 기록 ID를 만들 수 있어요.
export function createId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `local-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`
  );
}

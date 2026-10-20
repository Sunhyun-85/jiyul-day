import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>이야기를 불러오지 못했어요.</h1>
        <p>화면을 새로 열어 주세요. 계속되면 이야기 자료를 확인해 주세요.</p>
        <button onClick={() => location.reload()}>다시 열기</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
const root = createRoot(document.getElementById('root')!);
import('./App')
  .then(({ default: App }) =>
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <div className="fatal">
        <h1>이야기 준비 중 문제가 생겼어요.</h1>
        <p>인터넷 연결 또는 이야기 자료를 확인해 주세요.</p>
        <button onClick={() => location.reload()}>다시 열기</button>
      </div>,
    ),
  );
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloading = false;
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      if (hadController && !reloading) {
        reloading = true;
        location.reload();
      }
    });
    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        const announce = () => {
          if (reg.waiting && navigator.serviceWorker.controller)
            window.dispatchEvent(new CustomEvent('game-update', { detail: reg.waiting }));
        };
        announce();
        reg.addEventListener('updatefound', () => {
          reg.installing?.addEventListener('statechange', announce);
        });
        window.addEventListener('focus', () => void reg.update().catch(() => {}));
      })
      .catch(() => {});
  });
}

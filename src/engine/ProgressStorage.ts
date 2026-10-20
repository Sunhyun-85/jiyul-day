import type { PlayRecord, Settings } from './types';
export const defaults: Settings = {
  choices: 3,
  speed: 'slow',
  wait: 4,
  hints: true,
  voice: true,
  parentMode: false,
  captions: false,
};
export function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('jiyul-settings') ?? '{}');
    return {
      choices: [2, 3, 4].includes(s.choices) ? s.choices : 3,
      speed: s.speed === 'normal' ? 'normal' : 'slow',
      wait: [0, 4, 8].includes(s.wait) ? s.wait : 4,
      hints: typeof s.hints === 'boolean' ? s.hints : true,
      voice: typeof s.voice === 'boolean' ? s.voice : true,
      parentMode: s.parentMode === true,
      captions: s.captions === true,
    };
  } catch {
    return { ...defaults };
  }
}
export function saveSettings(settings: Settings) {
  localStorage.setItem('jiyul-settings', JSON.stringify(settings));
}
export class ProgressStorage {
  private db?: Promise<IDBDatabase>;
  private open() {
    return (this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('jiyul-day', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('plays', { keyPath: 'id' });
        request.result.createObjectStore('visits', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('다른 창을 닫고 다시 열어 주세요.'));
    }));
  }
  private async write(store: string, value: unknown) {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  private async all<T>(store: string): Promise<T[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(store).objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  add(record: PlayRecord) {
    return this.write('plays', record);
  }
  visit(id: string, episodeId: string, variationId: string) {
    return this.write('visits', { id, episodeId, variationId, date: new Date().toISOString() });
  }
  async history(episodeId: string) {
    return (await this.all<{ episodeId: string; variationId: string; date: string }>('visits'))
      .filter((v) => v.episodeId === episodeId)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((v) => v.variationId);
  }
  async recent() {
    return (await this.all<PlayRecord>('plays'))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 100);
  }
}
export const storage = new ProgressStorage();

// localStorage の薄いラッパ（JSON 保存）。

const PREFIX = 'acs:'; // AtCoder Step-up

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 容量超過など
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key);
}

// 設定とロードマップ進捗のキー。
export const KEYS = {
  settings: 'settings',   // { user, rating, apiKey, model }
  roadmap: 'roadmap',     // { [skillId]: true }
  start: 'start',         // { [stepId]: true }
};

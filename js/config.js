// アプリ全体の定数。

// AtCoder 難易度の色帯。min <= difficulty < max。
export const COLORS = [
  { key: 'gray',   nameJa: '灰',   min: -Infinity, max: 400,      css: 'var(--c-gray)' },
  { key: 'brown',  nameJa: '茶',   min: 400,       max: 800,      css: 'var(--c-brown)' },
  { key: 'green',  nameJa: '緑',   min: 800,       max: 1200,     css: 'var(--c-green)' },
  { key: 'cyan',   nameJa: '水',   min: 1200,      max: 1600,     css: 'var(--c-cyan)' },
  { key: 'blue',   nameJa: '青',   min: 1600,      max: 2000,     css: 'var(--c-blue)' },
  { key: 'yellow', nameJa: '黄',   min: 2000,      max: 2400,     css: 'var(--c-yellow)' },
  { key: 'orange', nameJa: '橙',   min: 2400,      max: 2800,     css: 'var(--c-orange)' },
  { key: 'red',    nameJa: '赤',   min: 2800,      max: Infinity, css: 'var(--c-red)' },
];

// AtCoder Problems (kenkoooo) のエンドポイント。
export const API = {
  problems: 'https://kenkoooo.com/atcoder/resources/problems.json',
  models: 'https://kenkoooo.com/atcoder/resources/problem-models.json',
  submissions: (user, fromSecond) =>
    `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${fromSecond}`,
};

// AtCoder の問題ページ URL。
export const problemUrl = (contestId, problemId) =>
  `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`;

// AI ヒントで選べるモデル（既定は最上位の Opus 4.8）。
export const MODELS = [
  { id: 'claude-opus-4-8',  label: 'Opus 4.8（最高精度・既定）' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6（バランス）' },
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5（高速・低コスト）' },
];
export const DEFAULT_MODEL = 'claude-opus-4-8';

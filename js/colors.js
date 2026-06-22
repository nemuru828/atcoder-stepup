// 難易度 → 色帯の変換ヘルパー。
import { COLORS } from './config.js';

// difficulty（数値 or null）から色帯定義を返す。null は「未推定」。
export function bandOf(difficulty) {
  if (difficulty === null || difficulty === undefined || Number.isNaN(difficulty)) return null;
  return COLORS.find((c) => difficulty >= c.min && difficulty < c.max) || COLORS[COLORS.length - 1];
}

// 色帯キーから定義を取得。
export function bandByKey(key) {
  return COLORS.find((c) => c.key === key) || null;
}

// 次の色（1つ上）。最上位なら null。
export function nextBand(key) {
  const i = COLORS.findIndex((c) => c.key === key);
  return i >= 0 && i < COLORS.length - 1 ? COLORS[i + 1] : null;
}

// AtCoder Problems と同じ「補正後の表示難易度」。400 未満は圧縮される。
export function displayDifficulty(difficulty) {
  if (difficulty === null || difficulty === undefined || Number.isNaN(difficulty)) return null;
  if (difficulty >= 400) return Math.round(difficulty);
  return Math.round(400 / Math.exp((400 - difficulty) / 400));
}

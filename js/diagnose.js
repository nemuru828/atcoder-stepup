// 診断ロジック：AC 集合から難易度分布と現在地を推定。
import { COLORS } from './config.js';
import { bandOf, bandByKey } from './colors.js';

// 配列のパーセンタイル値（p: 0..1）。
function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

// acSet: Set<problemId>, problems: 配列, models: { id: { difficulty } }
// 戻り値: { counts: {key:n}, total, solvedWithDiff, estimatedKey, p90 }
export function diagnose(acSet, problems, models) {
  const counts = Object.fromEntries(COLORS.map((c) => [c.key, 0]));
  const diffs = [];

  for (const p of problems) {
    if (!acSet.has(p.id)) continue;
    const m = models[p.id];
    const d = m && typeof m.difficulty === 'number' ? m.difficulty : null;
    const band = bandOf(d);
    if (!band) continue; // 難易度不明の AC は分布に含めない
    counts[band.key]++;
    diffs.push(d);
  }

  diffs.sort((a, b) => a - b);
  const p90 = percentile(diffs, 0.9);
  // 現在地の推定：解いた問題の上位 1 割の難易度帯（レーティングの近似）。
  const estimatedBand = bandOf(p90);

  return {
    counts,
    total: acSet.size,
    solvedWithDiff: diffs.length,
    estimatedKey: estimatedBand ? estimatedBand.key : null,
    p90: p90 !== null ? Math.round(p90) : null,
  };
}

// レーティング値（任意入力）から色帯キー。
export function bandKeyFromRating(rating) {
  if (rating === null || rating === undefined || rating === '' || Number.isNaN(Number(rating))) return null;
  const b = bandOf(Number(rating));
  return b ? b.key : null;
}

// 「次に目指す色」を現在色キーから返す（color オブジェクト）。
export function targetFromCurrent(currentKey) {
  const i = COLORS.findIndex((c) => c.key === currentKey);
  if (i < 0) return bandByKey('brown');
  return COLORS[Math.min(i + 1, COLORS.length - 1)];
}

// 問題リコメンド：目標色に応じた難易度帯から未 AC を厳選。

// 目標色キー -> 推奨難易度の窓 [lo, hi]。
// 「今の少し上」を中心に、その色に到達するために解くべき帯。
const WINDOWS = {
  brown: [1, 500],
  green: [300, 900],
  cyan: [700, 1300],
  blue: [1100, 1700],
};

// opts: { acSet, exclude, problems, models, targetKey, abcOnly, includeHarder, count }
export function recommend({ acSet, exclude, problems, models, targetKey, abcOnly = true, includeHarder = false, count = 20 }) {
  const win = WINDOWS[targetKey] || WINDOWS.green;
  const lo = win[0];
  const hi = win[1] + (includeHarder ? 300 : 0);
  const skip = exclude || new Set();

  const out = [];
  for (const p of problems) {
    if (acSet.has(p.id) || skip.has(p.id)) continue;
    if (abcOnly && !p.id.startsWith('abc') && !p.contest_id.startsWith('abc')) continue;
    const m = models[p.id];
    const d = m && typeof m.difficulty === 'number' ? m.difficulty : null;
    if (d === null) continue;
    if (d < lo || d > hi) continue;
    out.push({ ...p, difficulty: d });
  }

  // 難易度の低い順（=取り組みやすい順）。同点は新しいコンテスト優先。
  out.sort((a, b) => a.difficulty - b.difficulty || (a.contest_id < b.contest_id ? 1 : -1));

  return out.slice(0, count);
}

// 目標色キーから対象難易度の窓 [lo, hi] を返す（UI 表示用）。
export function windowOf(targetKey, includeHarder = false) {
  const w = WINDOWS[targetKey] || WINDOWS.green;
  return [w[0], w[1] + (includeHarder ? 300 : 0)];
}

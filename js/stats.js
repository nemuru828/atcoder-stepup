// 提出データから統計を計算（実力推定・精進ペース）。
import { COLORS } from './config.js';
import { bandOf } from './colors.js';

// 色帯ごとの「挑戦数・AC数」。attempted/acSet は Set<problemId>。
export function acRateByBand(acSet, attempted, models) {
  const stat = {};
  for (const c of COLORS) stat[c.key] = { attempted: 0, solved: 0 };
  for (const pid of attempted) {
    const m = models[pid];
    const d = m && typeof m.difficulty === 'number' ? m.difficulty : null;
    const b = bandOf(d);
    if (!b) continue;
    stat[b.key].attempted++;
    if (acSet.has(pid)) stat[b.key].solved++;
  }
  return stat;
}

// 各帯の代表難易度（推定用）。
const MID = { gray: 200, brown: 600, green: 1000, cyan: 1400, blue: 1800, yellow: 2200, orange: 2600, red: 3000 };

// AC率から「実力レート目安」（≒50%で解ける難易度）を推定。データ不足なら null。
export function estimateRating(stat) {
  const pts = [];
  for (const c of COLORS) {
    const s = stat[c.key];
    if (s.attempted >= 3) pts.push({ x: MID[c.key], rate: s.solved / s.attempted });
  }
  if (pts.length === 0) return null;
  pts.sort((a, b) => a.x - b.x);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a.rate >= 0.5 && b.rate < 0.5) {
      const t = (a.rate - 0.5) / (a.rate - b.rate);
      return Math.round(a.x + t * (b.x - a.x));
    }
  }
  return pts[pts.length - 1].rate >= 0.5 ? pts[pts.length - 1].x : pts[0].x;
}

// 安定して(>=80%)解けている難易度帯の上限キー。データ不足なら null。
export function stableBandKey(stat) {
  let key = null;
  for (const c of COLORS) {
    const s = stat[c.key];
    if (s.attempted >= 3 && s.solved / s.attempted >= 0.8) key = c.key;
  }
  return key;
}

// 活動統計：firstAc(Map pid->epochSec) から 総AC・今週AC・連続日数。
export function activity(firstAc) {
  const total = firstAc.size;
  const weekAgoSec = Date.now() / 1000 - 7 * 86400;
  let week = 0;
  const days = new Set();
  const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
  for (const epoch of firstAc.values()) {
    if (epoch >= weekAgoSec) week++;
    days.add(dayKey(epoch * 1000));
  }
  let streak = 0;
  const cur = new Date();
  if (!days.has(dayKey(cur.getTime()))) cur.setDate(cur.getDate() - 1); // 今日まだなら昨日起点
  while (days.has(dayKey(cur.getTime()))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return { total, week, streak };
}

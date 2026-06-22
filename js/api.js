// AtCoder Problems (kenkoooo) からのデータ取得。
import { API } from './config.js';

let _problems = null;       // [{ id, contest_id, problem_index, name, title }]
let _models = null;         // { [problemId]: { difficulty, ... } }

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`取得失敗 (${res.status}) ${url}`);
  return res.json();
}

// 全問題リスト（メモ化）。force で再取得。
export async function fetchProblems(force = false) {
  if (_problems && !force) return _problems;
  _problems = await getJson(API.problems);
  return _problems;
}

// 難易度モデル（メモ化）。problemId -> { difficulty, ... }
export async function fetchModels(force = false) {
  if (_models && !force) return _models;
  _models = await getJson(API.models);
  return _models;
}

export function clearCache() {
  _problems = null;
  _models = null;
}

export function isLoaded() {
  return !!(_problems && _models);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ユーザーの提出履歴をページングで全取得し、AC した問題 ID の集合を返す。
// v3 API は 1 ページ最大 500 件。onProgress(count) で進捗通知。
export async function fetchAcceptedSet(user, onProgress) {
  const ac = new Set();
  let fromSecond = 0;
  let total = 0;
  // 安全のため最大ページ数を制限（500*400 = 20万提出まで）。
  for (let page = 0; page < 400; page++) {
    const subs = await getJson(API.submissions(user, fromSecond));
    if (!Array.isArray(subs) || subs.length === 0) break;
    for (const s of subs) {
      total++;
      if (s.result === 'AC') ac.add(s.problem_id);
    }
    if (onProgress) onProgress(ac.size, total);
    if (subs.length < 500) break;
    // 次ページは最後の提出の epoch_second から。
    fromSecond = subs[subs.length - 1].epoch_second + 1;
    await sleep(300); // API への配慮
  }
  return ac;
}

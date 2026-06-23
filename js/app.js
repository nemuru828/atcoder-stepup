// エントリポイント：UI の配線。
import { COLORS, MODELS, DEFAULT_MODEL, problemUrl } from './config.js';
import { bandByKey, bandOf, nextBand } from './colors.js';
import { load, save, remove, KEYS } from './storage.js';
import * as api from './api.js';
import { diagnose, bandKeyFromRating, targetFromCurrent } from './diagnose.js';
import { recommend, windowOf } from './recommend.js';
import { displayDifficulty } from './colors.js';
import { generateHints, generateStudyPlan } from './ai.js';
import { acRateByBand, estimateRating, stableBandKey, activity, weeklyActivity, cumulativeWeekly } from './stats.js';
import { ROADMAP } from './data/roadmap.js';
import { FRAMEWORK, CATEGORIES } from './data/categories.js';
import { GET_STARTED } from './data/getstarted.js';

// ---- DOM ヘルパー ----
const $ = (sel) => document.querySelector(sel);
function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
function setStatus(id, message, kind = '') {
  const el = $(id);
  if (!message) { el.hidden = true; el.textContent = ''; el.className = 'status'; return; }
  el.hidden = false; el.textContent = message; el.className = 'status' + (kind ? ' ' + kind : '');
}
function badge(bandKey) {
  const b = bandByKey(bandKey);
  if (!b) return h('span', { class: 'badge', style: 'background: var(--c-none)' }, '未推定');
  return h('span', { class: 'badge', style: `background: ${b.css}` }, b.nameJa);
}

// ---- 状態 ----
const state = {
  settings: { user: '', rating: '', apiKey: '', model: DEFAULT_MODEL },
  acSet: null,
  acUser: null,
  userData: null,   // { acSet, attempted, firstAc }
  lastDiag: null,   // { currentKey, targetKey }
};

// ---- タブ ----
function initTabs() {
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === btn));
    const name = btn.dataset.tab;
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `panel-${name}`));
  });
}
function gotoTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `panel-${name}`));
}

// ---- データ取得 ----
async function ensureData() {
  if (api.isLoaded()) return;
  setStatus('#diag-status', '問題データを取得中…（初回は数 MB）');
  await Promise.all([api.fetchProblems(), api.fetchModels()]);
}
async function ensureUserData(user, statusId) {
  if (state.userData && state.acUser === user) return state.userData;
  setStatus(statusId, `${user} の提出を取得中…`);
  const data = await api.fetchUserData(user, (ac, att) => {
    setStatus(statusId, `${user} の提出を取得中…（AC ${ac} / 挑戦 ${att}）`);
  });
  state.userData = data; state.acSet = data.acSet; state.acUser = user;
  return data;
}

// ---- 設定 ----
function initSettings() {
  state.settings = load(KEYS.settings, state.settings) || state.settings;
  const sel = $('#set-model');
  MODELS.forEach((m) => sel.append(h('option', { value: m.id }, m.label)));

  $('#set-user').value = state.settings.user || '';
  $('#set-rating').value = state.settings.rating || '';
  $('#set-apikey').value = state.settings.apiKey || '';
  sel.value = state.settings.model || DEFAULT_MODEL;
  // 診断タブにもユーザー名を反映
  $('#diag-user').value = state.settings.user || '';
  $('#diag-rating').value = state.settings.rating || '';
  updateAiModelInfo();
  updateDataInfo();

  // ダークモード
  const ui = load(KEYS.ui, {}) || {};
  $('#set-dark').checked = !!ui.dark;
  applyDark(ui.dark);
  $('#set-dark').addEventListener('change', () => {
    const u = load(KEYS.ui, {}) || {};
    u.dark = $('#set-dark').checked; save(KEYS.ui, u); applyDark(u.dark);
  });

  $('#set-save').addEventListener('click', () => {
    state.settings = {
      user: $('#set-user').value.trim(),
      rating: $('#set-rating').value.trim(),
      apiKey: $('#set-apikey').value.trim(),
      model: $('#set-model').value,
    };
    save(KEYS.settings, state.settings);
    $('#diag-user').value = state.settings.user;
    $('#diag-rating').value = state.settings.rating;
    updateAiModelInfo();
    updatePlanInfo();
    $('#set-saved').textContent = '保存しました';
    setTimeout(() => ($('#set-saved').textContent = ''), 2000);
  });

  $('#set-clearkey').addEventListener('click', () => {
    $('#set-apikey').value = '';
    state.settings.apiKey = '';
    save(KEYS.settings, state.settings);
    updateAiModelInfo();
    updatePlanInfo();
    $('#set-saved').textContent = 'キーを消去しました';
    setTimeout(() => ($('#set-saved').textContent = ''), 2000);
  });

  $('#set-refresh').addEventListener('click', async () => {
    api.clearCache();
    $('#set-datainfo').textContent = '取得中…';
    try {
      await Promise.all([api.fetchProblems(true), api.fetchModels(true)]);
      updateDataInfo();
    } catch (err) {
      $('#set-datainfo').textContent = '取得失敗: ' + err.message;
    }
  });
}
function updateAiModelInfo() {
  const m = MODELS.find((x) => x.id === (state.settings.model || DEFAULT_MODEL));
  const keyState = state.settings.apiKey ? 'キー設定済み' : 'キー未設定（設定タブで入力）';
  $('#ai-modelinfo').textContent = `モデル: ${m ? m.label : state.settings.model} / ${keyState}`;
}
function updateDataInfo() {
  $('#set-datainfo').textContent = api.isLoaded() ? '取得済み' : '未取得（診断時に取得）';
}

// ---- 診断 ----
function initDiagnose() {
  $('#diag-run').addEventListener('click', runDiagnose);
}
async function runDiagnose() {
  const user = $('#diag-user').value.trim();
  const ratingInput = $('#diag-rating').value.trim();
  if (!user) { setStatus('#diag-status', 'ユーザー名を入力してください。', 'error'); return; }

  const btn = $('#diag-run'); btn.disabled = true; $('#diag-result').hidden = true;
  try {
    await ensureData();
    const data = await ensureUserData(user, '#diag-status');
    const ac = data.acSet;
    const problems = await api.fetchProblems();
    const models = await api.fetchModels();
    const result = diagnose(ac, problems, models);
    const rates = acRateByBand(ac, data.attempted, models);

    // 現在色：レーティング入力があれば優先、なければ推定。
    const ratedKey = bandKeyFromRating(ratingInput);
    const currentKey = ratedKey || result.estimatedKey;
    const target = targetFromCurrent(currentKey);

    // 設定にも反映保存
    state.settings.user = user;
    state.settings.rating = ratingInput;
    save(KEYS.settings, state.settings);

    state.lastDiag = { currentKey, targetKey: target.key };
    renderDiagSummary({ currentKey, fromRating: !!ratedKey, result, ratingInput, target });
    renderDist(result.counts);
    renderActivity(activity(data.firstAc));
    renderTrend(weeklyActivity(data.firstAc, 12));
    renderCumulative(cumulativeWeekly(data.firstAc, 26));
    renderAcRate(rates);
    const dataRating = estimateRating(rates);
    const stableKey = stableBandKey(rates);
    $('#diag-acrate-note').textContent = dataRating !== null
      ? `AC率からの実力レート目安 ≈ ${dataRating}（${(bandOf(dataRating) || {}).nameJa || '—'}）。`
        + `${stableKey ? '安定して(80%+)解けている上限は ' + bandByKey(stableKey).nameJa + '帯。' : ''}`
        + '下の「到達レート目安」に反映しました。'
      : 'AC率の推定には各難易度帯で3問以上の挑戦が必要です。';
    if (dataRating !== null) { $('#est-diff').value = dataRating; $('#est-prob').value = '0.5'; }
    $('#diag-note').textContent =
      `推定は「解いた問題の上位1割の難易度帯」を目安にしています。` +
      `目標の ${target.nameJa} に向けて、「問題」タブで未ACの問題を出せます。`;
    $('#diag-result').hidden = false;
    setStatus('#diag-status', `完了：AC ${result.total} 問（難易度判明 ${result.solvedWithDiff} 問）`, 'ok');

    // リコメンドの目標色を自動設定
    if (['brown', 'green', 'cyan', 'blue'].includes(target.key)) $('#rec-target').value = target.key;

    // 診断 → 問題 への往復導線（押すと目標色をセットして即出題）
    $('#diag-cta').replaceChildren(
      h('button', {
        class: 'btn primary',
        onclick: () => {
          if (['brown', 'green', 'cyan', 'blue'].includes(target.key)) $('#rec-target').value = target.key;
          gotoTab('recommend');
          runRecommend();
        },
      }, `${target.nameJa}の問題を出す →`),
    );
  } catch (err) {
    setStatus('#diag-status', '失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
function renderDiagSummary({ currentKey, fromRating, result, ratingInput, target }) {
  const box = $('#diag-summary'); box.replaceChildren();
  const ratingShown = fromRating ? ratingInput : (result.p90 !== null ? `≈ ${result.p90}` : '—');
  const card = (k, vNode) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, vNode));
  box.append(
    card(fromRating ? '現在の色（入力）' : '現在の色（推定）', badge(currentKey)),
    card('AC 数', String(result.total)),
    card('レート目安', String(ratingShown)),
    card('次に目指す色', badge(target.key)),
  );
}
function renderDist(counts) {
  const box = $('#diag-dist'); box.replaceChildren();
  const max = Math.max(1, ...COLORS.map((c) => counts[c.key] || 0));
  for (const c of COLORS) {
    const n = counts[c.key] || 0;
    box.append(h('div', { class: 'dist-row' },
      h('div', { class: 'lbl', style: `color:${c.css}` }, c.nameJa),
      h('div', { class: 'dist-bar' }, h('span', { style: `width:${(n / max) * 100}%; background:${c.css}` })),
      h('div', { class: 'n' }, String(n)),
    ));
  }
}
function renderActivity(a) {
  const box = $('#diag-activity'); box.replaceChildren();
  const card = (k, v) => h('div', { class: 'card' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
  box.append(card('総 AC 数', String(a.total)), card('今週の AC', String(a.week)), card('連続日数', `${a.streak} 日`));
}
function renderTrend(weekly) {
  const box = $('#diag-trend'); box.replaceChildren();
  const max = Math.max(1, ...weekly.map((w) => w.count));
  const chart = h('div', { class: 'trend' });
  weekly.forEach((w) => {
    const label = w.weeksAgo === 0 ? '今週' : `${w.weeksAgo}週前`;
    chart.append(h('div', { class: 'trend-bar', title: `${label}: ${w.count}問` },
      h('span', { style: `height:${(w.count / max) * 100}%` })));
  });
  box.append(h('div', { class: 'muted small' }, `直近 ${weekly.length} 週の解いた数（最大 ${max}/週・右端が今週）`), chart);
}
function renderCumulative(pts) {
  const box = $('#diag-cumulative'); box.replaceChildren();
  if (!pts.length) return;
  const W = 600, H = 120, pad = 6, n = pts.length;
  const maxCum = Math.max(1, pts[n - 1].cum);
  const x = (i) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - (v / maxCum) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join(' ');
  const area = `${pad.toFixed(1)},${(H - pad).toFixed(1)} ${line} ${(W - pad).toFixed(1)},${(H - pad).toFixed(1)}`;
  box.append(h('div', { class: 'muted small' }, `合計AC の推移（直近 ${n} 週・現在 ${pts[n - 1].cum}）`));
  box.insertAdjacentHTML('beforeend',
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="cumsvg" role="img" aria-label="合計ACの折れ線">`
    + `<polygon points="${area}" fill="var(--accent-soft)"></polygon>`
    + `<polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"></polyline>`
    + '</svg>');
}
function renderAcRate(rates) {
  const box = $('#diag-acrate'); box.replaceChildren();
  for (const c of COLORS) {
    const s = rates[c.key];
    if (!s || s.attempted === 0) continue;
    const rate = s.solved / s.attempted;
    box.append(h('div', { class: 'ar-row' },
      h('div', { class: 'lbl', style: `color:${c.css}` }, c.nameJa),
      h('div', { class: 'ar-bar' }, h('span', { style: `width:${Math.round(rate * 100)}%; background:${c.css}` })),
      h('div', { class: 'n' }, `${s.solved}/${s.attempted}（${Math.round(rate * 100)}%）`),
    ));
  }
  if (!box.children.length) box.append(h('p', { class: 'muted small' }, 'まだ挑戦データがありません。'));
}

// ---- 到達レート目安 ----
// 難易度 D を確率 P で解ける人の内部レート目安（AtCoder と同じ Elo 型ロジスティック）。
// difficulty は「50% で解けるレート」と定義されるので P=0.5 のとき R=D。
function reachableRating(D, P) {
  return Math.max(0, Math.round(D + 400 * Math.log10(P / (1 - P))));
}
function initEstimate() {
  const compute = () => {
    const raw = $('#est-diff').value.trim();
    if (raw === '' || Number.isNaN(Number(raw))) {
      $('#est-result').replaceChildren(h('p', { class: 'muted small' }, '難易度を入力してください。'));
      return;
    }
    const D = Number(raw);
    const P = Number($('#est-prob').value);
    const R = reachableRating(D, P);
    const band = bandOf(R);
    const next = band ? nextBand(band.key) : null;
    const probLabel = { '0.9': 'ほぼ確実に', '0.75': 'よく', '0.5': '半々で' }[String(P)] || '';
    const nextMsg = next ? `次の${next.nameJa}まであと約 ${Math.max(0, next.min - R)}。` : '最高位の色です。';
    const cta = next && ['brown', 'green', 'cyan', 'blue'].includes(next.key)
      ? h('button', { class: 'btn', onclick: () => { $('#rec-target').value = next.key; gotoTab('recommend'); } }, `${next.nameJa}の問題を出す →`)
      : null;
    $('#est-result').replaceChildren(h('div', { class: 'est-card' },
      h('div', {}, h('div', { class: 'muted small' }, '到達レート目安'), h('div', { class: 'big' }, `≈ ${R}`)),
      badge(band ? band.key : null),
      h('div', { class: 'muted small', style: 'flex:1 1 240px' },
        `難易度 ${D} を${probLabel}解けるなら、内部レートは約 ${R}（${band ? band.nameJa : '—'}）。${nextMsg}`),
      cta,
    ));
  };
  $('#est-run').addEventListener('click', compute);
  $('#est-presets').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $('#est-diff').value = chip.dataset.d;
    compute();
  });
}

// ---- リコメンド ----
function initRecommend() {
  $('#rec-run').addEventListener('click', runRecommend);
  $('#rec-godiag').addEventListener('click', () => gotoTab('diagnose'));
  renderFavorites();
  initMock();
}
async function runRecommend() {
  const user = (state.settings.user || $('#diag-user').value).trim();
  const btn = $('#rec-run'); btn.disabled = true;
  try {
    await ensureData();
    let ac = state.acSet;
    if (!ac) {
      if (user) ac = (await ensureUserData(user, '#rec-status')).acSet;
      else { ac = new Set(); setStatus('#rec-status', 'ユーザー名未設定のため未AC判定なしで表示します（設定タブで登録推奨）。'); }
    }
    const problems = await api.fetchProblems();
    const models = await api.fetchModels();
    const marks = load(KEYS.marks, {}) || {};
    const exclude = new Set(Object.keys(marks));
    const list = recommend({
      acSet: ac, exclude,
      problems, models,
      targetKey: $('#rec-target').value,
      abcOnly: $('#rec-abc').checked,
      includeHarder: $('#rec-harder').checked,
      count: Number($('#rec-count').value),
    });
    renderProblems(list);
    const [lo, hi] = windowOf($('#rec-target').value, $('#rec-harder').checked);
    const acNote = state.acSet ? '未AC・' : '未AC判定なし・';
    setStatus('#rec-status', `${list.length} 問（${acNote}対象難易度 ${lo}–${hi}${$('#rec-abc').checked ? '・ABC優先' : ''}）`, 'ok');
  } catch (err) {
    setStatus('#rec-status', '失敗: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
// 問題1件の表示（mode: 'rec' | 'fav' | 'mock'）。
function problemItem(p, mode) {
  const b = COLORS.find((c) => p.difficulty >= c.min && p.difficulty < c.max);
  const favs = load(KEYS.favorites, {}) || {};
  const actions = h('div', { class: 'pact' });

  const favBtn = h('button', { class: 'iconbtn fav' + (favs[p.id] ? ' on' : '') }, favs[p.id] ? '★' : '☆');
  favBtn.addEventListener('click', () => {
    const f = load(KEYS.favorites, {}) || {};
    if (f[p.id]) delete f[p.id];
    else f[p.id] = { title: p.title || p.name, contest: p.contest_id, id: p.id, difficulty: p.difficulty };
    save(KEYS.favorites, f);
    favBtn.classList.toggle('on', !!f[p.id]);
    favBtn.textContent = f[p.id] ? '★' : '☆';
    renderFavorites();
  });
  const open = h('a', { class: 'open btn', href: problemUrl(p.contest_id, p.id), target: '_blank', rel: 'noopener' }, '問題へ');

  if (mode === 'rec') {
    const done = h('button', { class: 'iconbtn' }, '解いた');
    done.addEventListener('click', () => markProblem(p.id, 'done'));
    const skip = h('button', { class: 'iconbtn' }, '興味なし');
    skip.addEventListener('click', () => markProblem(p.id, 'skip'));
    actions.append(favBtn, done, skip, open);
  } else {
    actions.append(favBtn, open);
  }

  return h('div', { class: 'problem', 'data-pid': p.id },
    h('span', { class: 'badge', style: `background:${b ? b.css : 'var(--c-none)'}` }, String(displayDifficulty(p.difficulty))),
    h('div', { class: 'ptitle' }, p.title || p.name, h('div', { class: 'pmeta' }, p.contest_id.toUpperCase())),
    actions,
  );
}
function markProblem(pid, kind) {
  const m = load(KEYS.marks, {}) || {};
  m[pid] = kind; save(KEYS.marks, m);
  document.querySelectorAll(`.problem[data-pid="${pid}"]`).forEach((el) => {
    if (el.closest('#rec-list') || el.closest('#mock-list')) el.remove();
  });
}
function renderProblems(list) {
  const box = $('#rec-list'); box.replaceChildren();
  if (!list.length) {
    box.append(h('p', { class: 'muted' }, '該当する未AC問題が見つかりませんでした。条件を変えてみてください。'));
    return;
  }
  list.forEach((p) => box.append(problemItem(p, 'rec')));
}
function renderFavorites() {
  const box = $('#fav-list'); if (!box) return; box.replaceChildren();
  const f = load(KEYS.favorites, {}) || {};
  const ids = Object.keys(f);
  if (!ids.length) { box.append(h('p', { class: 'muted small' }, 'お気に入りはまだありません。問題一覧の ☆ で追加できます。')); return; }
  ids.forEach((id) => {
    const v = f[id];
    box.append(problemItem({ id, contest_id: v.contest, title: v.title, difficulty: v.difficulty }, 'fav'));
  });
}

// カテゴリの練習リンク（例題は難易度バッジ付き）を生成。発想/弱点マップ共用。
function practiceLinksEl(cat) {
  const pr = h('div', { class: 'practice' }, h('div', { class: 'practice-label' }, '練習問題・問題集'));
  (cat.practice || []).forEach((p) => {
    const link = h('a', { class: 'plink', href: p.url, target: '_blank', rel: 'noopener' });
    if (typeof p.diff === 'number') {
      const b = bandOf(p.diff);
      link.append(h('span', { class: 'pbadge', style: `background:${b ? b.css : 'var(--c-none)'}` }, String(displayDifficulty(p.diff))));
    }
    link.append(` ${p.label}`);
    pr.append(link);
  });
  return pr;
}

// ---- 発想 ----
function initIdeas() {
  // フレームワーク
  const fw = $('#framework');
  FRAMEWORK.forEach((f) => fw.append(h('li', {}, h('b', {}, f.title + '：'), f.body)));

  // カテゴリ
  const grid = $('#cat-grid');
  CATEGORIES.forEach((cat) => {
    const steps = h('div', { class: 'steps' });
    cat.steps.forEach((s) => {
      steps.append(h('details', {}, h('summary', {}, s.q), h('p', {}, s.a)));
    });
    if (cat.practice && cat.practice.length) steps.append(practiceLinksEl(cat));
    grid.append(h('details', { class: 'cat' },
      h('summary', {}, h('span', {}, cat.name), h('span', { class: 'sig' }, cat.suspect)),
      steps,
    ));
  });

  $('#ai-run').addEventListener('click', runAi);
}
async function runAi() {
  const title = $('#ai-title').value.trim();
  const difficulty = $('#ai-diff').value.trim();
  const statement = $('#ai-statement').value.trim();
  const btn = $('#ai-run'); btn.disabled = true;
  $('#ai-result').replaceChildren();
  setStatus('#ai-status', 'ヒントを生成中…');
  try {
    const stages = await generateHints({
      apiKey: state.settings.apiKey,
      model: state.settings.model || DEFAULT_MODEL,
      title, difficulty, statement,
    });
    renderAiStages(stages);
    setStatus('#ai-status', null);
  } catch (err) {
    setStatus('#ai-status', err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}
function renderAiStages(stages) {
  const box = $('#ai-result'); box.replaceChildren();
  stages.forEach((s, i) => {
    box.append(h('details', { class: 'ai-stage', ...(i === 0 ? { open: '' } : {}) },
      h('summary', {}, s.label),
      h('div', { class: 'body' }, s.body),
    ));
  });
}

// ---- はじめに ----
function initStart() {
  const { steps, languages, faq } = GET_STARTED;
  const progress = load(KEYS.start, {}) || {};

  const total = steps.length;
  const doneCount = () => steps.filter((s) => progress[s.id]).length;

  // ステップ（チェックは保存）
  const sc = $('#start-steps');
  steps.forEach((s, i) => {
    const cb = h('input', { type: 'checkbox', ...(progress[s.id] ? { checked: '' } : {}) });
    const row = h('div', { class: 'start-step' + (progress[s.id] ? ' done' : '') },
      cb,
      h('div', { class: 'sbody' },
        h('div', { class: 'sname' }, `${i + 1}. ${s.title}`, s.time ? h('span', { class: 'stime' }, s.time) : null),
        h('div', { class: 'sdesc' }, s.desc)),
      s.link ? h('a', { class: 'open btn', href: s.link, target: '_blank', rel: 'noopener' }, s.linkLabel || '開く') : null,
    );
    cb.addEventListener('change', () => {
      if (cb.checked) progress[s.id] = true; else delete progress[s.id];
      save(KEYS.start, progress);
      row.classList.toggle('done', cb.checked);
      renderCta();
    });
    sc.append(row);
  });

  // 次の一歩 CTA（進捗バー＋タブ誘導）
  function renderCta() {
    const done = doneCount();
    const allDone = done === total;
    $('#start-cta').replaceChildren(
      h('div', { class: 'cta-top' },
        h('div', { class: 'cta-prog' }, `完了 ${done}/${total}`),
        h('div', { class: 'cta-bar' }, h('span', { style: `width:${(done / total) * 100}%` }))),
      h('div', { class: 'cta-msg' }, allDone
        ? '🎉 スタート完了！次は「ロードマップ」で 灰→茶 を目指しましょう。'
        : '全部終わらなくてOK。基本の入出力に慣れたら、ロードマップや発想タブも覗いてみましょう。'),
      h('div', { class: 'cta-actions' },
        h('button', { class: 'btn primary', onclick: () => gotoTab('roadmap') }, 'ロードマップを見る →'),
        h('button', { class: 'btn', onclick: () => gotoTab('ideas') }, '発想タブを見る'),
        h('button', { class: 'btn', onclick: () => gotoTab('diagnose') }, '診断を試す')),
    );
  }
  renderCta();

  // 言語の選び方
  const lc = $('#start-langs');
  languages.forEach((l) => {
    lc.append(h('div', { class: 'card' },
      h('div', { class: 'v' }, l.name),
      h('div', { class: 'k' }, 'こんな人に：' + l.for),
      h('p', { class: 'small' }, l.note),
      l.link ? h('a', { class: 'btn', href: l.link, target: '_blank', rel: 'noopener' }, l.linkLabel || '教材') : null,
    ));
  });

  // よくある疑問
  const fc = $('#start-faq');
  faq.forEach((f) => {
    fc.append(h('details', { class: 'cat' },
      h('summary', {}, h('span', {}, f.q)),
      h('div', { class: 'steps' }, h('p', {}, f.a)),
    ));
  });
}

// ---- ロードマップ ----
function initRoadmap() {
  const progress = load(KEYS.roadmap, {}) || {};
  const root = $('#roadmap');
  ROADMAP.forEach((t) => {
    const total = t.skills.length;
    const doneCount = () => t.skills.filter((s) => progress[s.id]).length;
    const pct = () => Math.round((doneCount() / total) * 100);
    const progEl = h('span', { class: 'prog' }, `${doneCount()}/${total}`);
    const toBand = bandByKey(t.to);
    const barSpan = h('span', { style: `width:${pct()}%; background:${toBand ? toBand.css : 'var(--accent)'}` });
    const block = h('div', { class: 'transition' },
      h('h3', {}, badge(t.from), '→', badge(t.to), t.title, progEl),
      h('p', { class: 'muted small' }, t.aim),
      h('div', { class: 'rm-bar' }, barSpan),
    );
    t.skills.forEach((s) => {
      const cb = h('input', { type: 'checkbox', ...(progress[s.id] ? { checked: '' } : {}) });
      const row = h('label', { class: 'skill' + (progress[s.id] ? ' done' : '') }, cb,
        h('div', {}, h('div', { class: 'sname' }, s.name), h('div', { class: 'sdesc' }, s.desc)));
      cb.addEventListener('change', () => {
        if (cb.checked) progress[s.id] = true; else delete progress[s.id];
        save(KEYS.roadmap, progress);
        row.classList.toggle('done', cb.checked);
        progEl.textContent = `${doneCount()}/${total}`;
        barSpan.style.width = `${pct()}%`;
      });
      block.append(row);
    });
    block.append(h('div', { class: 'rm-cta' },
      h('button', {
        class: 'btn primary',
        onclick: () => { const sel = $('#rec-target'); if (sel) sel.value = t.to; gotoTab('recommend'); },
      }, `${toBand ? toBand.nameJa : ''}の問題を解く →`),
    ));
    root.append(block);
  });
}

// ---- 模擬ABC ----
let mockTimer = null;
let mockRemain = 100 * 60;
const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function initMock() {
  $('#mock-make').addEventListener('click', makeMock);
  $('#mock-make-weak').addEventListener('click', makeMockWeak);
  $('#mock-start').addEventListener('click', toggleMockTimer);
  $('#mock-reset').addEventListener('click', resetMockTimer);
}
async function makeMock() {
  const btn = $('#mock-make'); btn.disabled = true;
  try {
    await ensureData();
    const problems = await api.fetchProblems();
    const models = await api.fetchModels();
    const ac = state.acSet || new Set();
    const marks = load(KEYS.marks, {}) || {};
    const targets = [100, 300, 500, 800, 1100, 1500];
    const chosen = []; const used = new Set();
    for (const t of targets) {
      let best = null, bestGap = Infinity;
      for (const p of problems) {
        if (ac.has(p.id) || used.has(p.id) || marks[p.id]) continue;
        if (!p.id.startsWith('abc')) continue;
        const m = models[p.id];
        const d = m && typeof m.difficulty === 'number' ? m.difficulty : null;
        if (d === null) continue;
        const gap = Math.abs(d - t);
        if (gap < bestGap) { bestGap = gap; best = { ...p, difficulty: d }; }
      }
      if (best) { chosen.push(best); used.add(best.id); }
    }
    chosen.sort((a, b) => a.difficulty - b.difficulty);
    const box = $('#mock-list'); box.replaceChildren();
    if (!chosen.length) { box.append(h('p', { class: 'muted small' }, '対象問題が見つかりませんでした。')); return; }
    chosen.forEach((p) => box.append(problemItem(p, 'mock')));
    resetMockTimer();
  } catch (err) {
    $('#mock-list').replaceChildren(h('p', { class: 'status error' }, '失敗: ' + err.message));
  } finally {
    btn.disabled = false;
  }
}
// 弱点カテゴリの検証済み例題からセットを作る。
function makeMockWeak() {
  const counts = weaknessCounts();
  const weakCats = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cid]) => cid);
  if (!weakCats.length) { makeMock(); return; }
  const ac = state.acSet || new Set();
  const marks = load(KEYS.marks, {}) || {};
  const candByCat = {};
  for (const cid of weakCats) {
    const cat = CATEGORIES.find((c) => c.id === cid);
    candByCat[cid] = (cat?.practice || [])
      .filter((p) => typeof p.diff === 'number' && p.url.includes('/tasks/'))
      .map((p) => ({
        id: p.url.split('/tasks/')[1],
        contest_id: p.url.split('/contests/')[1].split('/')[0],
        title: `${p.label}（${catName(cid)}）`,
        difficulty: p.diff,
      }))
      .filter((p) => !ac.has(p.id) && !marks[p.id]);
  }
  const chosen = []; const used = new Set();
  let added = true;
  while (chosen.length < 6 && added) {
    added = false;
    for (const cid of weakCats) {
      if (chosen.length >= 6) break;
      const next = (candByCat[cid] || []).find((p) => !used.has(p.id));
      if (next) { chosen.push(next); used.add(next.id); added = true; }
    }
  }
  chosen.sort((a, b) => a.difficulty - b.difficulty);
  const box = $('#mock-list'); box.replaceChildren();
  if (!chosen.length) {
    box.append(h('p', { class: 'muted small' }, '弱点カテゴリの未AC例題が見つかりませんでした。先に「復習」で弱点を記録してください。'));
    return;
  }
  chosen.forEach((p) => box.append(problemItem(p, 'mock')));
  resetMockTimer();
}
function toggleMockTimer() {
  const el = $('#mock-timer');
  if (mockTimer) {
    clearInterval(mockTimer); mockTimer = null; el.classList.remove('run'); $('#mock-start').textContent = '再開';
    return;
  }
  $('#mock-start').textContent = '一時停止'; el.classList.add('run'); el.classList.remove('over');
  mockTimer = setInterval(() => {
    mockRemain--;
    el.textContent = fmtTime(Math.max(0, mockRemain));
    if (mockRemain <= 0) {
      clearInterval(mockTimer); mockTimer = null;
      el.classList.remove('run'); el.classList.add('over'); $('#mock-start').textContent = '開始';
    }
  }, 1000);
}
function resetMockTimer() {
  if (mockTimer) { clearInterval(mockTimer); mockTimer = null; }
  mockRemain = 100 * 60;
  const el = $('#mock-timer'); el.textContent = fmtTime(mockRemain); el.classList.remove('run', 'over');
  $('#mock-start').textContent = '開始';
}

// ---- 復習・弱点マップ ----
const SR_DAYS = [1, 3, 7, 14, 30]; // 間隔反復（日）
const catName = (id) => { const c = CATEGORIES.find((x) => x.id === id); return c ? c.name : id; };

function initReview() {
  const cc = $('#rv-cats');
  CATEGORIES.forEach((cat) => cc.append(h('label', {}, h('input', { type: 'checkbox', value: cat.id }), cat.name)));
  $('#rv-add').addEventListener('click', addReview);
  $('#plan-run').addEventListener('click', runPlan);
  renderReview();
  updatePlanInfo();
}
function addReview() {
  const cats = [...document.querySelectorAll('#rv-cats input:checked')].map((c) => c.value);
  const result = $('#rv-result').value;
  const title = $('#rv-title').value.trim();
  const url = $('#rv-url').value.trim();
  const memo = $('#rv-memo').value.trim();
  if (!title && !url && !cats.length && !memo) { $('#rv-saved').textContent = '何か入力してください'; return; }
  const reviews = load(KEYS.reviews, []) || [];
  const box = result === 'solved' ? 1 : 0;
  reviews.push({ id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, ts: Date.now(), title, url, result, cats, memo, box, due: Date.now() + SR_DAYS[box] * 86400000 });
  save(KEYS.reviews, reviews);
  $('#rv-title').value = ''; $('#rv-url').value = ''; $('#rv-memo').value = '';
  document.querySelectorAll('#rv-cats input:checked').forEach((c) => { c.checked = false; });
  $('#rv-saved').textContent = '記録しました';
  setTimeout(() => ($('#rv-saved').textContent = ''), 1500);
  renderReview();
}
function weaknessCounts() {
  const reviews = load(KEYS.reviews, []) || [];
  const counts = {};
  for (const r of reviews) {
    if (r.result === 'solved') continue;
    for (const c of r.cats) counts[c] = (counts[c] || 0) + 1;
  }
  return counts;
}
function renderReview() { renderWeakmap(); renderDue(); renderLog(); }
function renderWeakmap() {
  const box = $('#weakmap'); box.replaceChildren();
  const entries = Object.entries(weaknessCounts()).sort((a, b) => b[1] - a[1]);
  if (!entries.length) { box.append(h('p', { class: 'muted small' }, 'まだ弱点データがありません。「解けなかった/解説を見た」を記録すると、詰まりやすい発想が見えます。')); return; }
  const max = entries[0][1];
  for (const [cid, n] of entries) {
    const cat = CATEGORIES.find((c) => c.id === cid);
    const panel = h('div', { class: 'weak-practice', hidden: '' });
    const exBtn = h('button', { class: 'iconbtn' }, '例題');
    exBtn.addEventListener('click', () => {
      if (panel.hidden) {
        if (!panel.children.length && cat) panel.append(practiceLinksEl(cat));
        panel.hidden = false; exBtn.textContent = '閉じる';
      } else { panel.hidden = true; exBtn.textContent = '例題'; }
    });
    box.append(
      h('div', { class: 'weak-row' },
        h('a', { class: 'wname', href: '#', onclick: (e) => { e.preventDefault(); gotoTab('ideas'); } }, catName(cid)),
        h('div', { class: 'weak-bar' }, h('span', { style: `width:${(n / max) * 100}%` })),
        h('div', { class: 'wn' }, String(n)),
        exBtn,
      ),
      panel,
    );
  }
}
function reviewItem(r, dueMode) {
  const label = { unsolved: '解けなかった', editorial: '解説を見た', solved: '解けた' }[r.result] || r.result;
  const main = h('div', { class: 'rv-main' },
    h('div', {}, r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title || r.url) : (r.title || '(無題)')),
    h('div', { class: 'rv-meta' }, `${label}・${new Date(r.ts).toLocaleDateString()}${r.memo ? '・' + r.memo : ''}`),
  );
  if (r.cats && r.cats.length) {
    const tags = h('div', {});
    r.cats.forEach((c) => tags.append(h('span', { class: 'rv-tag' }, catName(c))));
    main.append(tags);
  }
  const actions = h('div', { class: 'pact' });
  if (dueMode) {
    const done = h('button', { class: 'iconbtn' }, '復習した');
    done.addEventListener('click', () => reviewAgain(r.id));
    actions.append(done);
  }
  const del = h('button', { class: 'iconbtn' }, '削除');
  del.addEventListener('click', () => deleteReview(r.id));
  actions.append(del);
  return h('div', { class: 'rv-item' }, main, actions);
}
function renderDue() {
  const box = $('#review-due'); box.replaceChildren();
  const now = Date.now();
  const due = (load(KEYS.reviews, []) || []).filter((r) => r.result !== 'solved' && r.due <= now);
  if (!due.length) { box.append(h('p', { class: 'muted small' }, '今日やる復習はありません。')); return; }
  due.forEach((r) => box.append(reviewItem(r, true)));
}
function renderLog() {
  const box = $('#review-log'); box.replaceChildren();
  const reviews = (load(KEYS.reviews, []) || []).slice().sort((a, b) => b.ts - a.ts).slice(0, 30);
  if (!reviews.length) { box.append(h('p', { class: 'muted small' }, 'まだ記録がありません。')); return; }
  reviews.forEach((r) => box.append(reviewItem(r, false)));
}
function reviewAgain(id) {
  const reviews = load(KEYS.reviews, []) || [];
  const r = reviews.find((x) => x.id === id); if (!r) return;
  r.box = Math.min((r.box || 0) + 1, SR_DAYS.length - 1);
  r.due = Date.now() + SR_DAYS[r.box] * 86400000;
  save(KEYS.reviews, reviews); renderReview();
}
function deleteReview(id) {
  save(KEYS.reviews, (load(KEYS.reviews, []) || []).filter((x) => x.id !== id));
  renderReview();
}

// ---- AI 学習プラン ----
function updatePlanInfo() {
  const m = MODELS.find((x) => x.id === (state.settings.model || DEFAULT_MODEL));
  const el = $('#plan-info'); if (!el) return;
  el.textContent = `モデル: ${m ? m.label : ''} / ${state.settings.apiKey ? 'キー設定済み' : 'キー未設定'}`;
}
async function runPlan() {
  const btn = $('#plan-run'); btn.disabled = true;
  $('#plan-result').replaceChildren(); setStatus('#plan-status', '学習プランを生成中…');
  try {
    const weakness = Object.entries(weaknessCounts()).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([cid, n]) => ({ name: catName(cid), count: n }));
    const curKey = (state.lastDiag && state.lastDiag.currentKey) || bandKeyFromRating(state.settings.rating);
    const tgtKey = state.lastDiag && state.lastDiag.targetKey;
    const text = await generateStudyPlan({
      apiKey: state.settings.apiKey,
      model: state.settings.model || DEFAULT_MODEL,
      currentColor: curKey ? (bandByKey(curKey) || {}).nameJa : '',
      targetColor: tgtKey ? (bandByKey(tgtKey) || {}).nameJa : '',
      weakness,
    });
    $('#plan-result').replaceChildren(h('details', { class: 'ai-stage', open: '' },
      h('summary', {}, '学習プラン'), h('div', { class: 'body' }, text)));
    setStatus('#plan-status', null);
  } catch (err) {
    setStatus('#plan-status', err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ---- ダークモード ----
function applyDark(on) { document.body.classList.toggle('dark', !!on); }

// ---- 起動 ----
function main() {
  applyDark((load(KEYS.ui, {}) || {}).dark); // 初期チラつき防止
  initTabs();
  initStart();
  initSettings();
  initDiagnose();
  initEstimate();
  initRecommend();
  initIdeas();
  initReview();
  initRoadmap();
}
main();

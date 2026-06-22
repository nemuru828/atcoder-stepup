// エントリポイント：UI の配線。
import { COLORS, MODELS, DEFAULT_MODEL, problemUrl } from './config.js';
import { bandByKey, bandOf, nextBand } from './colors.js';
import { load, save, remove, KEYS } from './storage.js';
import * as api from './api.js';
import { diagnose, bandKeyFromRating, targetFromCurrent } from './diagnose.js';
import { recommend, windowOf } from './recommend.js';
import { displayDifficulty } from './colors.js';
import { generateHints } from './ai.js';
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
async function ensureAccepted(user, statusId) {
  if (state.acSet && state.acUser === user) return state.acSet;
  setStatus(statusId, `${user} の提出を取得中…`);
  const ac = await api.fetchAcceptedSet(user, (acCount) => {
    setStatus(statusId, `${user} の提出を取得中…（AC ${acCount} 問）`);
  });
  state.acSet = ac; state.acUser = user;
  return ac;
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
    $('#set-saved').textContent = '保存しました';
    setTimeout(() => ($('#set-saved').textContent = ''), 2000);
  });

  $('#set-clearkey').addEventListener('click', () => {
    $('#set-apikey').value = '';
    state.settings.apiKey = '';
    save(KEYS.settings, state.settings);
    updateAiModelInfo();
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
    const ac = await ensureAccepted(user, '#diag-status');
    const problems = await api.fetchProblems();
    const models = await api.fetchModels();
    const result = diagnose(ac, problems, models);

    // 現在色：レーティング入力があれば優先、なければ推定。
    const ratedKey = bandKeyFromRating(ratingInput);
    const currentKey = ratedKey || result.estimatedKey;
    const target = targetFromCurrent(currentKey);

    // 設定にも反映保存
    state.settings.user = user;
    state.settings.rating = ratingInput;
    save(KEYS.settings, state.settings);

    renderDiagSummary({ currentKey, fromRating: !!ratedKey, result, ratingInput, target });
    renderDist(result.counts);
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
}
async function runRecommend() {
  const user = (state.settings.user || $('#diag-user').value).trim();
  const btn = $('#rec-run'); btn.disabled = true;
  try {
    await ensureData();
    let ac = state.acSet;
    if (!ac) {
      if (user) ac = await ensureAccepted(user, '#rec-status');
      else { ac = new Set(); setStatus('#rec-status', 'ユーザー名未設定のため未AC判定なしで表示します（設定タブで登録推奨）。'); }
    }
    const problems = await api.fetchProblems();
    const models = await api.fetchModels();
    const list = recommend({
      acSet: ac,
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
function renderProblems(list) {
  const box = $('#rec-list'); box.replaceChildren();
  if (!list.length) {
    box.append(h('p', { class: 'muted' }, '該当する未AC問題が見つかりませんでした。条件を変えてみてください。'));
    return;
  }
  for (const p of list) {
    const b = COLORS.find((c) => p.difficulty >= c.min && p.difficulty < c.max);
    box.append(h('div', { class: 'problem' },
      h('span', { class: 'badge', style: `background:${b ? b.css : 'var(--c-none)'}` }, String(displayDifficulty(p.difficulty))),
      h('div', { class: 'ptitle' }, p.title || p.name,
        h('div', { class: 'pmeta' }, `${p.contest_id.toUpperCase()}`)),
      h('a', { class: 'open btn', href: problemUrl(p.contest_id, p.id), target: '_blank', rel: 'noopener' }, '問題へ'),
    ));
  }
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
    if (cat.practice && cat.practice.length) {
      const pr = h('div', { class: 'practice' }, h('div', { class: 'practice-label' }, '練習問題・問題集'));
      cat.practice.forEach((p) => {
        const link = h('a', { class: 'plink', href: p.url, target: '_blank', rel: 'noopener' });
        if (typeof p.diff === 'number') {
          const b = bandOf(p.diff);
          link.append(h('span', { class: 'pbadge', style: `background:${b ? b.css : 'var(--c-none)'}` }, String(displayDifficulty(p.diff))));
        }
        link.append(` ${p.label}`);
        pr.append(link);
      });
      steps.append(pr);
    }
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

// ---- 起動 ----
function main() {
  initTabs();
  initStart();
  initSettings();
  initDiagnose();
  initEstimate();
  initRecommend();
  initIdeas();
  initRoadmap();
}
main();

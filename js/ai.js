// Claude API で段階的な発想ヒントを生成（ブラウザから直接呼び出し）。
import { DEFAULT_MODEL } from './config.js';

const SYSTEM = `あなたは AtCoder の初〜中級者（灰色〜水色）を指導するコーチです。
与えられた競技プログラミングの問題に対し、いきなり答えを与えず、受講者が自力で「発想」にたどり着けるよう段階的なヒントを作ります。

ルール:
- ネタバレを避け、各段階は前の段階より少しだけ踏み込む。
- 制約（N の上限など）から計算量の当たりをつける思考を必ず促す。
- 具体的なソースコードは書かない（擬似コードの方針までは可）。
- 日本語で、簡潔に。

必ず次の見出し形式で、この順に出力すること（各見出しは行頭に「### 」）:
### 観点
制約と「何を求める問題か」から、どこに注目すべきか。解法名はまだ出さない。
### ヒント1
小さな気づき。方向性をそっと示す。
### ヒント2
方針の核。ここで初めてアルゴリズム名・データ構造を出してよい。
### ヒント3
実装の要点と計算量の見積り。
### 解法
解法の流れ（最後の砦）。コードは書かず、手順を箇条書きで。`;

function buildUserText({ title, difficulty, statement }) {
  const lines = [];
  if (title) lines.push(`タイトル: ${title}`);
  if (difficulty) lines.push(`推定難易度: ${difficulty}`);
  lines.push('', '問題文:', statement || '(本文未提供。タイトルから推測してよいが、不明な点は前提を明示すること)');
  return lines.join('\n');
}

// 応答テキストを「### 見出し」で段階に分割。
function parseStages(text) {
  const parts = text.split(/^###\s+/m).map((s) => s.trim()).filter(Boolean);
  const stages = [];
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl === -1) {
      stages.push({ label: part, body: '' });
    } else {
      stages.push({ label: part.slice(0, nl).trim(), body: part.slice(nl + 1).trim() });
    }
  }
  // 分割できなければ全文を 1 段に。
  return stages.length ? stages : [{ label: 'ヒント', body: text.trim() }];
}

// メイン。{ apiKey, model, title, difficulty, statement } -> [{label, body}]
export async function generateHints({ apiKey, model, title, difficulty, statement }) {
  if (!apiKey) throw new Error('API キーが設定されていません。設定タブで入力してください。');
  if (!statement && !title) throw new Error('問題文かタイトルのどちらかは入力してください。');

  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: 1600,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildUserText({ title, difficulty, statement }) }],
      }),
    });
  } catch {
    throw new Error('通信に失敗しました。ネットワークを確認してください。');
  }

  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* ignore */ }
    if (res.status === 401) throw new Error('API キーが無効です（401）。設定を確認してください。');
    if (res.status === 429) throw new Error('レート制限に達しました（429）。少し待って再試行してください。');
    throw new Error(`API エラー (${res.status}) ${detail}`);
  }

  const data = await res.json();
  if (data.stop_reason === 'refusal') {
    throw new Error('この内容には応答できませんでした。問題文の内容を見直してください。');
  }
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  if (!text) throw new Error('応答が空でした。もう一度お試しください。');

  return parseStages(text);
}

// 共通: Claude 呼び出し（テキスト応答）。
async function callClaude({ apiKey, model, system, user, maxTokens = 1600 }) {
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
  } catch {
    throw new Error('通信に失敗しました。ネットワークを確認してください。');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* ignore */ }
    if (res.status === 401) throw new Error('API キーが無効です（401）。設定を確認してください。');
    if (res.status === 429) throw new Error('レート制限に達しました（429）。少し待って再試行してください。');
    throw new Error(`API エラー (${res.status}) ${detail}`);
  }
  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('この内容には応答できませんでした。');
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text) throw new Error('応答が空でした。もう一度お試しください。');
  return text;
}

// 学習プラン生成。weakness: [{name, count}]
export async function generateStudyPlan({ apiKey, model, currentColor, targetColor, weakness, note }) {
  if (!apiKey) throw new Error('API キーが設定されていません。設定タブで入力してください。');
  const system = `あなたは AtCoder の学習コーチです。学習者の現状（現在の色・目標の色・つまずいているカテゴリ）を踏まえ、今週〜2週間で実行できる具体的な学習プランを日本語で提案します。
- 優先的に強化すべきカテゴリ、1日あたりの問題数、取り組む難易度帯、復習の回し方を含める。
- 簡潔で実行可能に。見出しと箇条書きで。
- 最後に「今日まず1つやること」を1行で。`;
  const lines = [];
  lines.push(`現在の色: ${currentColor || '不明'}`);
  lines.push(`目標の色: ${targetColor || '不明'}`);
  if (weakness && weakness.length) {
    lines.push(`つまずきやすいカテゴリ（多い順）: ${weakness.map((w) => `${w.name}(${w.count}回)`).join('、')}`);
  } else {
    lines.push('つまずき記録: まだなし（基礎カテゴリから順に）');
  }
  if (note) lines.push(`補足: ${note}`);
  return callClaude({ apiKey, model, system, user: lines.join('\n'), maxTokens: 1600 });
}

// 色別ロードマップ。各遷移で身につけたい手筋のチェックリスト。
// id は進捗保存のキーになるので変更しない。

export const ROADMAP = [
  {
    from: 'gray', to: 'brown', title: '灰 → 茶（レート 400）',
    aim: 'ABC の A・B を確実に、C も時々通せる状態。実装に慣れるのが最優先。',
    skills: [
      { id: 'g2b-io', name: '標準入出力と型', desc: '整数・文字列・配列の読み込み、出力フォーマットに迷わない。' },
      { id: 'g2b-loop', name: 'for / if / while', desc: '二重ループ、条件分岐を素早く正確に書く。' },
      { id: 'g2b-array', name: '配列操作', desc: '最大・最小・合計・カウント、添字の扱い。' },
      { id: 'g2b-string', name: '文字列処理', desc: '1 文字ずつ走査、部分文字列、文字コード。' },
      { id: 'g2b-math', name: '基本的な数学', desc: '余り・約数・偶奇・等差数列の和など。' },
      { id: 'g2b-complexity', name: '計算量の感覚', desc: 'N の上限から「全部試して間に合うか」を判断。' },
      { id: 'g2b-bruteforce', name: '全探索の基礎', desc: '答えの候補を全部試す発想（二重ループ全探索）。' },
    ],
  },
  {
    from: 'brown', to: 'green', title: '茶 → 緑（レート 800）',
    aim: 'ABC の C を安定、D に手が届く。典型アルゴリズムの引き出しを作る。',
    skills: [
      { id: 'b2g-fullsearch', name: '全探索の徹底', desc: '組合せ・順列の列挙、計算量を見極めて全探索を選ぶ。' },
      { id: 'b2g-bit', name: 'bit 全探索', desc: 'N≤20 程度で各要素「選ぶ/選ばない」を 2^N 通り試す。' },
      { id: 'b2g-cumsum', name: '累積和', desc: '区間和を O(1) で。前計算で計算量を落とす発想。' },
      { id: 'b2g-binsearch', name: '二分探索', desc: 'ソート済み配列の探索、std の lower_bound 相当。' },
      { id: 'b2g-meguru', name: '答えで二分探索', desc: '「○○できる最大/最小」を判定問題に言い換える。' },
      { id: 'b2g-dp', name: '基本 DP', desc: 'ナップサック・最長部分列など、漸化式を立てる。' },
      { id: 'b2g-bfsdfs', name: 'BFS / DFS', desc: 'グラフ・グリッドの探索、最短距離（重みなし）。' },
      { id: 'b2g-greedy', name: '貪欲法', desc: 'ソートして前から、交換しても損しない並べ方。' },
      { id: 'b2g-mod', name: 'mod 演算', desc: '10^9+7 での加減乗算、桁あふれ回避。' },
    ],
  },
  {
    from: 'green', to: 'cyan', title: '緑 → 水（レート 1200）',
    aim: 'ABC の D を安定、E に挑戦。典型を組み合わせて解く。',
    skills: [
      { id: 'g2c-dp2', name: 'DP 応用', desc: 'bitDP・区間 DP・桁 DP 入門、状態の持ち方を工夫する。' },
      { id: 'g2c-dijkstra', name: 'ダイクストラ法', desc: '重み付きグラフの最短経路、優先度付きキュー。' },
      { id: 'g2c-uf', name: 'Union-Find', desc: '連結成分の管理、グループ統合と判定。' },
      { id: 'g2c-math', name: '数学（組合せ）', desc: 'nCr の前計算、フェルマーの小定理で逆元。' },
      { id: 'g2c-seg', name: 'セグメント木 入門', desc: '区間の最小/和を log で更新・取得。' },
      { id: 'g2c-shakutori', name: 'しゃくとり法', desc: '条件を満たす区間を線形で数える。' },
      { id: 'g2c-half', name: '半分全列挙', desc: '2^40 を 2^20×2 に分割して全探索を可能にする。' },
      { id: 'g2c-estimate', name: '計算量見積りの精度', desc: '制約から必要な計算量を逆算し、手法を選ぶ。' },
    ],
  },
];

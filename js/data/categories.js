// 発想補助：どんな問題にも効く手順と、解法カテゴリ別の段階ヒント。

// 普遍の「発想の3ステップ」。
export const FRAMEWORK = [
  {
    title: '制約から計算量の当たりをつける',
    body: 'N の上限を見る。N≤20 なら 2^N（bit全探索）、N≤3000 なら O(N²)、N≤2×10⁵ なら O(N log N) まで。' +
          '「全部試して間に合うか?」を最初に判断する。',
  },
  {
    title: '何を求める問題か分類する',
    body: '最大化／最小化／数え上げ／存在判定（Yes-No）／構築／最短経路 のどれか。' +
          'タイプが分かると候補の手法が一気に絞れる。',
  },
  {
    title: '既知パターンに当てはめる',
    body: '下のカテゴリの「疑うサイン」を上から照合する。最大化＋「○○できる最大」なら答えで二分探索、' +
          '区間和の頻出なら累積和、選ぶ/選ばないなら DP か bit全探索、というように引き出しから取り出す。',
  },
];

// 各カテゴリ：name=名前, suspect=疑うサイン, steps=段階ヒント（後ろほど踏み込む）,
// practice=練習（例題は {label, url, diff} で難易度バッジ表示、問題集は {label, url}）。
// 例題の id・難易度は AtCoder Problems の実データで確認済み。
export const CATEGORIES = [
  {
    id: 'brute',
    name: '全探索',
    suspect: '制約が小さい / 候補を全部試せそう',
    steps: [
      { q: 'ヒント1：まず疑う', a: '計算量が許すなら、答えの候補を全部試すのが最強。N²やN³でも間に合う制約かを確認。' },
      { q: 'ヒント2：方針', a: '「何を全探索するか（始点・組・しきい値…）」を決め、内側で条件判定する二重・三重ループに落とす。' },
      { q: 'ヒント3：詰め', a: '無駄な候補を枝刈り、または対称性で半分にする。間に合わないなら累積和や二分探索で内側を高速化。' },
    ],
    practice: [
      { label: 'ABC087-B Coins', url: 'https://atcoder.jp/contests/abc087/tasks/abc087_b', diff: 161 },
      { label: 'ABC083-B Some Sums', url: 'https://atcoder.jp/contests/abc083/tasks/abc083_b', diff: 62 },
      { label: 'ABC085-C Otoshidama', url: 'https://atcoder.jp/contests/abc085/tasks/abc085_c', diff: 584 },
      { label: '練習: AtCoder Beginners Selection', url: 'https://atcoder.jp/contests/abs' },
    ],
  },
  {
    id: 'bit',
    name: 'bit 全探索',
    suspect: 'N ≤ 20 くらい / 各要素を「選ぶ・選ばない」',
    steps: [
      { q: 'ヒント1：まず疑う', a: 'N が 20 以下で「部分集合を全部考える」なら 2^N 通りの bit 全探索が候補。' },
      { q: 'ヒント2：方針', a: '0 〜 2^N−1 の整数 S をループ。S の i ビット目が立っていれば「i 番目を選ぶ」とみなす。' },
      { q: 'ヒント3：詰め', a: '各 S について選んだ要素で条件を評価し、最大/最小/カウントを更新。計算量 O(2^N × N)。' },
    ],
    practice: [
      { label: 'ABC128-C Switches', url: 'https://atcoder.jp/contests/abc128/tasks/abc128_c', diff: 805 },
      { label: 'ABC167-C Skill Up', url: 'https://atcoder.jp/contests/abc167/tasks/abc167_c', diff: 595 },
      { label: '練習: 競技プログラミングの鉄則', url: 'https://atcoder.jp/contests/tessoku-book' },
    ],
  },
  {
    id: 'cumsum',
    name: '累積和',
    suspect: '区間の和を何度も聞かれる / 連続部分列',
    steps: [
      { q: 'ヒント1：まず疑う', a: '「区間 [l, r] の和」を何度も求めるなら、毎回足すと遅い。前計算を疑う。' },
      { q: 'ヒント2：方針', a: '累積和 S[i] = a[0]+…+a[i−1] を前計算。区間和は S[r+1] − S[l] で O(1)。' },
      { q: 'ヒント3：詰め', a: '2 次元なら 2 次元累積和。「いもす法」で区間加算をまとめて処理する発想も同系統。' },
    ],
    practice: [
      { label: 'ABC122-C GeT AC', url: 'https://atcoder.jp/contests/abc122/tasks/abc122_c', diff: 700 },
      { label: '練習: 競技プログラミングの鉄則（累積和の章）', url: 'https://atcoder.jp/contests/tessoku-book' },
    ],
  },
  {
    id: 'binsearch',
    name: '二分探索 / 答えで二分探索',
    suspect: '「○○できる最大/最小」 / 単調性がある',
    steps: [
      { q: 'ヒント1：まず疑う', a: 'ソート済みの探索はもちろん、「条件を満たす最大値/最小値」も二分探索の合図。' },
      { q: 'ヒント2：方針', a: '答え x を仮定すると Yes/No 判定が簡単になり、かつ x について単調なら「答えで二分探索」。' },
      { q: 'ヒント3：詰め', a: 'judge(x) を O(N) 等で書き、二分探索で境界を詰める。全体 O(N log(range))。境界条件に注意。' },
    ],
    practice: [
      { label: 'ABC146-C Buy an Integer', url: 'https://atcoder.jp/contests/abc146/tasks/abc146_c', diff: 741 },
      { label: '練習: 競技プログラミングの鉄則（二分探索の章）', url: 'https://atcoder.jp/contests/tessoku-book' },
      { label: '練習: AtCoder 典型90問', url: 'https://atcoder.jp/contests/typical90' },
    ],
  },
  {
    id: 'greedy',
    name: '貪欲法',
    suspect: '並べ替えると良さそう / 局所最適が全体最適',
    steps: [
      { q: 'ヒント1：まず疑う', a: '「順番に最善を選べば良さそう」と感じたら貪欲。多くはソートが起点。' },
      { q: 'ヒント2：方針', a: '何の順（早い終了順・大きい順…）に並べるかを決める。交換しても損しない＝正当性の根拠。' },
      { q: 'ヒント3：詰め', a: '反例が作れないか確認。作れるなら DP を疑う。区間スケジューリングは「終了時刻が早い順」が定番。' },
    ],
    practice: [
      { label: 'ABC088-B Card Game for Two', url: 'https://atcoder.jp/contests/abc088/tasks/abc088_b', diff: -182 },
      { label: '練習: AtCoder Beginners Selection', url: 'https://atcoder.jp/contests/abs' },
    ],
  },
  {
    id: 'dp',
    name: '動的計画法（DP）',
    suspect: '数え上げ / 最大化 で全探索が指数 / 部分問題が重なる',
    steps: [
      { q: 'ヒント1：まず疑う', a: '全探索が指数的だが「途中までの結果」を使い回せそうなら DP。' },
      { q: 'ヒント2：方針', a: 'dp[i] = 「i 番目まで見たときの最適/通り数」と状態を定義。i−1 からの遷移（漸化式）を書く。' },
      { q: 'ヒント3：詰め', a: '状態に「容量」「直前の選択」などを足すと表現力が上がる（ナップサック型）。初期値と答えの位置に注意。' },
    ],
    practice: [
      { label: 'EDPC A - Frog 1', url: 'https://atcoder.jp/contests/dp/tasks/dp_a' },
      { label: 'EDPC B - Frog 2', url: 'https://atcoder.jp/contests/dp/tasks/dp_b' },
      { label: 'EDPC C - Vacation', url: 'https://atcoder.jp/contests/dp/tasks/dp_c' },
      { label: 'EDPC D - Knapsack 1', url: 'https://atcoder.jp/contests/dp/tasks/dp_d' },
      { label: '練習: Educational DP Contest（全26問）', url: 'https://atcoder.jp/contests/dp' },
    ],
  },
  {
    id: 'graph',
    name: 'BFS / DFS（グラフ・グリッド）',
    suspect: '最短手数 / 連結 / 迷路・グリッド移動',
    steps: [
      { q: 'ヒント1：まず疑う', a: '「最短手数」「行き来できるか」「グリッド上の移動」はグラフ探索。' },
      { q: 'ヒント2：方針', a: '重みなし最短は BFS（キュー）、到達可能・連結判定は DFS/BFS どちらでも。訪問済み管理を忘れずに。' },
      { q: 'ヒント3：詰め', a: 'グリッドはマスを頂点、隣接 4 方向を辺に。重み付き最短ならダイクストラへ拡張。' },
    ],
    practice: [
      { label: 'ABC088-D Grid Repainting', url: 'https://atcoder.jp/contests/abc088/tasks/abc088_d', diff: 999 },
      { label: '練習: 競技プログラミングの鉄則（グラフ探索の章）', url: 'https://atcoder.jp/contests/tessoku-book' },
      { label: '練習: AtCoder 典型90問', url: 'https://atcoder.jp/contests/typical90' },
    ],
  },
  {
    id: 'unionfind',
    name: 'Union-Find',
    suspect: 'グループ統合 / 同じ仲間か判定 / 連結成分',
    steps: [
      { q: 'ヒント1：まず疑う', a: '「a と b を同じグループに」「同じグループ?」が頻出するなら Union-Find。' },
      { q: 'ヒント2：方針', a: 'union(a,b) で統合、find(a)==find(b) で同一判定。ほぼ定数時間。' },
      { q: 'ヒント3：詰め', a: '各グループのサイズや個数を一緒に管理すると応用が利く。辺を順に足す問題と相性が良い。' },
    ],
    practice: [
      { label: 'ABC177-D Friends', url: 'https://atcoder.jp/contests/abc177/tasks/abc177_d', diff: 732 },
      { label: '練習: 競技プログラミングの鉄則（Union-Findの章）', url: 'https://atcoder.jp/contests/tessoku-book' },
    ],
  },
  {
    id: 'math',
    name: '数学（約数・素数・mod・組合せ）',
    suspect: '約数・素因数 / 大きい数の余り / 場合の数',
    steps: [
      { q: 'ヒント1：まず疑う', a: '約数列挙・素因数分解・「10^9+7 で割った余り」「何通り」は数学の出番。' },
      { q: 'ヒント2：方針', a: '約数は √N まで、素数は篩。mod は加減乗のたびに % を取る。割り算は逆元（フェルマー）。' },
      { q: 'ヒント3：詰め', a: '組合せ nCr は階乗と逆元を前計算。桁あふれは 64bit と mod で回避する。' },
    ],
    practice: [
      { label: 'ABC084-D 2017-like Number', url: 'https://atcoder.jp/contests/abc084/tasks/abc084_d', diff: 980 },
      { label: '練習: 競技プログラミングの鉄則（数学の章）', url: 'https://atcoder.jp/contests/tessoku-book' },
    ],
  },
  {
    id: 'shakutori',
    name: 'しゃくとり法',
    suspect: '条件を満たす連続区間の個数/最長',
    steps: [
      { q: 'ヒント1：まず疑う', a: '「和が K 以下の連続区間」など、区間を伸縮しながら数える問題で有効。' },
      { q: 'ヒント2：方針', a: '右端を進めて条件を満たす限り伸ばし、満たさなくなったら左端を進める。各端は一方向にのみ動く。' },
      { q: 'ヒント3：詰め', a: '右端ごとに「左端の最小位置」が単調なら O(N)。区間和は累積和や走る和で管理。' },
    ],
    practice: [
      { label: 'ABC038-C 単調増加', url: 'https://atcoder.jp/contests/abc038/tasks/abc038_c', diff: 894 },
      { label: '練習: 競技プログラミングの鉄則（しゃくとり法の章）', url: 'https://atcoder.jp/contests/tessoku-book' },
    ],
  },
];

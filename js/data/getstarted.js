// 「はじめに」：AtCoder が完全に手つかずの人向けの最初の一歩。

export const GET_STARTED = {
  // 上から順にこなすチェックリスト（進捗は保存される）。id は変更しない。
  steps: [
    {
      id: 'gs-account',
      title: 'AtCoder のアカウントを作る',
      time: '約3分',
      desc: 'これが無いと問題を提出できません。無料です。',
      link: 'https://atcoder.jp/register',
      linkLabel: '登録ページ',
    },
    {
      id: 'gs-lang',
      title: '使う言語を1つ決める',
      time: '約5分',
      desc: '迷ったら Python（書きやすい）か C++（速い・競プロ標準）。下の「言語の選び方」を参考に、まず1つに決めて続けるのが大事。',
    },
    {
      id: 'gs-guide',
      title: 'まず道筋を知る（定番ガイドを読む）',
      time: '15分ほど',
      desc: '「AtCoder に登録したら次にやること」。何を順に解けばいいかが分かる、初心者の定番記事です。',
      link: 'https://qiita.com/drken/items/fd4e5e3630d0f5859067',
      linkLabel: '記事を読む',
    },
    {
      id: 'gs-practice',
      title: '練習問題で「提出」を体験する',
      time: '15分ほど',
      desc: 'PracticeA「Welcome to AtCoder」。入力を受け取り→計算→出力、そして提出する流れを一度体験すれば不安が消えます。',
      link: 'https://atcoder.jp/contests/practice/tasks/practice_1',
      linkLabel: '練習問題へ',
    },
    {
      id: 'gs-abs',
      title: 'AtCoder Beginners Selection を解く',
      time: '数日かけて',
      desc: '初心者向けの厳選問題。入出力・条件分岐・ループ・全探索の基礎が身につきます。まずはこれを一通り。',
      link: 'https://atcoder.jp/contests/abs',
      linkLabel: 'ABS へ',
    },
    {
      id: 'gs-basic',
      title: '基礎文法をひと通り学ぶ',
      time: '1〜2週間',
      desc: 'for / if / 配列 / 文字列 まで。C++ なら入門教材 APG4b など、Python なら入門記事や本で。',
      link: 'https://atcoder.jp/contests/APG4b',
      linkLabel: 'APG4b（C++）',
    },
    {
      id: 'gs-abc',
      title: 'ABC に参加する（過去問のバーチャル参加でOK）',
      time: '毎週',
      desc: 'AtCoder Beginner Contest は毎週開催。まずは A・B の2問完答が目標。リアルタイムでなくても「バーチャル参加」で過去問を本番形式で解けます。',
      link: 'https://atcoder.jp/contests/',
      linkLabel: 'コンテスト一覧',
    },
    {
      id: 'gs-loop',
      title: 'このアプリで回す',
      time: '継続して',
      desc: '「ロードマップ」の 灰→茶 を見ながら進め、詰まったら「発想」タブ。慣れてきたら「診断」で現在地、「問題」で次の一手を出せます。',
    },
  ],

  // 言語の選び方。
  languages: [
    {
      name: 'Python',
      for: 'はじめてのプログラミング / 書きやすさ重視',
      note: '記述量が少なく学習が速い。実行速度は速くないが、灰〜緑では十分戦えます。',
    },
    {
      name: 'C++',
      for: '競技プログラミングを本格的に / 上位も見据える',
      note: '競プロの標準。速く、教材（APG4b 等）も豊富。最初は難しく感じても定番。',
      link: 'https://atcoder.jp/contests/APG4b',
      linkLabel: 'APG4b で学ぶ',
    },
  ],

  // よくある疑問。
  faq: [
    {
      q: '環境構築は必要？',
      a: '最初は不要です。AtCoder の「コードテスト」とブラウザからの提出だけで始められます。慣れてきたら手元の実行環境を用意しましょう。',
    },
    {
      q: 'どの言語がいい？',
      a: '上の通り Python か C++。どちらでも灰→水は到達できます。大事なのは1つに決めて続けること。途中で乗り換えると遠回りになりがちです。',
    },
    {
      q: 'いつコンテストに出ればいい？',
      a: 'アカウントを作ったらすぐでOK。本番が不安なら、過去の ABC を「バーチャル参加」で解いて慣れてから本番に出ても良いです。',
    },
    {
      q: 'どれくらいで茶色になれる？',
      a: '個人差が大きいです。ABC の A・B を安定させ、C に挑戦し続ければ自然と近づきます。焦らず、毎週1コンテスト＋復習が王道。',
    },
  ],
};

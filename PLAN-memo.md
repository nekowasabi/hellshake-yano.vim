# hellshake-yano hint UI plan memo

## 現状

現在の `~/.config/nvim/init.vim` では、hellshake-yano は概ね以下の方針で設定されている。

```vim
let g:hellshake_yano = {
      \ 'useJapanese': v:true,
      \ 'useHintGroups': v:true,
      \ 'highlightSelected': v:true,
      \ 'useNumericMultiCharHints': v:true,
      \ 'singleCharKeys': '/',
      \ 'multiCharKeys': 'BCDEGHJKLMNOQRSUWZ',
      \ 'perKeyMotionCount': {
      \   'w': 2,
      \   'b': 2,
      \   'e': 2,
      \   'h': 2,
      \   'j': 2,
      \   'k': 2,
      \   'l': 2,
      \ },
      \ 'cancelKeys': ['y', 'p', 'x', 'v', 'a', 'i', 'f', 'F', 't', 'T', '<CR>',
      \                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      \ 'directionalHintFilter': v:true,
      \ 'multiWindowMode': v:true,
      \ }
```

実装側では、ヒント入力時に英字を大文字へ正規化して照合している。つまり、小文字で入力しても内部的には大文字ヒントとして扱われる。

現在の挙動は実質以下。

- `/` だけが 1 文字ヒント。
- それ以外は `BB`, `BC`, `BD` のような 2 文字ヒント。
- `useNumericMultiCharHints` が有効なので、足りない場合は数字ヒントも使える。
- `multiCharKeys` に `H/J/K/L` が含まれている。

## 課題

画面の文字量が多いため、1 文字ヒントだけでは候補数が足りない。

一方で、`hjkl` 移動中にヒントが表示される UI を目指す場合、`H/J/K/L` がヒントキーに含まれていると、ヒント表示後にさらに `hjkl` で移動したい操作と、ヒント選択の 1 文字目が衝突しやすい。

このため、単に「大文字ヒントを小文字にする」だけでは不十分。ヒント入力キーの設計と、ヒント表示中の操作優先度を分けて考える必要がある。

## 案 1: Vim 操作優先

`H/J/K/L` を `multiCharKeys` から外す。

```vim
\ 'singleCharKeys': '/',
\ 'multiCharKeys': 'BCDEGMNOQRSUWZ',
\ 'useNumericMultiCharHints': v:true,
```

特徴:

- `hjkl` 移動との衝突を減らせる。
- 既存の `cancelKeys` 方針と相性がよい。
- 候補数は `14 * 14 = 196` に加えて、数字ヒントで補う形になる。
- 大量候補の画面ではやや不足する可能性がある。

## 案 2: ジャンプ操作優先

`hjkl` だけを外し、それ以外の入力しやすい英字を 2 文字ヒントに使う。

```vim
\ 'singleCharKeys': '/',
\ 'multiCharKeys': 'ASDFGQWERTYUIOPZXCVBNM',
\ 'useNumericMultiCharHints': v:false,
```

特徴:

- 22 文字を使うため、`22 * 22 = 484` 候補まで扱える。
- 小文字で入力しても内部照合は通る。
- 表示は現状実装だと大文字のまま。
- `a/i/f/t/w/b/e` など通常操作キーもヒント入力に使うため、ヒント表示中はジャンプを優先する UI になる。

## 案 3: プレフィックス型 2 打鍵 UI

候補数が多い前提では、1 文字で全対象を直接指定する設計は捨て、2 打鍵前提にする。

例:

```text
aa  as  ad  af
sa  ss  sd  sf
da  ds  dd  df
```

理想挙動:

1. `hjkl` で移動する。
2. 移動量が閾値を超えたらヒントを表示する。
3. 1 文字目を入力する。
4. そのプレフィックスに一致する候補だけ強調し、他は薄くする。
5. 2 文字目でジャンプする。
6. 候補が 1 つに絞れた場合は即ジャンプしてもよい。

現状実装にも候補ハイライト処理はあり、1 文字目入力後に `startsWith(inputChar)` で候補を絞る流れがある。そのため、この方向性は既存構造と相性がよい。

## UI 方針

目的が「hjkl で移動しながら、止まったら即ヒントジャンプ」なら、以下が自然。

- ヒントキーから `h/j/k/l` は外す。
- 候補数確保のため、2 文字ヒントを前提にする。
- 表示は小文字、内部照合は大小無視にする。
- 1 文字目入力後は一致候補だけを強調する。
- ヒント表示中に通常 Vim 操作を優先するか、ジャンプを優先するかを設定で選べるようにする。

## 暫定おすすめ

まず設定だけで試すなら、ジャンプ操作優先の以下。

```vim
\ 'singleCharKeys': '/',
\ 'multiCharKeys': 'ASDFGQWERTYUIOPZXCVBNM',
\ 'useNumericMultiCharHints': v:false,
```

ただし、より完成度を上げるなら実装側で次を追加する。

- `displayHintCase`: `upper` / `lower` のような表示ケース設定。
- `hintKeyPriority`: `jump` / `normal` のようなヒント表示中のキー優先度設定。
- `hjkl` をヒントキーから除外するデフォルト、または推奨プリセット。
- prefix 入力中の候補強調をより視覚的に分かりやすくする。

# Threshold Validation Results

## Test Environment

- **Date**: [記入日]
- **Vim Version**: [実行したVimのバージョン]
- **Plugin Version**: [hellshake-yano.vimのバージョン/コミット]
- **Tester**: [テスト実行者]

---

## Configuration 1: Aggressive Merging (5, 2)

### Settings

```vim
let g:hellshake_yano_japanese_merge_threshold = 5
let g:hellshake_yano_segmenter_threshold = 2
```

### Test Results

#### Test Case 1: 私は学校に行きます

- **Expected Words**: 私は, 学校に, 行きます
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 2: これはテストです

- **Expected Words**: これは, テストです
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 3: 彼が来た時

- **Expected Words**: 彼が, 来た, 時
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 4: 本を読む

- **Expected Words**: 本を, 読む
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

### Subjective Evaluation

- **Navigation Smoothness**: [1-5] [コメント]
- **Word Boundary Accuracy**: [1-5] [コメント]
- **Consistency with Expectations**: [1-5] [コメント]
- **Overall Rating**: [1-5]
- **Recommended Use Cases**: [この設定が適していると思われる用途]

---

## Configuration 2: Balanced (Default) (2, 4)

### Settings

```vim
let g:hellshake_yano_japanese_merge_threshold = 2
let g:hellshake_yano_segmenter_threshold = 4
```

### Test Results

#### Test Case 1: 私は学校に行きます

- **Expected Words**: 私, は, 学校, に, 行きます
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 2: これはテストです

- **Expected Words**: これ, は, テスト, です
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 3: プログラミング言語

- **Expected Words**: プログラミング, 言語
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 4: 本を読む

- **Expected Words**: 本, を, 読む
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

### Subjective Evaluation

- **Navigation Smoothness**: [1-5] [コメント]
- **Word Boundary Accuracy**: [1-5] [コメント]
- **Consistency with Expectations**: [1-5] [コメント]
- **Overall Rating**: [1-5]
- **Recommended Use Cases**: [この設定が適していると思われる用途]

---

## Configuration 3: Precise (1, 6)

### Settings

```vim
let g:hellshake_yano_japanese_merge_threshold = 1
let g:hellshake_yano_segmenter_threshold = 6
```

### Test Results

#### Test Case 1: 私は学校に行きます

- **Expected Words**: 私, は, 学校, に, 行, き, ます
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 2: 彼が来た時

- **Expected Words**: 彼, が, 来, た, 時
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 3: 短い文

- **Expected Words**: 短, い, 文
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

#### Test Case 4: 本を読む

- **Expected Words**: 本, を, 読, む
- **Actual Words**: [実際の単語区切り]
- **Match**: ✓ / ✗
- **Notes**: [気付いた点]

### Subjective Evaluation

- **Navigation Smoothness**: [1-5] [コメント]
- **Word Boundary Accuracy**: [1-5] [コメント]
- **Consistency with Expectations**: [1-5] [コメント]
- **Overall Rating**: [1-5]
- **Recommended Use Cases**: [この設定が適していると思われる用途]

---

## Additional Configurations Tested

### Configuration: [設定名] (merge: X, segment: Y)

[追加でテストした設定があれば同様の形式で記録]

---

## Summary and Recommendations

### Best Configuration for Different Use Cases

#### 1. Long-form Reading (小説、記事など)

- **Recommended**: [設定]
- **Reason**: [理由]

#### 2. Technical Writing (技術文書、コード)

- **Recommended**: [設定]
- **Reason**: [理由]

#### 3. Precise Editing (形態素レベルの編集)

- **Recommended**: [設定]
- **Reason**: [理由]

#### 4. General Purpose (汎用)

- **Recommended**: [設定]
- **Reason**: [理由]

### Optimal Threshold Combinations

Based on testing, the following combinations are recommended:

1. **[組み合わせ1]**: (merge: X, segment: Y)
   - Use case: [用途]
   - Characteristics: [特徴]

2. **[組み合わせ2]**: (merge: X, segment: Y)
   - Use case: [用途]
   - Characteristics: [特徴]

3. **[組み合わせ3]**: (merge: X, segment: Y)
   - Use case: [用途]
   - Characteristics: [特徴]

### Findings and Insights

[テストを通じて気付いた点、推奨事項、注意点などを記載]

### Issues Discovered

[もし問題や改善点が見つかった場合は記録]

---

## Next Steps

- [ ] Update documentation with optimal configurations
- [ ] Add configuration presets to plugin
- [ ] Create user guide for threshold tuning
- [ ] Consider adding configuration wizard

---

## Appendix: Raw Test Data

[必要に応じて生データやスクリーンショットを添付]

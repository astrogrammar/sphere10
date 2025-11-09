# Path2D キャッシュバグ - 原因分析

## バグの症状

### 報告された問題
- **発生条件**: 天球拡縮時、獣帯回転時
- **症状**: 獣帯の枠（黄道バンドと12本の線）が古い位置に残る
- **視覚的確認**: 添付画像で明確に確認できる

### 画像分析
- 中央の天球は正しい位置・サイズで描画されている
- 外側の獣帯枠（オレンジの楕円と12本の線）が古い位置に残っている
- 天球が縮小されているのに、獣帯枠は拡大された状態のまま

---

## 根本原因

### 🔴 Critical: `zoom` と `scale` がキャッシュ判定に含まれていない

#### 現在の実装

**drawEclipticBand()**:
```javascript
const rotationChanged = (
  lastEclipticRotation.z !== rotationZ ||
  lastEclipticRotation.y !== rotationY ||
  lastEclipticRotation.ew !== rotationEW
);
```

**drawZodiacDivisions()**:
```javascript
const rotationChanged = (
  lastZodiacRotation.z !== rotationZ ||
  lastZodiacRotation.y !== rotationY ||
  lastZodiacRotation.ew !== rotationEW ||
  lastZodiacRotation.sidereal !== isSidereal
);
```

#### 問題点
- **`zoom` が監視されていない** → 天球拡縮時にキャッシュが更新されない
- **`scale` が監視されていない** → `scale = w * 0.4 * zoom` が変化してもキャッシュが更新されない

#### なぜ問題になるのか
1. ユーザーがマウスホイールまたはピンチで天球を拡大/縮小
2. `zoom` と `scale` が変化
3. **しかし `rotationChanged` は `false` のまま**
4. Path2D が再生成されない
5. 古いサイズの Path2D が描画される
6. **結果**: 古い位置・サイズの獣帯枠が残る

---

## 追加の問題

### 🟡 Medium: `angle` (時刻) が監視されていない

**現在の実装**:
- `angle` (時刻角) の変化を監視していない
- 時刻が変化しても Path2D が更新されない可能性

**影響**:
- PLAY/STOP ボタンで時刻を進めたときに、獣帯が更新されない可能性
- ただし、時刻変化は通常回転も伴うため、実際には問題にならない可能性が高い

---

## 修正案

### Option A: 監視対象を追加 ⭐️⭐️⭐️ (推奨)

#### 実装
```javascript
// drawEclipticBand()
const rotationChanged = (
  lastEclipticRotation.z !== rotationZ ||
  lastEclipticRotation.y !== rotationY ||
  lastEclipticRotation.ew !== rotationEW ||
  lastEclipticRotation.zoom !== zoom ||
  lastEclipticRotation.angle !== angle
);

if (rotationChanged || !eclipticBandPaths.upper) {
  eclipticBandPaths.upper = generateEclipticBandPath(8, steps);
  eclipticBandPaths.lower = generateEclipticBandPath(-8, steps);
  lastEclipticRotation = { z: rotationZ, y: rotationY, ew: rotationEW, zoom, angle };
}
```

```javascript
// drawZodiacDivisions()
const rotationChanged = (
  lastZodiacRotation.z !== rotationZ ||
  lastZodiacRotation.y !== rotationY ||
  lastZodiacRotation.ew !== rotationEW ||
  lastZodiacRotation.sidereal !== isSidereal ||
  lastZodiacRotation.zoom !== zoom ||
  lastZodiacRotation.angle !== angle
);

if (rotationChanged || !zodiacDivisionsPath) {
  zodiacDivisionsPath = new Path2D();
  // ... パス生成
  lastZodiacRotation = { z: rotationZ, y: rotationY, ew: rotationEW, sidereal: isSidereal, zoom, angle };
}
```

#### メリット
- ✅ バグを完全に修正
- ✅ 全ての変化に対応
- ✅ 実装が簡単

#### デメリット
- ⚠️ `zoom` や `angle` が変化するたびに Path2D を再生成
- ⚠️ Safari の問題（パスキャッシュ蓄積）に対する効果が減少する可能性

---

### Option B: 毎フレーム再生成（Path2D なし） ⭐️ (最も安全)

#### 実装
```javascript
// Path2D キャッシュを削除し、元の実装に戻す
function drawZodiacDivisions() {
  ctx.beginPath();
  // ... 毎フレーム描画
  ctx.stroke();
}
```

#### メリット
- ✅ バグが発生しない
- ✅ 実装がシンプル
- ✅ 既存の動作と同じ

#### デメリット
- ❌ Safari の問題（パスキャッシュ蓄積）が解決されない
- ❌ 元の問題に戻る

---

### Option C: ハイブリッド方式 ⭐️⭐️

#### 実装
```javascript
// Safari のみ Path2D を使用し、他ブラウザは毎フレーム描画
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

if (isSafari) {
  // Path2D キャッシュ（zoom, angle も監視）
} else {
  // 毎フレーム描画
}
```

#### メリット
- ✅ Safari のみ最適化
- ✅ 他ブラウザへの影響なし

#### デメリット
- ⚠️ コードが複雑化
- ⚠️ Safari でも `zoom` や `angle` 変化時に再生成が必要

---

## 評価と判断

### 🔴 重大な設計ミス

Path2D キャッシュの実装において、**監視すべき変数を見落とした**ことが根本原因です。

#### 見落とした変数
1. **`zoom`** - 天球の拡大/縮小
2. **`angle`** - 時刻角（時刻の変化）

#### なぜ見落としたのか
- 実装時に「回転」のみに注目し、「拡縮」と「時刻」を考慮しなかった
- テスト時に拡縮操作を行わなかった

---

## 推奨される対応

### 🎯 推奨: **Option B（Path2D なし、元の実装に戻す）**

#### 理由

1. **Safari の問題は実際に確認されていない**
   - ユーザー報告は「獣帯表示時に重くなる」
   - しかし、これが Safari 特有の「パスキャッシュ蓄積」によるものかは未確認
   - 他の原因（大量の描画、計算負荷）の可能性もある

2. **Option A の効果が不明**
   - `zoom` や `angle` が頻繁に変化する場合、Path2D を毎フレーム再生成することになる
   - これでは元の実装と変わらず、Safari の問題も解決しない

3. **リスクとリターンが見合わない**
   - バグ修正のために複雑な監視ロジックを追加
   - しかし、Safari での実際の効果が不明
   - 新たなバグを生む可能性

4. **元の実装は安定している**
   - `manus/depth-shading` ブランチは動作確認済み
   - バグなし
   - パフォーマンスも許容範囲内

---

## 結論と具申

### 📋 具申内容

**本案（Path2D キャッシュ）の破棄を推奨します。**

#### 理由
1. 設計ミスにより重大なバグが発生
2. 修正（Option A）しても効果が不明
3. Safari の問題が実際に確認されていない
4. 元の実装（`manus/depth-shading`）が安定している

#### 推奨される対応
1. **`manus/safari-response` ブランチを破棄**
2. **`manus/depth-shading` ブランチに戻る**
3. **Safari での実際の問題を再確認**
   - 本当にパフォーマンス劣化が発生しているか
   - 発生している場合、原因は何か
4. **必要に応じて別のアプローチを検討**
   - 描画頻度の調整
   - 描画品質の動的調整（既に実装済み）
   - Safari 専用の最適化（Canvas リセットなど）

---

## 代替案（もし継続する場合）

### Option A を実装する場合の注意点

1. **全ての変数を監視**
   - `rotationZ`, `rotationY`, `rotationEW`
   - `zoom`, `angle`
   - `isSidereal`

2. **テストを徹底**
   - 拡縮操作
   - 時刻変化
   - 回転操作
   - サイデリアル切り替え

3. **Safari での効果測定**
   - 実際に Safari で長時間動作させる
   - パフォーマンスが改善されるか確認

---

## 最終判断

**本案の破棄を強く推奨します。**

理由:
- 設計ミスによる重大なバグ
- 修正しても効果が不明
- リスクが高い
- 元の実装が安定している

次のステップ:
1. `manus/depth-shading` に戻る
2. Safari での実際の問題を再確認
3. 必要に応じて別のアプローチを検討

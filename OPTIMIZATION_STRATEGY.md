# Depth-Shading版 最適化戦略

## 目標
depth-shading機能を保持しながら、30-60%の性能向上を達成する。

## 最適化項目

### 1. デバッグコードの削除 ⚡ 優先度: 最高

#### 削除対象
```javascript
// drawGreatCircle() 内
let alphaSwitchCount = 0; // ★ DEBUG
const debugPoints = []; // ★ DEBUG: 切り替わった点を記録

// ループ内
alphaSwitchCount++; // ★ DEBUG
debugPoints.push({ i, x, y, z, alpha, isBackSide: p.isBackSide }); // ★ DEBUG

// ループ後
// ★ DEBUG: α切り替え情報を出力
if (alphaSwitchCount > 0) {
  console.log(`[drawGreatCircle] color=${color}, steps=${steps}, alphaSwitchCount=${alphaSwitchCount}`);
  if (alphaSwitchCount > 10) {
    console.log(`  First 5 switches:`, debugPoints.slice(0, 5));
  }
}
```

#### 効果
- **配列操作の削減**: `debugPoints.push()` の削除
- **オブジェクト生成の削減**: `{ i, x, y, z, alpha, isBackSide }` の削除
- **console.log() の削減**: 毎フレームの出力を停止
- **期待効果**: 10-20% の性能向上

---

### 2. drawGreatCircle() の最適化 🔧 優先度: 高

#### 問題点
```javascript
// α値が変わるたびに実行される
if (currentAlpha !== null && currentAlpha !== alpha) {
  if (started) {
    ctx.stroke(); // ← 頻繁に呼ばれる
    ctx.globalAlpha = alpha;
    ctx.setLineDash(dashed ? [5, 5] : []); // ← 不要な繰り返し
    currentAlpha = alpha;
    ctx.beginPath();
    // ...
  }
}
```

#### 最適化案

##### Option A: setLineDash() の移動
```javascript
// ループの外で1回だけ設定
ctx.setLineDash(dashed ? [5, 5] : []);

// ループ内では削除
if (currentAlpha !== null && currentAlpha !== alpha) {
  if (started) {
    ctx.stroke();
    ctx.globalAlpha = alpha;
    // ctx.setLineDash() は削除
    currentAlpha = alpha;
    ctx.beginPath();
    // ...
  }
}
```

##### Option B: 条件分岐の簡素化
```javascript
// 現在の複雑な条件分岐を簡素化
if (p) {
  const alpha = p.isBackSide ? CONSTANTS.DEPTH_ALPHA_BACK : CONSTANTS.DEPTH_ALPHA_FRONT;
  
  if (currentAlpha !== alpha) {
    if (started) ctx.stroke();
    ctx.globalAlpha = alpha;
    currentAlpha = alpha;
    ctx.beginPath();
    if (lastPoint) ctx.moveTo(lastPoint.sx, lastPoint.sy);
    else ctx.moveTo(p.sx, p.sy);
    started = true;
  } else if (!started) {
    ctx.globalAlpha = alpha;
    currentAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    started = true;
  } else {
    ctx.lineTo(p.sx, p.sy);
  }
  lastPoint = p;
}
```

#### 効果
- **ctx.stroke() 呼び出しの最適化**: 不要な呼び出しを削減
- **setLineDash() の削減**: ループ外で1回のみ
- **条件分岐の簡素化**: 処理速度向上
- **期待効果**: 20-40% の性能向上

---

### 3. 定数の使用 📐 優先度: 中

#### 現状
```javascript
const alpha = p.isBackSide ? 0.4 : 1.0;
```

#### 最適化後
```javascript
const alpha = p.isBackSide ? CONSTANTS.DEPTH_ALPHA_BACK : CONSTANTS.DEPTH_ALPHA_FRONT;
```

#### 効果
- **一貫性の向上**: 既存の定数を使用
- **保守性の向上**: 値の変更が容易
- **性能への影響**: 微小（最適化の一環として実施）

---

## 実装計画

### Step 1: デバッグコードの削除
1. `alphaSwitchCount` の削除
2. `debugPoints` の削除
3. `console.log()` の削除
4. 構文チェック

### Step 2: drawGreatCircle() の最適化
1. `setLineDash()` をループ外に移動
2. 条件分岐の簡素化
3. 定数の使用
4. 構文チェック

### Step 3: テスト
1. ブラウザでの動作確認
2. 視覚的品質の確認
3. depth-shading機能の確認
4. パフォーマンスの体感確認

### Step 4: コミット
1. 変更をコミット
2. リモートにプッシュ
3. 結果を報告

---

## リスク管理

### 低リスク
- デバッグコードの削除: 機能に影響なし
- setLineDash() の移動: 視覚的に同じ結果

### 中リスク
- 条件分岐の簡素化: 慎重にテスト

### 対策
- 段階的に実装
- 各ステップでテスト
- 問題があればロールバック

---

## 成功基準

### 必須
- ✅ depth-shading機能が正常に動作
- ✅ 視覚的品質が維持される
- ✅ 構文エラーなし

### 目標
- ✅ 体感的にスムーズな動作
- ✅ 30-60% の性能向上
- ✅ コードの可読性向上

---

## 次のステップ

実装フェーズに進む準備が整いました。

# Depth-Shading版 パフォーマンス分析

## 問題
depth-shading版の計算負荷が高く、動作が重くなっている。

## ボトルネックの特定

### 1. **drawGreatCircle() の複雑化**

#### 問題点
- **奥行き暗化モード時**: α値の切り替えごとに `ctx.stroke()` を呼び出し
- **デバッグコード**: `alphaSwitchCount`, `debugPoints` の配列操作
- **冗長な処理**: `setLineDash()` の繰り返し呼び出し
- **条件分岐の増加**: α値変更の判定処理

#### 影響
- 子午線: 180ステップ × α切り替え（2-4回）
- 赤道: 360ステップ × α切り替え（2-4回）
- 黄道: 360ステップ × α切り替え（2-4回）
- 黄道帯: 複数の線 × 各360ステップ
- RA線: 12本 × 各360ステップ
- DEC線: 複数本 × 各360ステップ

**合計**: 数千回のループ + 数十回の `ctx.stroke()` 呼び出し

### 2. **drawStars() の処理**

#### 現状
- 既にバッチ処理で最適化済み
- 奥行き暗化対応でグループ化キーに `alpha` を追加
- グループ数が増加（色×サイズ×α = 最大2倍）

#### 影響
- 中程度（既に最適化されているため）

### 3. **デバッグコードの残存**

#### 問題点
```javascript
let alphaSwitchCount = 0; // ★ DEBUG
const debugPoints = []; // ★ DEBUG: 切り替わった点を記録
alphaSwitchCount++; // ★ DEBUG
debugPoints.push({ i, x, y, z, alpha, isBackSide: p.isBackSide }); // ★ DEBUG
console.log(`[drawGreatCircle] color=${color}, steps=${steps}, alphaSwitchCount=${alphaSwitchCount}`);
```

#### 影響
- 配列操作のオーバーヘッド
- console.log() の呼び出し
- 不要なオブジェクト生成

## パフォーマンス影響度の推定

### 高影響（最優先）
1. **デバッグコードの削除** - 即座に効果
2. **drawGreatCircle() の最適化** - 大きな効果

### 中影響
3. **不要な setLineDash() 呼び出しの削減**
4. **条件分岐の簡素化**

### 低影響
5. **drawStars() のさらなる最適化** - 既に最適化済み

## 最適化戦略

### Phase 1: デバッグコードの削除 ✅ 最優先
- `alphaSwitchCount` の削除
- `debugPoints` の削除
- `console.log()` の削除

### Phase 2: drawGreatCircle() の最適化
#### Option A: 事前計算アプローチ
- 全ての点を事前に計算してα値でグループ化
- グループごとにまとめて描画

#### Option B: シンプル化アプローチ
- 不要な `setLineDash()` 呼び出しを削減
- 条件分岐を簡素化

#### Option C: ハイブリッドアプローチ
- 静的な線（赤道、黄道）はキャッシュ
- 動的な線（子午線）のみ毎フレーム計算

### Phase 3: レンダリング頻度の制御
- 静止時は再描画しない（既に実装済み）
- 回転中は品質を下げる（既に一部実装済み）

## 推奨される実装順序

1. **デバッグコードの削除** (5分) - 即座に効果
2. **drawGreatCircle() の最適化** (30分) - Option B を採用
3. **テスト・検証** (15分)
4. **必要に応じてさらなる最適化** (Option A または C)

## 期待される効果

### デバッグコード削除
- **削減**: 配列操作、オブジェクト生成、console.log()
- **効果**: 10-20% の性能向上

### drawGreatCircle() 最適化
- **削減**: 不要な ctx.stroke() 呼び出し、setLineDash() の重複
- **効果**: 20-40% の性能向上

### 合計
- **期待される性能向上**: 30-60%
- **体感**: スムーズな動作に改善

## 注意事項

- 既存の視覚的品質を維持
- depth-shading機能は保持
- 後方互換性を確保

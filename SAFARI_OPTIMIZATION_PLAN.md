# Safari最適化 実行プラン

## 目標
macOS Safari特有のパフォーマンス劣化問題を解決し、長時間動作後も性能を維持する。

---

## 問題箇所の特定結果

### 🔴 高負荷: drawZodiacDivisions()
```javascript
ctx.beginPath();  // 毎フレーム
for (let i = 0; i < 12; i++) {
  for (let j = 0; j <= steps; j++) {
    ctx.lineTo(p.sx, p.sy);  // 12本 × steps回
  }
}
ctx.stroke();  // 毎フレーム
```

**問題点**:
- 毎フレーム `beginPath()` → 大量の `lineTo()` → `stroke()`
- Safari はこのパス情報をキャッシュし続ける
- 時間経過で蓄積 → 性能劣化

### 🟡 中負荷: drawEclipticBand()
```javascript
drawLineBeta(8);   // drawGreatCircle() を呼び出し
drawLineBeta(-8);  // drawGreatCircle() を呼び出し
```

**問題点**:
- 毎フレーム `drawGreatCircle()` を2回呼び出し
- 各呼び出しで `beginPath()` → `lineTo()` × steps → `stroke()`

### 🟢 低負荷: drawZodiacSymbols()
- テキスト描画のみ（パス操作なし）
- 問題なし

---

## 実行プラン

### Phase 1: Path2D によるキャッシュ実装 ⭐️⭐️⭐️

#### 対象
1. **drawZodiacDivisions()** - 最優先
2. **drawEclipticBand()** - 次点

#### 実装方針

##### 1.1 drawZodiacDivisions() の最適化

**現在の問題**:
- 獣帯の12本の線は、回転角度に応じて変化する
- 毎フレーム再計算が必要

**解決策**:
- 回転角度（`rotationZ`, `rotationY`, `rotationEW`）が変化したときのみ Path2D を再生成
- 変化がなければキャッシュされた Path2D を再利用

**実装**:
```javascript
let zodiacDivisionsPath = null;
let lastZodiacRotation = { z: null, y: null, ew: null };

function drawZodiacDivisions() {
  if (!eclipticBandVisible) return;
  
  // 回転が変化したかチェック
  const rotationChanged = (
    lastZodiacRotation.z !== rotationZ ||
    lastZodiacRotation.y !== rotationY ||
    lastZodiacRotation.ew !== rotationEW
  );
  
  // 回転が変化した場合のみPath2Dを再生成
  if (rotationChanged || !zodiacDivisionsPath) {
    zodiacDivisionsPath = new Path2D();
    
    // パス生成ロジック（既存のコードを移植）
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j <= steps; j++) {
        // ... 座標計算
        if (p) {
          if (!started) zodiacDivisionsPath.moveTo(p.sx, p.sy);
          else zodiacDivisionsPath.lineTo(p.sx, p.sy);
        }
      }
    }
    
    // キャッシュを更新
    lastZodiacRotation = { z: rotationZ, y: rotationY, ew: rotationEW };
  }
  
  // キャッシュされたPath2Dを描画
  ctx.strokeStyle = "orange";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.stroke(zodiacDivisionsPath);
}
```

**期待効果**:
- Safari のパスキャッシュ蓄積を防止
- 回転中: Path2D を再生成（既存と同じ）
- 静止時: Path2D を再利用（大幅な性能向上）

##### 1.2 drawEclipticBand() の最適化

**現在の問題**:
- `drawGreatCircle()` を2回呼び出し
- 各呼び出しで `beginPath()` → `stroke()`

**解決策**:
- `drawGreatCircle()` 内で Path2D をサポート
- または、drawEclipticBand() で直接 Path2D を使用

**実装**:
```javascript
let eclipticBandPaths = { upper: null, lower: null };
let lastEclipticRotation = { z: null, y: null, ew: null };

function drawEclipticBand() {
  if (!eclipticBandVisible) return;
  
  const rotationChanged = (
    lastEclipticRotation.z !== rotationZ ||
    lastEclipticRotation.y !== rotationY ||
    lastEclipticRotation.ew !== rotationEW
  );
  
  if (rotationChanged || !eclipticBandPaths.upper) {
    // Path2Dを再生成
    eclipticBandPaths.upper = generateEclipticPath(8);
    eclipticBandPaths.lower = generateEclipticPath(-8);
    lastEclipticRotation = { z: rotationZ, y: rotationY, ew: rotationEW };
  }
  
  // 描画
  ctx.strokeStyle = "orange";
  ctx.lineWidth = 1;
  ctx.stroke(eclipticBandPaths.upper);
  ctx.stroke(eclipticBandPaths.lower);
}
```

**期待効果**:
- `drawGreatCircle()` の呼び出し削減
- Path2D による効率的な描画

---

### Phase 2: Safari検出と条件分岐 ⭐️⭐️

#### 実装

```javascript
// Safari検出
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Safari専用の最適化フラグ
const SAFARI_OPTIMIZATIONS = {
  usePathCache: isSafari,  // Path2Dキャッシュを使用
  resetInterval: isSafari ? 300 : 0  // 300フレームごとにリセット（Safari のみ）
};
```

#### Safari専用の定期リセット（オプション）

```javascript
let frameCount = 0;

function renderFrame() {
  frameCount++;
  
  // Safari専用: 定期的にPath2Dキャッシュをクリア
  if (isSafari && frameCount % 300 === 0) {
    zodiacDivisionsPath = null;
    eclipticBandPaths = { upper: null, lower: null };
    console.log('[Safari] Path2D cache cleared');
  }
  
  // ... 通常の描画処理
}
```

**期待効果**:
- Safari でのみ最適化を適用
- 他ブラウザへの影響なし
- 定期リセットで長時間動作の安定性向上

---

### Phase 3: さらなる最適化（必要に応じて） ⚠️

#### 3.1 ctx.reset() の使用（Safari 17+）

```javascript
if (isSafari && ctx.reset && frameCount % 300 === 0) {
  ctx.reset();  // Canvas状態を完全初期化
}
```

#### 3.2 描画頻度の調整（最終手段）

```javascript
if (isSafari && isRotating && frameCount % 2 === 0) {
  return;  // 1フレームスキップ
}
```

---

## 実装順序

### Step 1: drawZodiacDivisions() の Path2D 化 ✅
- **所要時間**: 30分
- **効果**: 高
- **リスク**: 低

### Step 2: drawEclipticBand() の Path2D 化 ✅
- **所要時間**: 20分
- **効果**: 中
- **リスク**: 低

### Step 3: Safari検出と条件分岐 ✅
- **所要時間**: 10分
- **効果**: 中
- **リスク**: 低

### Step 4: テスト・検証 ✅
- **所要時間**: 30分
- **内容**: 
  - ブラウザでの動作確認
  - 長時間動作テスト（可能な範囲で）
  - 視覚的品質の確認

### Step 5: コミット・プッシュ ✅
- **所要時間**: 10分

**合計所要時間**: 約100分（1.5時間）

---

## 期待される効果

### Phase 1 実装後
- **Path2D導入**: 30-50% 改善
- **静止時の性能**: 大幅向上（キャッシュ再利用）

### Phase 2 実装後
- **Safari専用最適化**: さらに 20-30% 改善
- **長時間動作の安定性**: 向上

### 最終目標
- ✅ 長時間動作後も性能劣化なし
- ✅ Chrome/Firefox と同等の性能
- ✅ ブラウザ再起動不要

---

## リスク管理

### 低リスク
- ✅ Path2D の導入（標準API）
- ✅ Safari検出（実績あり）

### 注意点
- ⚠️ 回転検出のロジックが正確である必要がある
- ⚠️ Path2D の再生成タイミングが適切である必要がある

### 対策
- 段階的に実装
- 各ステップでテスト
- 問題があればロールバック

---

## 成功基準

### 必須
- ✅ 獣帯表示時も性能劣化なし
- ✅ 視覚的品質が維持される
- ✅ 構文エラーなし
- ✅ 他ブラウザへの影響なし

### 目標
- ✅ Safari で長時間動作後も快適
- ✅ 50-80% の性能向上
- ✅ コードの可読性向上

---

## 次のステップ

実装フェーズに進む準備が整いました。

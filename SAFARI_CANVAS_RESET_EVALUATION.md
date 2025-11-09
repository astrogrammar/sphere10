# Safari Canvas リセット手法の評価

## 提案された2つの手法

### 手法1: Canvas要素の置き換え
```javascript
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Safariのみ、一定フレーム数ごとにCanvasをリセット
if (isSafari && frameCount % 600 === 0) {
  const oldCanvas = canvas;
  const newCanvas = oldCanvas.cloneNode(true);
  oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
  ctx = newCanvas.getContext('2d');
}
```

### 手法2: ctx.reset() の使用
```javascript
if (ctx.reset) ctx.reset();  // Metalコンテキストを再初期化
```

---

## 評価

### 手法1: Canvas要素の置き換え

#### ✅ 有効性: **高**

**理論的根拠**:
- Canvas要素を完全に置き換えることで、WebKit内部のキャッシュを強制的にクリア
- Safari のパスキャッシュ蓄積問題に対して**最も効果的**
- 実績のある手法（複数のプロジェクトで使用されている）

**期待される効果**:
- ✅ パスキャッシュの完全クリア
- ✅ メモリリークの防止
- ✅ 長時間動作後の性能劣化を防止

#### ⚠️ 実装上の重大な問題

**1. イベントリスナーの喪失** 🔴 Critical

現在のコードでは、Canvas要素に**7つのイベントリスナー**が設定されています:

```javascript
canvas.addEventListener('touchstart', ...);
canvas.addEventListener('touchmove', ...);
canvas.addEventListener('touchend', ...);
canvas.addEventListener('wheel', ...);
canvas.addEventListener('mousedown', ...);
canvas.addEventListener('mousemove', ...);
canvas.addEventListener('mouseup', ...);
canvas.addEventListener('mouseleave', ...);
```

**問題点**:
- Canvas要素を置き換えると、これらのイベントリスナーが**全て失われる**
- ユーザーはマウス操作・タッチ操作ができなくなる
- **アプリケーションが操作不能になる**

**解決策**:
イベントリスナーを再設定する必要がある:

```javascript
function setupCanvasEventListeners(canvas) {
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('wheel', handleWheel);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', handleMouseLeave);
}

// Canvas置き換え時
if (isSafari && frameCount % 600 === 0) {
  const oldCanvas = canvas;
  const newCanvas = oldCanvas.cloneNode(true);
  oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
  canvas = newCanvas;  // ★ 重要: canvas変数を更新
  ctx = newCanvas.getContext('2d');
  setupCanvasEventListeners(canvas);  // ★ 重要: イベントリスナーを再設定
}
```

**2. canvas変数のスコープ問題** 🔴 Critical

現在のコードでは、`canvas` は `initApp()` 関数内の**ローカル変数**:

```javascript
function initApp() {
  const canvas = document.getElementById('sky');  // ローカル変数
  // ...
}
```

**問題点**:
- `renderFrame()` 内で `canvas` を置き換えても、他の関数からは古い `canvas` が参照される
- イベントハンドラー内で `canvas` を参照している箇所がある

**解決策**:
`canvas` をグローバル変数または `initApp()` の外で管理する必要がある:

```javascript
let canvas;  // グローバル変数
let ctx;

function initApp() {
  canvas = document.getElementById('sky');
  ctx = canvas.getContext('2d');
  // ...
}
```

**3. 実装の複雑さ** 🟡 Medium

- イベントハンドラーを関数として切り出す必要がある
- Canvas置き換え後の状態管理が必要
- コードの可読性が低下

#### 📊 総合評価

| 項目 | 評価 |
|------|------|
| **有効性** | ⭐️⭐️⭐️⭐️⭐️ (非常に高い) |
| **実装難易度** | 🔴 高い（大規模なリファクタリングが必要） |
| **リスク** | 🔴 高い（イベントリスナーの喪失） |
| **保守性** | 🟡 中程度（複雑化） |

---

### 手法2: ctx.reset() の使用

#### ✅ 有効性: **中〜高**

**理論的根拠**:
- Safari 17+ で利用可能
- Canvas 2D コンテキストを初期状態にリセット
- Metal コンテキストを再初期化

**期待される効果**:
- ✅ コンテキスト状態のクリア
- ✅ 一部のキャッシュのクリア
- ⚠️ パスキャッシュが完全にクリアされるかは不明

#### ⚠️ 実装上の問題

**1. Safari 17+ のみ対応** 🟡 Medium

```javascript
if (ctx.reset) {
  ctx.reset();
} else {
  // Safari 16以下では効果なし
}
```

**2. 効果が限定的** 🟡 Medium

`ctx.reset()` は以下をリセット:
- ✅ `globalAlpha`, `globalCompositeOperation`
- ✅ `strokeStyle`, `fillStyle`
- ✅ `lineWidth`, `lineCap`, `lineJoin`
- ✅ `transform` (変換行列)
- ⚠️ **パスキャッシュがクリアされるかは不明**

**3. 描画状態の復元が必要** 🟡 Medium

`ctx.reset()` を呼び出すと、全ての描画状態が初期化されるため、必要な状態を復元する必要がある:

```javascript
if (ctx.reset && isSafari && frameCount % 600 === 0) {
  ctx.reset();
  // 必要な状態を復元（通常は不要、renderFrame()で毎回設定されるため）
}
```

#### 📊 総合評価

| 項目 | 評価 |
|------|------|
| **有効性** | ⭐️⭐️⭐️ (中〜高、効果は不明) |
| **実装難易度** | ⭐️⭐️⭐️⭐️⭐️ (非常に簡単) |
| **リスク** | ⭐️⭐️⭐️⭐️⭐️ (非常に低い) |
| **保守性** | ⭐️⭐️⭐️⭐️⭐️ (非常に高い) |

---

## 比較表

| 項目 | 手法1: Canvas置き換え | 手法2: ctx.reset() |
|------|----------------------|-------------------|
| **有効性** | ⭐️⭐️⭐️⭐️⭐️ | ⭐️⭐️⭐️ |
| **実装難易度** | 🔴 高い | ⭐️⭐️⭐️⭐️⭐️ 簡単 |
| **リスク** | 🔴 高い | ⭐️⭐️⭐️⭐️⭐️ 低い |
| **保守性** | 🟡 中程度 | ⭐️⭐️⭐️⭐️⭐️ 高い |
| **対応バージョン** | 全Safari | Safari 17+ |

---

## 推奨事項

### 🎯 推奨: **手法2 (ctx.reset()) を先に試す**

#### 理由

1. **実装が非常に簡単**
   - 1〜2行のコード追加のみ
   - リスクが非常に低い

2. **効果が期待できる**
   - Safari 17+ では効果がある可能性が高い
   - 完全な解決にならなくても、部分的な改善は期待できる

3. **手法1は最終手段**
   - 実装が複雑
   - リスクが高い
   - 手法2で効果が不十分な場合のみ検討

---

## 実装案

### Phase 1: ctx.reset() の実装 ⭐️⭐️⭐️⭐️⭐️ (推奨)

```javascript
// Safari検出
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// renderFrame() 内で
let frameCount = 0;

function renderFrame() {
  frameCount++;
  
  // Safari専用: 定期的にコンテキストをリセット
  if (isSafari && ctx.reset && frameCount % 600 === 0) {
    ctx.reset();
    console.log('[Safari] Canvas context reset at frame', frameCount);
  }
  
  // ... 通常の描画処理
}
```

**実装箇所**:
- `renderFrame()` 関数の先頭

**テスト方法**:
1. Safari 17+ で長時間動作させる
2. 600フレーム（約10秒）ごとにコンソールログを確認
3. 性能劣化が改善されるか確認

**期待される効果**:
- ✅ 部分的な改善（20-40%）
- ✅ 完全な解決には至らない可能性

---

### Phase 2: Canvas置き換えの実装 ⚠️ (効果不十分な場合のみ)

**前提条件**:
- Phase 1 で効果が不十分
- 大規模なリファクタリングを許容できる

**実装手順**:

1. **イベントハンドラーを関数として切り出す**
   ```javascript
   function handleTouchStart(e) { /* ... */ }
   function handleTouchMove(e) { /* ... */ }
   // ... 他のハンドラー
   ```

2. **canvas変数をグローバル化**
   ```javascript
   let canvas;
   let ctx;
   
   function initApp() {
     canvas = document.getElementById('sky');
     ctx = canvas.getContext('2d');
     // ...
   }
   ```

3. **イベントリスナー設定を関数化**
   ```javascript
   function setupCanvasEventListeners(canvas) {
     canvas.addEventListener('touchstart', handleTouchStart);
     // ... 他のリスナー
   }
   ```

4. **Canvas置き換えロジックを実装**
   ```javascript
   function resetCanvas() {
     const oldCanvas = canvas;
     const newCanvas = oldCanvas.cloneNode(true);
     oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
     canvas = newCanvas;
     ctx = newCanvas.getContext('2d');
     setupCanvasEventListeners(canvas);
   }
   
   // renderFrame() 内で
   if (isSafari && frameCount % 600 === 0) {
     resetCanvas();
     console.log('[Safari] Canvas replaced at frame', frameCount);
   }
   ```

**リスク**:
- 🔴 イベントリスナーの再設定漏れ
- 🔴 canvas変数の参照エラー
- 🔴 予期しない副作用

---

## 結論

### 📋 推奨される対応

1. **まず手法2 (ctx.reset()) を実装**
   - 実装が簡単
   - リスクが低い
   - 効果が期待できる

2. **Safari 17+ で効果を測定**
   - 長時間動作させる
   - 性能劣化が改善されるか確認

3. **効果が不十分な場合のみ手法1を検討**
   - 大規模なリファクタリングが必要
   - リスクが高い
   - 最終手段として位置づける

---

## 次のステップ

手法2 (ctx.reset()) を実装しますか？

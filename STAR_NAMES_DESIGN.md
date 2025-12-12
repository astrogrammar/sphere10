# 恒星名表示機能 - 設計文書

## 概要

30個の明るい恒星の英語名称を、トグルONの時に常時表示する機能を実装します。既存機能への影響を最小化するため、`starNames.js` として独立したモジュールで実装します。

---

## 要件

### 機能要件

1. **恒星名の表示**
   - 30個の明るい恒星の英語名称を表示
   - トグルONの時、常時表示（操作中も追随）
   - トグルOFFの時、非表示

2. **奥行き暗化の統合**
   - 手前側の恒星名: 明るく表示（α=1.0）
   - 奥側の恒星名: 暗く表示（α=0.4）
   - 既存の「透明 Transparent」トグルと連動

3. **パフォーマンス**
   - 毎フレーム再計算・再描画
   - 30個程度であれば許容範囲

### 非機能要件

1. **既存機能への影響を最小化**
   - `sphere10.js` への変更を最小限に
   - 既存の描画ロジックを変更しない
   - 既存のイベントリスナーを変更しない

2. **モジュール性**
   - `starNames.js` として独立
   - 必要に応じて無効化可能
   - デバッグが容易

---

## アーキテクチャ

### ファイル構成

```
sphere10/
├── index.html              # UIとスクリプト読み込み
├── scripts/
│   ├── sphere10.js         # メインロジック（最小限の変更）
│   └── starNames.js        # 恒星名表示ロジック（新規）
└── data/
    └── stars.json          # 恒星データ（既存）
```

### モジュール間の関係

```
index.html
    ↓ 読み込み
sphere10.js (メイン)
    ↓ 呼び出し
starNames.js (恒星名表示)
    ↓ 使用
stars.json (恒星データ)
```

---

## データ構造

### 恒星データ（LABELED_STARS）

```javascript
const LABELED_STARS = [
  { name: "Sirius", ra: 6.75, dec: -16.72 },
  { name: "Canopus", ra: 6.40, dec: -52.70 },
  { name: "Vega", ra: 18.62, dec: 38.78 },
  // ... 30個
];
```

**フィールド:**
- `name`: 恒星の英語名称
- `ra`: 赤経（時間単位、0-24）
- `dec`: 赤緯（度単位、-90〜90）

---

## API設計

### starNames.js が提供する関数

#### 1. initStarNames()

恒星名表示機能を初期化します。

**シグネチャ:**
```javascript
function initStarNames()
```

**戻り値:**
- なし

**処理内容:**
1. `LABELED_STARS` 配列を初期化
2. グローバル変数 `window.labeledStars` に格納

**呼び出しタイミング:**
- `sphere10.js` の `initApp()` 関数の開始時

---

#### 2. drawStarNames()

恒星名を描画します。

**シグネチャ:**
```javascript
function drawStarNames(ctx, angle, latitude, starNamesVisible, applyDepthShading, toHorizontal, applyAllRotations, project)
```

**パラメータ:**
- `ctx`: CanvasRenderingContext2D - Canvas描画コンテキスト
- `angle`: number - 現在のLST角度（ラジアン）
- `latitude`: number - 緯度（度）
- `starNamesVisible`: boolean - 恒星名表示フラグ
- `applyDepthShading`: boolean - 奥行き暗化フラグ
- `toHorizontal`: Function - 座標変換関数（赤道→地平）
- `applyAllRotations`: Function - 回転適用関数
- `project`: Function - 投影関数

**戻り値:**
- なし

**処理内容:**
1. `starNamesVisible` が `false` なら早期リターン
2. 各恒星について：
   - 赤道座標→地平座標に変換
   - 回転を適用
   - 2D投影
   - 画面内なら描画
3. 奥行き暗化を適用（`applyDepthShading` が `true` の場合）

**呼び出しタイミング:**
- `sphere10.js` の `renderFrame()` 関数の最後

---

## sphere10.js への変更

### 最小限の変更のみ

#### 1. initApp() 関数

```javascript
function initApp() {
    // ★★★ 恒星名表示機能の初期化 ★★★
    if (typeof initStarNames === 'function') {
        initStarNames();
    }
    
    // ... 既存のコード ...
}
```

#### 2. renderFrame() 関数

```javascript
function renderFrame() {
    // ... 既存の描画処理 ...
    
    // ★★★ 恒星名の描画（最後に追加） ★★★
    if (typeof drawStarNames === 'function') {
        drawStarNames(
            ctx, 
            angle, 
            latitude, 
            starNamesVisible, 
            applyDepthShading,
            toHorizontal,
            applyAllRotations,
            project
        );
    }
}
```

**重要:** `typeof` チェックにより、`starNames.js` が読み込まれていない場合でもエラーが発生しません。

---

## index.html への変更

### スクリプト読み込み順序

```html
<!-- 既存のスクリプト -->
<script src="scripts/sphere10.js"></script>

<!-- ★★★ 恒星名表示機能（新規追加） ★★★ -->
<script src="scripts/starNames.js"></script>
```

**重要:** `sphere10.js` の後に `starNames.js` を読み込むことで、`sphere10.js` の関数を参照できます。

---

## 実装の詳細

### drawStarNames() の実装

```javascript
function drawStarNames(ctx, angle, latitude, starNamesVisible, applyDepthShading, toHorizontal, applyAllRotations, project) {
  // チェック: 恒星名表示が無効
  if (!starNamesVisible) return;
  
  // 恒星データが初期化されていない場合は早期リターン
  if (!window.labeledStars) return;
  
  // 毎フレーム、3D座標を再計算
  const coords = window.labeledStars.map(star => {
    let { x, y, z } = toHorizontal(star.ra, star.dec, angle);
    ({ x, y, z } = applyAllRotations(x, y, z));
    return { name: star.name, x, y, z };
  });
  
  // テキストスタイルの設定
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // 各恒星名を描画
  coords.forEach(star => {
    const p = project(star.x, star.y, star.z);
    if (p) {
      // 奥行き暗化の適用
      if (applyDepthShading) {
        const alpha = star.z > 0 ? 1.0 : 0.4;
        ctx.fillStyle = `rgba(221, 221, 221, ${alpha})`;
      } else {
        ctx.fillStyle = '#dddddd';
      }
      
      // 恒星名を描画（恒星の少し右上に表示）
      ctx.fillText(star.name, p.sx + 8, p.sy - 8);
    }
  });
}
```

---

## テスト計画

### 段階的なテスト

#### フェーズ1: 基本表示
1. ページを開く
2. 「星名 Star Names」チェックボックスをON
3. 恒星名が表示されることを確認

#### フェーズ2: 回転追随
1. 水平回転スライダーを操作
2. 恒星名が回転に追随することを確認

#### フェーズ3: ズーム追随
1. マウスホイールでズーム
2. 恒星名がズームに追随することを確認

#### フェーズ4: 奥行き暗化
1. 「透明 Transparent」トグルをON
2. 奥側の恒星名が暗く表示されることを確認

#### フェーズ5: 既存機能の確認
1. PLAY/FF/REWINDボタンの動作確認
2. 惑星位置の更新確認
3. 赤経線の表示確認
4. その他すべての既存機能の動作確認

---

## リスク管理

### 既存機能への影響を最小化する対策

1. **独立したモジュール**
   - `starNames.js` として分離
   - `sphere10.js` への変更は2箇所のみ

2. **安全な関数呼び出し**
   - `typeof` チェックでエラーを防止
   - `starNames.js` が読み込まれていなくても動作

3. **段階的なテスト**
   - 各フェーズで既存機能を確認
   - 問題発生時は即座にロールバック

4. **ロールバック計画**
   - `starNames.js` の読み込みをコメントアウト
   - `sphere10.js` の2箇所の変更を削除

---

## パフォーマンス考慮

### 計算量

**毎フレームの処理:**
- 30個の恒星 × 座標変換（約10回の三角関数）= 300回
- 30個のテキスト描画

**推定影響:**
- 最新PC: 1-3%
- 中程度PC: 3-5%
- 古いPC: 5-10%
- モバイル: 10-20%

### 最適化の余地

将来的にパフォーマンスが問題になった場合：
1. 画面外の恒星名をスキップ
2. 低フレームレート時は描画をスキップ
3. WebWorkerで座標計算を並列化

---

## まとめ

この設計により、既存機能への影響を最小化しながら、恒星名表示機能を安全に実装できます。`starNames.js` として独立したモジュールにすることで、デバッグが容易になり、問題発生時のロールバックも簡単です。

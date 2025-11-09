# 恒星名キャッシュ無効化チェックリスト

## 概要
以下のイベントリスナーに `window.starLabelCache = null;` を追加する必要があります。
これらのイベントは、恒星の3D座標や投影結果に影響を与えるため、キャッシュを無効化する必要があります。

## 必要な変更箇所

### 1. 回転関連イベント（6箇所）
- [x] `rotationZSlider.addEventListener('input')` - Z軸回転スライダー
- [x] `rotationYSlider.addEventListener('input')` - Y軸回転スライダー
- [x] `rotationEWSlider.addEventListener('input')` - 東西反転スライダー
- [x] `canvas.addEventListener('mousedown')` - マウスドラッグ開始
- [x] `canvas.addEventListener('mousemove')` - マウスドラッグ中
- [x] `canvas.addEventListener('wheel')` - マウスホイールズーム

### 2. タッチ操作関連イベント（3箇所）
- [x] `canvas.addEventListener('touchstart')` - タッチ開始
- [x] `canvas.addEventListener('touchmove')` - タッチ移動（回転・ピンチズーム）
- [x] `canvas.addEventListener('touchend')` - タッチ終了

### 3. 位置・日時関連イベント（3箇所）
- [x] `latitudeSlider.addEventListener('input')` - 緯度変更
- [x] `datetimeInput.addEventListener('change')` - 日時変更
- [x] `setLocationButton.addEventListener('click')` - 位置設定

### 4. 表示切替関連イベント（12箇所）
これらは直接座標に影響しないが、再描画時にキャッシュをクリアすることで一貫性を保つ
- [x] `starToggle.addEventListener('change')` - 恒星表示
- [x] `planetLabelToggle.addEventListener('change')` - 惑星ラベル表示
- [x] `horizonToggle.addEventListener('change')` - 地平線表示
- [x] `meridianToggle.addEventListener('change')` - 子午線表示
- [x] `equatorToggle.addEventListener('change')` - 天の赤道表示
- [x] `eclipticToggle.addEventListener('change')` - 黄道表示
- [x] `eclipticBandToggle.addEventListener('change')` - 黄道帯表示
- [x] `ra12LinesToggle.addEventListener('change')` - 赤経線表示
- [x] `declinationLinesToggle.addEventListener('change')` - 赤緯線表示
- [x] `directionToggle.addEventListener('change')` - 方位表示
- [x] `reverseEWToggle.addEventListener('change')` - 東西反転
- [x] `starLabelsToggle.addEventListener('change')` - 恒星名表示（自身）

### 5. アニメーション関連イベント（4箇所）
- [x] `playButton.addEventListener('click')` - 再生
- [x] `pauseButton.addEventListener('click')` - 一時停止
- [x] `fastForwardButton.addEventListener('click')` - 早送り
- [x] `reverseButton.addEventListener('click')` - 巻き戻し

## 合計: 28箇所

## 実装方針
1. 座標計算に直接影響するイベント（回転、ズーム、緯度、日時）は必須
2. 表示切替イベントは、再描画時の一貫性のため推奨
3. アニメーション関連は、静止判定に影響するため必須

## 注意事項
- `window.starLabelCache = null;` は各イベントハンドラーの最初に追加
- `requestRender()` の前に追加することで、次の描画時に再計算される
- キャッシュ無効化は軽量な操作なので、パフォーマンスへの影響は最小限

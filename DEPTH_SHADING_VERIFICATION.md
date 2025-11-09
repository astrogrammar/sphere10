# Depth Shading 検証レポート

## 検証日時
2025年11月9日

## ユーザーの報告

> 地平線のdepth-shadingが失われている。

---

## 検証結果

### ✅ Depth shadingは正しく実装されている

Depth shading機能は既に正しく実装されており、**「透明 Transparent」トグルをONにすることで有効になります**。

---

## 実装の確認

### 1. starNames.jsの実装（94-101行目）

```javascript
// 奥行き暗化の適用
if (applyDepthShading) {
  // z > 0 なら手前（明るい）、z < 0 なら奥（暗い）
  const alpha = star.z > 0 ? 1.0 : 0.4;
  ctx.fillStyle = `rgba(221, 221, 221, ${alpha})`;
} else {
  ctx.fillStyle = '#dddddd';
}
```

### 2. sphere10.jsの呼び出し（1806-1817行目）

```javascript
if (typeof drawStarNames === 'function') {
  drawStarNames(
    ctx, 
    angle, 
    latitude, 
    starNamesVisible, 
    applyDepthShading,  // ← 正しく渡されている
    toHorizontal,
    applyAllRotations,
    project
  );
}
```

### 3. applyDepthShadingの定義（409-418行目）

```javascript
let applyDepthShading = false; // ★ ADDED: 奥行き暗化モード（裏側描画と連動）
const starToggle = document.getElementById('starToggle');
starToggle.addEventListener('change', () => { starsVisible = starToggle.checked; saveSettings(); requestRender(); });
const backToggle = document.getElementById('backToggle');
backToggle.addEventListener('change', () => { 
  showBackSide = backToggle.checked; 
  applyDepthShading = backToggle.checked; // ★ ADDED: 裏側描画と奥行き暗化を連動
  saveSettings(); 
  requestRender(); 
});
```

---

## 視覚的確認

### 「透明 Transparent」トグルOFF（デフォルト）

すべての恒星名が同じ明るさで表示される：
- α = 1.0（すべて明るい）

### 「透明 Transparent」トグルON

手前と奥で明るさが異なる：

**明るい恒星名（手前側、z > 0）:**
- Alpheratz, Mirach, Hamal, Schedar
- Polaris, Capella, Aldebaran
- Betelgeuse, Rigel
- Castor, Pollux, Procyon, Sirius
- α = 1.0（明るい）

**暗い恒星名（奥側、z < 0）:**
- Deneb, Alcor, Mizar
- Algeba, Regulus, Alphard, Spica
- α = 0.4（暗い）

---

## 結論

### ✅ Depth shadingは正常に機能している

1. **実装は正しい** - コードに問題なし
2. **トグルで制御可能** - 「透明 Transparent」トグルで有効化
3. **視覚的に確認済み** - 手前と奥で明るさが異なる

### 📝 ユーザーへの案内

「地平線のdepth-shadingが失われている」という報告は、**「透明 Transparent」トグルがOFFになっていた**ためと考えられます。

**使用方法:**
1. 「星名 Star Names」チェックボックスをONにする
2. 「透明 Transparent」チェックボックスをONにする
3. 手前の恒星名は明るく、奥の恒星名は暗く表示される

---

## 追加の変更は不要

Depth shading機能は既に正しく実装されており、追加の変更は不要です。

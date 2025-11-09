/**
 * starNames.js
 * 恒星名表示機能
 * 
 * 30個の明るい恒星の英語名称を表示します。
 * トグルONの時、常時表示（操作中も追随）します。
 */

// 恒星データ（30個の明るい恒星）
const LABELED_STARS = [
  { name: "Sirius", ra: 6.75, dec: -16.72 },
  { name: "Canopus", ra: 6.40, dec: -52.70 },
  { name: "Vega", ra: 18.62, dec: 38.78 },
  { name: "Altair", ra: 19.85, dec: 8.87 },
  { name: "Deneb", ra: 20.69, dec: 45.28 },
  { name: "Capella", ra: 5.28, dec: 45.99 },
  { name: "Rigel", ra: 5.24, dec: -8.20 },
  { name: "Betelgeuse", ra: 5.92, dec: 7.41 },
  { name: "Procyon", ra: 7.66, dec: 5.22 },
  { name: "Aldebaran", ra: 4.60, dec: 16.51 },
  { name: "Spica", ra: 13.42, dec: -11.16 },
  { name: "Antares", ra: 16.49, dec: -26.43 },
  { name: "Pollux", ra: 7.76, dec: 28.03 },
  { name: "Fomalhaut", ra: 22.96, dec: -29.62 },
  { name: "Regulus", ra: 10.14, dec: 11.97 },
  { name: "Alpheratz", ra: 0.14, dec: 29.09 },
  { name: "Hamal", ra: 2.12, dec: 23.46 },
  { name: "Polaris", ra: 2.53, dec: 89.26 },
  { name: "Achernar", ra: 1.63, dec: -57.24 },
  { name: "Schedar", ra: 0.68, dec: 56.54 },
  { name: "Mirach", ra: 1.16, dec: 35.62 },
  { name: "Alphard", ra: 9.46, dec: -8.66 },
  { name: "Shaula", ra: 17.56, dec: -37.10 },
  { name: "Albireo", ra: 19.51, dec: 27.96 },
  { name: "Alphecca", ra: 15.58, dec: 26.71 },
  { name: "Algeba", ra: 10.33, dec: 19.84 },
  { name: "Mizar", ra: 13.40, dec: 54.93 },
  { name: "Alcor", ra: 13.42, dec: 54.99 },
  { name: "Castor", ra: 7.58, dec: 31.89 },
  { name: "Alnilam", ra: 5.60, dec: -1.20 }
];

/**
 * 恒星名表示機能を初期化
 */
function initStarNames() {
  // グローバル変数に恒星データを格納
  window.labeledStars = LABELED_STARS;
  console.log('Star names initialized:', LABELED_STARS.length, 'stars');
}

/**
 * 恒星名を描画（常時表示）
 * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
 * @param {number} angle - 現在のLST角度（ラジアン）
 * @param {number} latitude - 緯度（度）
 * @param {boolean} starNamesVisible - 恒星名表示フラグ
 * @param {boolean} applyDepthShading - 奥行き暗化フラグ
 * @param {Function} toHorizontal - 座標変換関数（赤道→地平）
 * @param {Function} applyAllRotations - 回転適用関数
 * @param {Function} project - 投影関数
 */
function drawStarNames(ctx, angle, latitude, starNamesVisible, applyDepthShading, toHorizontal, applyAllRotations, project) {
  // チェック: 恒星名表示が無効
  if (!starNamesVisible) return;
  
  // 恒星データが初期化されていない場合は早期リターン
  if (!window.labeledStars) {
    console.warn('Star names not initialized');
    return;
  }
  
  // 每フレーム、3D座標を再計算
  const coords = window.labeledStars.map(star => {
    // 赤経：時間 → ラジアン (24h = 2π rad)
    const raRad = (star.ra / 24) * 2 * Math.PI;
    // 赤緯：度 → ラジアン
    const decRad = (star.dec * Math.PI) / 180;
    
    let { x, y, z } = toHorizontal(raRad, decRad, angle);
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
        // z > 0 なら手前（明るい）、z < 0 なら奥（暗い）
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

/**
 * starNames.js
 * 恒星名表示機能
 * 
 * 30個の明るい恒星の英語名称を表示します。
 * トグルONの時、常時表示（操作中も追随）します。
 */

// 恒星データ（31個のHERMES+北極星、カノープス）
const LABELED_STARS = [
  { name: "Acamar", ra: 2.97, dec: -40.30 },
  { name: "Aldebaran", ra: 4.60, dec: 16.51 },
  { name: "Algol", ra: 3.14, dec: 40.96 },
  { name: "Alnilam", ra: 5.60, dec: -1.20 },
  { name: "Alphard", ra: 9.46, dec: -8.66 },
  { name: "Alphecca", ra: 15.58, dec: 26.71 },
  { name: "Alpheratz", ra: 0.14, dec: 29.09 },
  { name: "Altair", ra: 19.85, dec: 8.87 },
  { name: "Antares", ra: 16.49, dec: -26.43 },
  { name: "Arcturus", ra: 14.26, dec: 19.18 },
  { name: "Bellatrix", ra: 5.42, dec: 6.35 },
  { name: "Betelgeuse", ra: 5.92, dec: 7.41 },
  { name: "Canopus", ra: 6.40, dec: -52.70 },
  { name: "Capella", ra: 5.28, dec: 45.99 },
  { name: "Castor", ra: 7.58, dec: 31.89 },
  { name: "Deneb", ra: 20.69, dec: 45.28 },
  { name: "Denebola", ra: 11.82, dec: 14.57 },
  { name: "Fomalhaut", ra: 22.96, dec: -29.62 },
  { name: "Menkalinan", ra: 5.99, dec: 44.95 },
  { name: "Polaris", ra: 2.53, dec: 89.26 },
  { name: "Pollux", ra: 7.76, dec: 28.03 },
  { name: "Procyon", ra: 7.66, dec: 5.22 },
  { name: "Regulus", ra: 10.14, dec: 11.97 },
  { name: "Rigel", ra: 5.24, dec: -8.20 },
  { name: "Rukbat", ra: 19.40, dec: -40.62 },
  { name: "Scheat", ra: 23.06, dec: 28.08 },
  { name: "Shaula", ra: 17.56, dec: -37.10 },
  { name: "Sirius", ra: 6.75, dec: -16.72 },
  { name: "Spica", ra: 13.42, dec: -11.16 },
  { name: "Vega", ra: 18.62, dec: 38.78 },
  { name: "Zavijava", ra: 11.85, dec: 1.77 },
  { name: "Zosma", ra: 11.24, dec: 20.52 },
  { name: "Zubeneschamali", ra: 15.28, dec: -9.38 }
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

  // --- 1. 歳差行列の準備 ---
  let precessionMat = null;
  if (window.Sphere10 && window.Sphere10.getDate && window.Precession) {
    precessionMat = window.Precession.getMatrix(window.Sphere10.getDate());
  }

  // 每フレーム、3D座標を再計算
  const coords = window.labeledStars.map(star => {
    // 元の赤経・赤緯 (J2000)
    let raRad = (star.ra / 24) * 2 * Math.PI;
    let decRad = (star.dec * Math.PI) / 180;

    // --- 2. 歳差補正 (Precession) ---
    if (precessionMat) {
      // 球面座標 -> デカルト座標 (J2000)
      const cosDec = Math.cos(decRad);
      const x0 = cosDec * Math.cos(raRad);
      const y0 = cosDec * Math.sin(raRad);
      const z0 = Math.sin(decRad);

      // 行列適用 (J2000 -> Date)
      const p = window.Precession.apply(x0, y0, z0, precessionMat);

      // デカルト座標 -> 球面座標 (Date)
      raRad = Math.atan2(p.y, p.x);
      decRad = Math.asin(p.z);
    }

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

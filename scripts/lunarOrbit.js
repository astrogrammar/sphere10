/**
 * lunarOrbit.js
 * 白道（Lunar Orbit）の幾何演算を提供
 * 
 * 白道は黄道面に対して約5.145°傾斜した月の軌道面。
 * 昇交点（☊）は18.6年周期で黄道上を移動する。
 */

(function() {
  'use strict';

  /**
   * 昇交点黄経Ωを計算（18.6年周期モデル）
   * @param {number} JD - ユリウス日（Julian Date）
   * @returns {number} 昇交点黄経Ω（ラジアン）
   */
  function calcAscendingNodeAngle(JD) {
    // J2000.0からの経過日数
    const D = JD - 2451545.0;
    
    // 昇交点黄経の近似式（18.6年周期）
    // Ω = 125.045° - 0.0529921° × D
    const omegaDeg = 125.045 - 0.0529921 * D;
    
    // ラジアンに変換
    return omegaDeg * Math.PI / 180;
  }

  /**
   * 白道上の点を生成（赤道座標系）
   * @param {number} stepDeg - ステップ角度（度）
   * @param {number} JD - ユリウス日（Julian Date）
   * @returns {Array} 白道上の点の配列 [{ra, dec, lon, lat}, ...]
   */
  function generateLunarOrbitPoints(stepDeg = 5, JD = 2451545.0) {
    // 白道傾斜角（5.145°）
    const inc = 5.145 * Math.PI / 180;
    
    // 昇交点黄経Ω
    const Omega = calcAscendingNodeAngle(JD);
    
    // J2000.0黄道傾斜角（23.4393°）
    const epsilon = 23.4393 * Math.PI / 180;
    
    const points = [];
    
    // 黄経0°から360°まで
    for (let lonDeg = 0; lonDeg <= 360; lonDeg += stepDeg) {
      const lambda = lonDeg * Math.PI / 180;  // 黄経（ラジアン）
      
      // 白道上の黄緯を計算
      // β = arcsin(sin(inc) × sin(λ - Ω))
      const beta = Math.asin(Math.sin(inc) * Math.sin(lambda - Omega));
      
      // 黄道座標（λ, β）→ 赤道座標（α, δ）変換
      // 
      // α = atan2(sin(λ) × cos(ε) - tan(β) × sin(ε), cos(λ))
      // δ = arcsin(sin(β) × cos(ε) + cos(β) × sin(ε) × sin(λ))
      
      const ra = Math.atan2(
        Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon),
        Math.cos(lambda)
      );
      
      const dec = Math.asin(
        Math.sin(beta) * Math.cos(epsilon) + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda)
      );
      
      points.push({
        ra: ra,      // 赤経（ラジアン）
        dec: dec,    // 赤緯（ラジアン）
        lon: lambda, // 黄経（ラジアン）
        lat: beta    // 黄緯（ラジアン）
      });
    }
    
    return points;
  }

  // グローバル名前空間にエクスポート
  window.LunarOrbit = {
    calcAscendingNodeAngle: calcAscendingNodeAngle,
    generateLunarOrbitPoints: generateLunarOrbitPoints
  };

})();

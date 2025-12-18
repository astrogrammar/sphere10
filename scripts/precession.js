/**
 * precession.js
 * IAU 1976 Precession Model Implementation
 * J2000.0座標系から指定日時の座標系への変換行列を計算
 */
(function() {
  'use strict';

  let cachedMatrix = null;
  let cachedTime = 0;

  /**
   * J2000.0 (JD 2451545.0) からのユリウス世紀数 T を計算
   */
  function getJulianCenturies(date) {
    const JD = (date.getTime() / 86400000.0) + 2440587.5;
    return (JD - 2451545.0) / 36525.0;
  }

  /**
   * 歳差行列を取得
   * @param {Date} date - 対象日時
   * @returns {Array<Array<number>>} 3x3 回転行列
   */
  function getMatrix(date) {
    const time = date.getTime();
    if (cachedMatrix && cachedTime === time) {
      return cachedMatrix;
    }

    const T = getJulianCenturies(date);
    const arcsec2rad = (Math.PI / 180.0) / 3600.0;

    // IAU 1976 Precession Parameters
    const zeta  = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * arcsec2rad;
    const z     = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * arcsec2rad;
    const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * arcsec2rad;

    const cz = Math.cos(zeta);
    const sz = Math.sin(zeta);
    const cZ = Math.cos(z);
    const sZ = Math.sin(z);
    const ct = Math.cos(theta);
    const st = Math.sin(theta);

    // R = Rz(-z) * Ry(theta) * Rz(-zeta)
    const mat = [
      [ cZ * ct * cz - sZ * sz, -cZ * ct * sz - sZ * cz, -cZ * st ],
      [ sZ * ct * cz + cZ * sz, -sZ * ct * sz + cZ * cz, -sZ * st ],
      [ st * cz,                -st * sz,                ct       ]
    ];

    cachedMatrix = mat;
    cachedTime = time;
    return mat;
  }

  /**
   * 座標ベクトルに行列を適用
   * @param {number} x, y, z - J2000座標
   * @param {Array<Array<number>>} mat - 歳差行列
   * @returns {{x, y, z}} 変換後の座標
   */
  function apply(x, y, z, mat) {
    return {
      x: mat[0][0] * x + mat[0][1] * y + mat[0][2] * z,
      y: mat[1][0] * x + mat[1][1] * y + mat[1][2] * z,
      z: mat[2][0] * x + mat[2][1] * y + mat[2][2] * z
    };
  }

  // グローバル公開
  window.Precession = {
    getMatrix: getMatrix,
    apply: apply
  };

})();

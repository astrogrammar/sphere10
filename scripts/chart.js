// scripts/chart.js
// ────────────────────────────────────────────────────────────────
// 既存コード(sphere10.js)に一切触れず、右下キャンバスに
// 「ホール・サイン・ハウス＋10天体記号」を白(#ffffff)で描画する。
// 角(ASC/MC/IC/DSC)や度数は表示しない。
// トグルボタン #toggleChartBtn で #chartCanvas の表示/非表示を切替。
// ────────────────────────────────────────────────────────────────
(() => {
  'use strict';

  // ===== 設定値（色は要件どおり白固定） =====
  const WHITE = '#ffffff';
  const CANVAS_ID = 'chartCanvas';
  const TOGGLE_ID = 'toggleChartBtn';

  // 10天体（表示順は任意、記号は度数非表示）
  const PLANETS = [
    { key: 'Sun',     glyph: '☉' },
    { key: 'Moon',    glyph: '☽' },
    { key: 'Mercury', glyph: '☿' },
    { key: 'Venus',   glyph: '♀' },
    { key: 'Mars',    glyph: '♂' },
    { key: 'Jupiter', glyph: '♃' },
    { key: 'Saturn',  glyph: '♄' },
    { key: 'Uranus',  glyph: '♅' },
    { key: 'Neptune', glyph: '♆' },
    { key: 'Pluto',   glyph: '♇' },
  ];

  // サイン記号（ASCサインを第1室として時計回りに配置）
  const SIGN_GLYPHS = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];

  // ========= 小道具 =========
  const norm360 = deg => ((deg % 360) + 360) % 360;
  const deg2rad = d => d * Math.PI / 180;

  function getDateFromPage() {
    const el = document.getElementById('datetimeInput');
    if (el && el.value) return new Date(el.value);
    return new Date();
  }
  function getLatitude() {
    const el = document.getElementById('latitudeInput');
    if (el && el.value !== '') return parseFloat(el.value);
    return 35.4; // 既定：横浜
  }
  function getLongitude() {
    // index.html に経度入力が無い前提のため暫定
    return 139.65; // 既定：横浜
  }

  // ========= 天体の黄経（地心）を取得 =========
  async function computeEclipticLongitudes(date) {
    const out = {};
    if (typeof Astronomy === 'undefined') {
      // フォールバック：時刻ベースのダミー配置（可視確認用）
      const seed = date.getUTCHours() * 60 + date.getUTCMinutes();
      PLANETS.forEach((p, i) => { out[p.key] = norm360(seed * 0.5 + i * 33); });
      return out;
    }
    for (const p of PLANETS) {
      try {
        const vec = Astronomy.GeoVector(p.key, date);  // 地心直交座標
        const ecl = Astronomy.Ecliptic(vec);           // 黄道座標
        out[p.key] = norm360(ecl.elon);
      } catch (e) {
        // 未対応天体や例外時も崩さない
        out[p.key] = Math.random() * 360;
      }
    }
    return out;
  }

  // ========= ASCの黄経（近似）→ ホールサイン第1室の起点 =========
  async function computeAscendantLongitude(date, latDeg, lonDeg) {
    if (typeof Astronomy === 'undefined') {
      // フォールバック：ソーラー・ホールサイン（太陽サイン＝第1室）
      const longs = await computeEclipticLongitudes(date);
      return longs.Sun ?? 0;
    }
    try {
      // 近似式：ASC黄経 ≈ arctan2(-cos ε * tan φ , -sin ε) + LST*15°
      // （厳密な地平線-黄道交点探索は重いので簡略。必要なら置換可能）
      const epsRad = deg2rad(Astronomy.EclipticObliquity(date).obl_deg);
      const phiRad = deg2rad(latDeg);

      // 真太陽時ではなく地方恒星時を使用
      const lstHours = Astronomy.SiderealTime(date) + lonDeg/15; // 東経を加算
      const lstDeg = norm360(lstHours * 15);

      const ascApprox =
        Math.atan2(-Math.cos(epsRad)*Math.tan(phiRad), -Math.sin(epsRad)) * 180/Math.PI + lstDeg;

      return norm360(ascApprox);
    } catch {
      const longs = await computeEclipticLongitudes(date);
      return longs.Sun ?? 0;
    }
  }

  // ========= 描画 =========
  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }

  function drawChart(ctx, longitudes, ascLon) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.save();

    // 背景（半透明ダーク：白線が白地に溶けないため。要件は線と記号の色のみ白指定）
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000000';
    roundedRect(ctx, 0, 0, W, H, 16);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 基本スタイル（白）
    ctx.strokeStyle = WHITE;
    ctx.fillStyle   = WHITE;
    ctx.lineWidth   = 1.2;

    const cx = W/2, cy = H/2;
    const R_outer  = Math.min(W, H)/2 - 16;
    const R_inner  = R_outer * 0.82;
    const R_planet = (R_outer + R_inner)/2;

    // 外輪・内輪
    ctx.beginPath(); ctx.arc(cx, cy, R_outer, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R_inner, 0, Math.PI*2); ctx.stroke();

    // ホールサイン：ASCが属するサインを第1室へ（度数は描かない）
    const ascSignIndex = Math.floor(norm360(ascLon)/30); // 0:牡羊
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // サイン記号は少しだけ小さめ
    ctx.font = '16px system-ui, "Segoe UI Symbol", "Apple Color Emoji", sans-serif';

    for (let i = 0; i < 12; i++) {
      const signIndex = (ascSignIndex + i) % 12;
      // その室の開始黄経（30°刻み）
      const startDeg = norm360(Math.floor(ascLon/30)*30 + i*30);
      const midDeg   = norm360(startDeg + 15);

      // 区切り線
      const a0 = deg2rad(startDeg - 90);
      const x1 = cx + R_inner * Math.cos(a0);
      const y1 = cy + R_inner * Math.sin(a0);
      const x2 = cx + R_outer * Math.cos(a0);
      const y2 = cy + R_outer * Math.sin(a0);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();

      // サイン記号
      const am = deg2rad(midDeg - 90);
      const sx = cx + (R_outer - 18) * Math.cos(am);
      const sy = cy + (R_outer - 18) * Math.sin(am);
      ctx.fillText(SIGN_GLYPHS[signIndex], sx, sy);
    }

    // 10天体（記号のみ、白）
    ctx.font = '20px system-ui, "Segoe UI Symbol", "Apple Color Emoji", sans-serif';
    for (const p of PLANETS) {
      const lon = longitudes[p.key];
      if (typeof lon !== 'number') continue;
      const a = deg2rad(lon - 90);
      const x = cx + R_planet * Math.cos(a);
      const y = cy + R_planet * Math.sin(a);
      ctx.fillText(p.glyph, x, y);
    }

    ctx.restore();
  }

  // ========= メインレンダリング =========
  async function renderOnce() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const date = getDateFromPage();
    const lat  = getLatitude();
    const lon  = getLongitude();

    // 並列計算（軽量）
    const [longs, asc] = await Promise.all([
      computeEclipticLongitudes(date),
      computeAscendantLongitude(date, lat, lon)
    ]);

    drawChart(ctx, longs, asc);
  }

  // ========= 初期化（トグル/イベント） =========
  function setupToggle() {
    const btn = document.getElementById(TOGGLE_ID);
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;

    // 初期表示：表示状態なら描画
    if (canvas.style.display !== 'none') {
      renderOnce();
    }

    // ボタンが存在すればトグル
    if (btn) {
      let visible = canvas.style.display !== 'none';
      const show = async () => { canvas.style.display = 'block'; await renderOnce(); };
      const hide = () => { canvas.style.display = 'none'; };

      const toggle = async () => {
        visible = !visible;
        if (visible) await show(); else hide();
      };
      btn.addEventListener('click', toggle, { passive: true });
      btn.addEventListener('touchstart', (e)=>{ e.preventDefault(); toggle(); }, { passive:false });
    }

    // 日時変更で再描画（表示時のみ）
    const dt = document.getElementById('datetimeInput');
    if (dt) {
      const re = async () => {
        if (!canvas || canvas.style.display === 'none') return;
        await renderOnce();
      };
      dt.addEventListener('change', re);
      dt.addEventListener('input', re);
    }

    // リサイズで再描画（念のため）
    window.addEventListener('resize', () => {
      if (!canvas || canvas.style.display === 'none') return;
      renderOnce();
    });
  }

  // DOM 準備後に初期化
  window.addEventListener('DOMContentLoaded', setupToggle);
})();
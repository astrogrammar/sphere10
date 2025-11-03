// ────────────────────────────────────────────────────────────────
// Step 4: Horoscope Layout Refactor
// サインを外周、惑星を内周に分離。♈︎を9時位置固定。
// 背景は円形・半透明。トグルボタン #toggleChartBtn で表示/非表示。
// ────────────────────────────────────────────────────────────────
(() => {
  'use strict';

  // ===== 定数（Step 4 要件） =====
  const CANVAS_ID = 'chartCanvas';
  const TOGGLE_ID = 'toggleChartBtn';

  // 色設定（CSS変数と連動）
  const SIGN_COLOR = '#888888';
  const PLANET_COLOR = '#FFFFFF';
  const BACKGROUND_RGBA = 'rgba(0,0,0,0.6)';

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

  // サイン記号（♈︎=0, ♉︎=1, ..., ♓︎=11）
  const SIGN_GLYPHS = ['♈︎','♉︎','♊︎','♋︎','♌︎','♍︎','♎︎','♏︎','♐︎','♑︎','♒︎','♓︎'];

  // ========= ユーティリティ =========
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

  // ========= 惑星黄経キャッシュ =========
  let cachedLongitudes = null;
  let cachedDate = null;

  // ========= 天体の黄経（地心）を取得 =========
  async function computeEclipticLongitudes(date) {
    const out = {};
    
    // Astronomy Engineが利用可能か確認
    if (typeof Astronomy === 'undefined') {
      console.error('[chart.js] Astronomy Engine is not loaded');
      return out;
    }

    console.log('[chart.js] Computing ecliptic longitudes for:', date.toISOString());

    for (const p of PLANETS) {
      try {
        const vec = Astronomy.GeoVector(p.key, date);  // 地心直交座標
        const ecl = Astronomy.Ecliptic(vec);           // 黄道座標
        out[p.key] = norm360(ecl.elon);
        console.log(`[chart.js] ${p.key}: ${out[p.key].toFixed(2)}°`);
      } catch (e) {
        console.error(`[chart.js] Error computing ${p.key}:`, e);
        out[p.key] = 0;  // エラー時は0度に設定
      }
    }
    return out;
  }



  // ========= 描画メイン（Step 4 レイアウト） =========
  function drawChart(ctx, longitudes) {
    const canvas = ctx.canvas;

    // CSS表示サイズを取得
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // デバイスピクセル比を取得（Retina対応）
    const dpr = window.devicePixelRatio || 1;

    // Canvas論理サイズを物理ピクセルに合わせる
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;

    // 描画座標系をCSS座標系に戻す
    ctx.scale(dpr, dpr);

    // 以降の描画コードはCSS座標系で記述
    const W = cssWidth;
    const H = cssHeight;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) / 2 - 10;

    // Step 4 要件：半径設定
    const SIGN_RING_R   = 0.95 * R;  // 外周（サインリング）
    const PLANET_RING_R = 0.85 * R;  // 内周（惑星リング）

    ctx.save();

    // 背景円（半透明）
    ctx.fillStyle = BACKGROUND_RGBA;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 外円（サインリング）
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = SIGN_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, SIGN_RING_R, 0, Math.PI * 2);
    ctx.stroke();

    // 惑星リング
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = PLANET_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, PLANET_RING_R, 0, Math.PI * 2);
    ctx.stroke();

    // サイン記号（外周リング、グレー）
    ctx.fillStyle = SIGN_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '18px system-ui, "Segoe UI Symbol", "Apple Color Emoji", sans-serif';

    for (let i = 0; i < 12; i++) {
      // ♈︎を9時位置（180°）に固定し、時計回りに配置
      // i=0 → 180°（9時）, i=1 → 150°, i=2 → 120°, ...
      const angleDeg = 180 - i * 30;
      const angleRad = deg2rad(angleDeg);

      // 区切り線（外円から中心まで）
      const x1 = cx + SIGN_RING_R * Math.cos(angleRad);
      const y1 = cy + SIGN_RING_R * Math.sin(angleRad);
      const x2 = cx;
      const y2 = cy;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // サイン記号（各ハウスの中央）
      const midAngleDeg = angleDeg - 15;
      const midAngleRad = deg2rad(midAngleDeg);
      const sx = cx + SIGN_RING_R * 0.88 * Math.cos(midAngleRad);
      const sy = cy + SIGN_RING_R * 0.88 * Math.sin(midAngleRad);
      ctx.fillText(SIGN_GLYPHS[i], sx, sy);
    }

    // 惑星記号（内周リング上、白）
    ctx.fillStyle = PLANET_COLOR;
    ctx.font = '20px system-ui, "Segoe UI Symbol", "Apple Color Emoji", sans-serif';

    for (const p of PLANETS) {
      const lon = longitudes[p.key];
      if (typeof lon !== 'number') continue;

      // 惑星の黄経を9時位置基準に変換（♈︎0°=9時=180°）
      // 黄経0°（♈︎0°）→ 180°、黄経90°（♋︎0°）→ 90°（時計回り）
      const angleDeg = 180 - lon;
      const angleRad = deg2rad(angleDeg);

      const x = cx + PLANET_RING_R * Math.cos(angleRad);
      const y = cy + PLANET_RING_R * Math.sin(angleRad);
      ctx.fillText(p.glyph, x, y);
    }

    ctx.restore();
  }

  // ========= メインレンダリング =========
  async function renderOnce(forceRecompute = false) {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const date = getDateFromPage();

    // 日時が変わった場合のみ再計算
    if (forceRecompute || !cachedLongitudes || cachedDate?.getTime() !== date.getTime()) {
      console.log('[chart.js] Recomputing planet longitudes...');
      cachedLongitudes = await computeEclipticLongitudes(date);
      cachedDate = date;
    } else {
      console.log('[chart.js] Using cached planet longitudes');
    }

    drawChart(ctx, cachedLongitudes);
  }

  // ========= 初期化（トグル/イベント） =========
  function setupToggle() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;

    let visible = canvas.style.display !== 'none';
    if (canvas.style.display === '') {
      visible = false;
    }

    let existingButton = document.getElementById(TOGGLE_ID);
    if (existingButton) {
      existingButton.remove();
    }

    const btn = document.createElement('button');
    btn.id = TOGGLE_ID;
    btn.type = 'button';
    btn.className = 'chart-toggle';
    btn.textContent = '♈︎';
    btn.setAttribute('title', 'Horoscope (Ctrl+⌘+H)');
    btn.setAttribute('aria-label', 'Toggle horoscope overlay');
    document.body.appendChild(btn);

    const updateStates = () => {
      btn.setAttribute('aria-pressed', visible ? 'true' : 'false');
      canvas.setAttribute('aria-hidden', visible ? 'false' : 'true');
      canvas.style.display = visible ? 'block' : 'none';
    };

    const show = async () => {
      visible = true;
      updateStates();
      await renderOnce(true);  // 表示時は強制再計算
    };

    const hide = () => {
      visible = false;
      updateStates();
    };

    updateStates();
    if (visible) {
      void renderOnce(true);
    }

    let toggling = false;
    const toggleVisibility = async (event) => {
      if (event && event.type === 'touchstart') {
        event.preventDefault();
      }
      if (toggling) return;
      toggling = true;
      try {
        if (visible) {
          hide();
        } else {
          await show();
        }
      } finally {
        toggling = false;
      }
    };

    const onClick = () => { void toggleVisibility(); };
    const onTouch = (event) => { void toggleVisibility(event); };

    btn.addEventListener('click', onClick, { passive: true });
    btn.addEventListener('touchstart', onTouch, { passive: false });

    window.addEventListener('keydown', (event) => {
      const key = (event.key || event.code || '').toLowerCase();
      if ((key === 'h' || key === 'keyh') && event.ctrlKey && event.metaKey) {
        event.preventDefault();
        void toggleVisibility();
      }
    });

    // 日時変更で再描画（表示時のみ、強制再計算）
    const dt = document.getElementById('datetimeInput');
    if (dt) {
      const re = async () => {
        if (!canvas || canvas.style.display === 'none') return;
        await renderOnce(true);  // 日時変更時は強制再計算
      };
      dt.addEventListener('change', re);
      dt.addEventListener('input', re);
    }

    // リサイズで再描画（キャッシュ使用）
    window.addEventListener('resize', () => {
      if (!canvas || canvas.style.display === 'none') return;
      renderOnce(false);  // リサイズ時はキャッシュ使用
    });
  }


  // DOM 準備後に初期化
  window.addEventListener('DOMContentLoaded', setupToggle);
})();

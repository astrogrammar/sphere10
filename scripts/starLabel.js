/* scripts/starLabel.js — fixed
 * - 恒星時を反映（H = LST - RA）
 * - 既存UIに追随、既存コードは一切変更不要
 * - 変数衝突修正: 高さ H → Hpx / 時角 → Hrad
 */
(() => {
  const CSV_URL = './data/bsc5.csv';

  const SPECIFIED_STARS = [
    {name:"Algol", ra:"03h 08m 10s", dec:"+40° 57′ 20″", mag:2.1},
    {name:"Alcyone", ra:"03h 47m 29s", dec:"+24° 06′ 18″", mag:2.87},
    {name:"Aldebaran", ra:"04h 35m 55s", dec:"+16° 30′ 33″", mag:0.87},
    {name:"Rigel", ra:"05h 14m 32s", dec:"-08° 12′ 06″", mag:0.12},
    {name:"Capella", ra:"05h 16m 41s", dec:"+46° 00′ 09″", mag:0.08},
    {name:"Polaris", ra:"02h 31m 49s", dec:"+89° 15′ 51″", mag:1.97},
    {name:"Betelgeuse", ra:"05h 55m 10s", dec:"+07° 24′ 25″", mag:0.42},
    {name:"Sirius", ra:"06h 45m 09s", dec:"-16° 42′ 58″", mag:-1.46},
    {name:"Canopus", ra:"06h 23m 57s", dec:"-52° 41′ 44″", mag:-0.72},
    {name:"Castor", ra:"07h 34m 36s", dec:"+31° 53′ 18″", mag:1.58},
    {name:"Pollux", ra:"07h 45m 19s", dec:"+28° 01′ 35″", mag:1.14},
    {name:"Procyon", ra:"07h 39m 18s", dec:"+05° 13′ 30″", mag:0.34},
    {name:"Regulus", ra:"10h 08m 22s", dec:"+11° 58′ 02″", mag:1.35},
    {name:"Alkaid", ra:"13h 47m 32s", dec:"+49° 18′ 15″", mag:1.85},
    {name:"Algorab", ra:"12h 29m 51s", dec:"-19° 27′ 57″", mag:3.0},
    {name:"Spica", ra:"13h 25m 11s", dec:"-11° 09′ 41″", mag:0.98},
    {name:"Arcturus", ra:"14h 15m 39s", dec:"+19° 10′ 57″", mag:-0.04},
    {name:"Mimosa", ra:"12h 47m 44s", dec:"-59° 41′ 19″", mag:1.25},
    {name:"Acrux", ra:"12h 26m 35s", dec:"-63° 05′ 57″", mag:0.76},
    {name:"Alphecca", ra:"15h 34m 41s", dec:"+26° 42′ 16″", mag:2.23},
    {name:"Hadar", ra:"14h 03m 49s", dec:"-60° 22′ 23″", mag:0.61},
    {name:"Alpha Centauri", ra:"14h 39m 36s", dec:"-60° 50′ 02″", mag:-0.27},
    {name:"Antares", ra:"16h 29m 24s", dec:"-26° 25′ 55″", mag:1.06},
    {name:"Vega", ra:"18h 36m 56s", dec:"+38° 47′ 01″", mag:0.03},
    {name:"Albireo", ra:"19h 30m 43s", dec:"+27° 57′ 35″", mag:3.1},
    {name:"Altair", ra:"19h 50m 47s", dec:"+08° 52′ 06″", mag:0.77},
    {name:"Deneb", ra:"20h 41m 26s", dec:"+45° 16′ 49″", mag:1.25},
    {name:"Deneb Algedi", ra:"21h 47m 02s", dec:"-16° 07′ 38″", mag:2.85},
    {name:"Fomalhaut", ra:"22h 57m 39s", dec:"-29° 37′ 20″", mag:1.16},
    {name:"Achernar", ra:"01h 37m 43s", dec:"-57° 14′ 12″", mag:0.45}
  ];

  const sky = document.getElementById('sky');
  const starToggle = document.getElementById('starToggle');
  const reverseEWToggle = document.getElementById('reverseEWToggle');
  const rotZ = document.getElementById('rotationZSlider');
  const rotY = document.getElementById('rotationYSlider');
  const rotX = document.getElementById('rotationEWSlider');
  const datetimeInput = document.getElementById('datetimeInput');
  if (!sky) return;

  let overlay = document.getElementById('starLabels');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.id = 'starLabels';
    overlay.style.position = 'absolute';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);
  }

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const normName = s => s.toLowerCase().replace(/\s+/g,'').replace(/[^a-z0-9]/g,'');

  function parseHMS(hms) {
    const m = String(hms).replace(/[^\d\-\+hms.: ]+/g,'').match(/(-?\d+)\s*h\s*(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s/i);
    if (!m) return 0;
    const h = parseFloat(m[1]), mi = parseFloat(m[2]), s = parseFloat(m[3]);
    return ((h + mi/60 + s/3600) * 15) * Math.PI/180;
  }
  function parseDMS(dms) {
    const t = String(dms).replace(/′/g,'\'').replace(/″/g,'"');
    const m = t.match(/([+\-]?\d+)\D+(\d+)\D+(\d+(?:\.\d+)?)/);
    if (!m) return 0;
    const sign = parseFloat(m[1])<0?-1:1;
    const dd = Math.abs(parseFloat(m[1]));
    const mm = parseFloat(m[2]);
    const ss = parseFloat(m[3]);
    return sign * (dd + mm/60 + ss/3600) * Math.PI/180;
  }

  function getLongitudeDeg(){
    const w = window;
    if (w.SPHERE10?.observer?.lon != null) return +w.SPHERE10.observer.lon;
    if (w.appState?.lon != null) return +w.appState.lon;
    const ds = document.body?.dataset?.lon;
    if (ds) return +ds;
    const ls = typeof store !== 'undefined' ? store.get('sphere10_lon') : null;
    if (ls) return +ls;
    return 139.65; // Yokohama fallback
  }
  function getCurrentDate(){
    if (datetimeInput && datetimeInput.value) return new Date(datetimeInput.value);
    const w = window;
    if (w.SPHERE10?.now instanceof Date) return new Date(+w.SPHERE10.now);
    if (w.SPHERE10?.currentDate instanceof Date) return new Date(+w.SPHERE10.currentDate);
    if (typeof w.appState?.time === 'number') return new Date(w.appState.time);
    return new Date();
  }
  function localSiderealAngleRad(date, lonDeg){
    const gstHours = Astronomy.SiderealTime(date);
    const lstHours = (gstHours + lonDeg/15 + 24) % 24;
    return (lstHours * 15) * Math.PI/180;
  }
  function fontForMag(mag) {
    const weight = (mag<=0.2)?700 : (mag<=1.0)?600 : (mag<=2.0)?500 : 400;
    const px = clamp(14 - (mag-0.5)*1.4, 10, 16);
    return `normal ${weight} ${px}px ui-sans-serif`;
  }

  function rotX3(v, a){ const c=Math.cos(a), s=Math.sin(a); return [v[0], c*v[1]-s*v[2], s*v[1]+c*v[2]]; }
  function rotY3(v, a){ const c=Math.cos(a), s=Math.sin(a); return [ c*v[0]+s*v[2], v[1], -s*v[0]+c*v[2] ]; }
  function rotZ3(v, a){ const c=Math.cos(a), s=Math.sin(a); return [ c*v[0]-s*v[1], s*v[0]+c*v[1], v[2] ]; }

  let stars = [];

  async function loadBSC() {
    const want = new Map(SPECIFIED_STARS.map(s => [normName(s.name), s]));
    const foundKeys = new Set();

    try {
      const res = await fetch(CSV_URL);
      const csv = await res.text();
      const lines = csv.split(/\r?\n/);

      for (const lnRaw of lines) {
        const ln = lnRaw.trim();
        if (!ln) continue;
        const low = ln.toLowerCase();

        for (const key of want.keys()) {
          if (!low.includes(key)) continue;

          const raMatch  = ln.match(/(\d{1,2})[h:\s](\d{1,2})[m:\s](\d{1,2}(?:\.\d+)?)/i);
          const decMatch = ln.match(/([+\-]\d{1,2})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)/);
          const magMatch = ln.match(/[,;\s](-?\d+(?:\.\d+)?)(?=[,\s]*$)/);

          let raRad, decRad, mag;
          if (raMatch && decMatch) {
            const hh = +raMatch[1], mm = +raMatch[2], ss = +raMatch[3];
            const dd = +decMatch[1], dm = +decMatch[2], ds = +decMatch[3];
            raRad  = ((hh + mm/60 + ss/3600) * 15) * Math.PI/180;
            const sign = dd<0?-1:1;
            const absd = Math.abs(dd) + dm/60 + ds/3600;
            decRad = (sign*absd) * Math.PI/180;
          }
          mag = magMatch ? parseFloat(magMatch[1]) : undefined;

          const base = want.get(key);
          stars.push({
            name: base.name,
            raRad: raRad ?? parseHMS(base.ra),
            decRad: decRad ?? parseDMS(base.dec),
            mag: (mag ?? base.mag ?? 2.5)
          });
          foundKeys.add(key);
          break;
        }
      }
    } catch(_e) { /* フォールバックに任せる */ }

    for (const [key, base] of want) {
      if (!foundKeys.has(key)) {
        stars.push({
          name: base.name,
          raRad: parseHMS(base.ra),
          decRad: parseDMS(base.dec),
          mag: base.mag ?? 2.5
        });
      }
    }
  }

  function syncOverlayToSky() {
    const rect = sky.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    overlay.style.left = (rect.left + window.scrollX) + 'px';
    overlay.style.top  = (rect.top  + window.scrollY) + 'px';
    overlay.style.width  = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    overlay.width  = Math.max(1, Math.floor(rect.width  * dpr));
    overlay.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = overlay.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', syncOverlayToSky);
  new ResizeObserver(syncOverlayToSky).observe(sky);

  // ★ 高さ引数を Hpx に、時角を Hrad に
  function projectStar(ra, dec, Wpx, Hpx) {
    const date = getCurrentDate();
    const lonDeg = getLongitudeDeg();
    const lst = localSiderealAngleRad(date, lonDeg); // [rad]
    const Hrad = lst - ra;

    const x = Math.cos(dec) * Math.cos(Hrad);
    const y = Math.cos(dec) * Math.sin(Hrad);
    const z = Math.sin(dec);
    let v = [x,y,z];

    const rz = ((+rotZ?.value)||0) * Math.PI/180;
    const ry = ((+rotY?.value)||0) * Math.PI/180;
    const rx = ((+rotX?.value)||0) * Math.PI/180;
    v = rotZ3(v, rz); v = rotY3(v, ry); v = rotX3(v, rx);

    const flip = reverseEWToggle?.checked ? -1 : 1;

    const cx = Wpx/2, cy = Hpx/2;
    const R = Math.min(Wpx,Hpx) * 0.48;
    const sx = cx + flip * (v[0] * R);
    const sy = cy - (v[2] * R);

    const visible = v[1] >= 0;
    return {x:sx, y:sy, visible};
  }

  function drawLabels() {
    const ctx = overlay.getContext('2d');
    ctx.clearRect(0,0,overlay.width, overlay.height);
    if (starToggle && !starToggle.checked) return;

    const Wpx = overlay.clientWidth;
    const Hpx = overlay.clientHeight;

    for (const s of stars) {
      const p = projectStar(s.raRad, s.decRad, Wpx, Hpx);
      if (!p.visible) continue;

      ctx.font = fontForMag(s.mag);
      ctx.fillStyle = 'rgba(255,255,255,0.96)';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth = 3;

      const tx = p.x + 6;
      const ty = p.y - 6;
      ctx.strokeText(s.name, tx, ty);
      ctx.fillText(s.name, tx, ty);
    }
  }

  function rafLoop() {
    syncOverlayToSky();
    drawLabels();
    requestAnimationFrame(rafLoop);
  }

  async function init() {
    await loadBSC();
    syncOverlayToSky();
    rafLoop();
  }

  ['change','input'].forEach(evt=>{
    starToggle?.addEventListener(evt, drawLabels, {passive:true});
    reverseEWToggle?.addEventListener(evt, drawLabels, {passive:true});
    rotZ?.addEventListener(evt, drawLabels, {passive:true});
    rotY?.addEventListener(evt, drawLabels, {passive:true});
    rotX?.addEventListener(evt, drawLabels, {passive:true});
    datetimeInput?.addEventListener(evt, drawLabels, {passive:true});
  });

  init();
})();
const SIGN_SYMBOLS = [
  { symbol: '♈︎', name: 'Aries' },
  { symbol: '♉︎', name: 'Taurus' },
  { symbol: '♊︎', name: 'Gemini' },
  { symbol: '♋︎', name: 'Cancer' },
  { symbol: '♌︎', name: 'Leo' },
  { symbol: '♍︎', name: 'Virgo' },
  { symbol: '♎︎', name: 'Libra' },
  { symbol: '♏︎', name: 'Scorpio' },
  { symbol: '♐︎', name: 'Sagittarius' },
  { symbol: '♑︎', name: 'Capricorn' },
  { symbol: '♒︎', name: 'Aquarius' },
  { symbol: '♓︎', name: 'Pisces' }
];

const PLANETS = [
  { symbol: '☉', name: 'Sun', longitude: 14 },
  { symbol: '☽', name: 'Moon', longitude: 48 },
  { symbol: '☿', name: 'Mercury', longitude: 72 },
  { symbol: '♀', name: 'Venus', longitude: 111 },
  { symbol: '♂', name: 'Mars', longitude: 142 },
  { symbol: '♃', name: 'Jupiter', longitude: 173 },
  { symbol: '♄', name: 'Saturn', longitude: 206 },
  { symbol: '♅', name: 'Uranus', longitude: 252 },
  { symbol: '♆', name: 'Neptune', longitude: 292 },
  { symbol: '♇', name: 'Pluto', longitude: 326 }
];

const WHITE = '#ffffff';
const KEY_TOGGLE = 'h';

const normalizeDegrees = (deg) => ((deg % 360) + 360) % 360;
const degToRad = (deg) => (Math.PI / 180) * (deg + 180);

function arrangePlanets(planets) {
  const grouped = Array.from({ length: 12 }, () => []);

  planets.forEach((planet) => {
    const longitude = normalizeDegrees(planet.longitude);
    const signIndex = Math.floor(longitude / 30);
    grouped[signIndex].push({ ...planet, longitude, signIndex });
  });

  const adjusted = [];
  const offsetStep = 4; // degrees of separation when multiple planets fall in the same sign

  grouped.forEach((group) => {
    if (group.length === 0) return;

    group.sort((a, b) => a.longitude - b.longitude);
    const half = (group.length - 1) / 2;
    const signStart = Math.floor(group[0].longitude / 30) * 30;
    const signEnd = signStart + 30;

    group.forEach((planet, index) => {
      const offset = (index - half) * offsetStep;
      let adjustedLongitude = planet.longitude + offset;
      const margin = 2; // keep inside the sign boundaries
      adjustedLongitude = Math.min(signEnd - margin, Math.max(signStart + margin, adjustedLongitude));
      adjusted.push({ ...planet, adjustedLongitude });
    });
  });

  return adjusted;
}

function drawChart(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(width, height) / 2 - 24;
  const innerRadius = outerRadius * 0.58;
  const planetRadius = (outerRadius + innerRadius) / 2;
  const signTextRadius = outerRadius - 18;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = WHITE;
  ctx.fillStyle = WHITE;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring for planets
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Division lines & sign symbols
  ctx.font = '24px "Segoe UI Symbol", "Noto Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i += 1) {
    const startDeg = i * 30;
    const angle = degToRad(startDeg);
    const xOuter = cx + outerRadius * Math.cos(angle);
    const yOuter = cy + outerRadius * Math.sin(angle);
    const xInner = cx + innerRadius * Math.cos(angle);
    const yInner = cy + innerRadius * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(xInner, yInner);
    ctx.lineTo(xOuter, yOuter);
    ctx.stroke();

    const midDeg = startDeg + 15;
    const midAngle = degToRad(midDeg);
    const sx = cx + signTextRadius * Math.cos(midAngle);
    const sy = cy + signTextRadius * Math.sin(midAngle);
    ctx.fillText(SIGN_SYMBOLS[i].symbol, sx, sy);
  }

  // Planets
  const arrangedPlanets = arrangePlanets(PLANETS);
  ctx.font = '26px "Segoe UI Symbol", "Noto Sans", sans-serif';

  arrangedPlanets.forEach((planet) => {
    const angle = degToRad(planet.adjustedLongitude);
    const px = cx + planetRadius * Math.cos(angle);
    const py = cy + planetRadius * Math.sin(angle);
    ctx.fillText(planet.symbol, px, py);
  });

  ctx.restore();
}

function setupToggle(container) {
  const toggleVisibility = () => {
    const isVisible = container.classList.toggle('visible');
    container.setAttribute('aria-hidden', String(!isVisible));
    if (isVisible) {
      const canvas = container.querySelector('canvas');
      if (canvas) {
        drawChart(canvas);
      }
    }
  };

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() !== KEY_TOGGLE) return;
    event.preventDefault();
    toggleVisibility();
  });
}

function init() {
  const container = document.getElementById('horoscope-chart');
  const canvas = document.getElementById('horoscope-canvas');
  if (!container || !canvas) return;

  container.classList.remove('visible');
  container.setAttribute('aria-hidden', 'true');

  drawChart(canvas);

  setupToggle(container);

  window.addEventListener('resize', () => {
    if (!container.classList.contains('visible')) return;
    drawChart(canvas);
  });
}

document.addEventListener('DOMContentLoaded', init);

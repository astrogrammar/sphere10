/**
 * scripts/aspects.js (v2.2)
 * Sphere10 Extension: Aspect Rays (Active Laser Edition)
 * - 停止中も強制的に再描画を要求し、明滅を視認可能に。
 * - 透明度の揺らぎにより「埃」の質感を強調。
 */
(function () {
    'use strict';

    if (!window.Sphere10 || typeof window.Sphere10.addDrawHook !== 'function') return;

    const CONFIG = {
        fadeOpacity: 0.9,
        flicker: {
            enabled: true,
            speed: 0.003,     // 0.008 呼吸の速さ（少しゆっくりに）
            intensity: 0.1,  // 0.25 揺らぎの幅
            dustChance: 0.12, // 0.12 埃が光る頻度（アップ）
            dustAlpha: 0.12    // 0.4 埃が当たった時の輝度加算
        },
        colors: {
            harmonic: '#00ffff',
            dynamic: '#ff3333',
            conjunction: '#ffff00'
        },
        defs: [
            { name: 'Conjunction', angle: 0, type: 'conjunction' },
            { name: 'Opposition', angle: 180, type: 'dynamic' },
            { name: 'Trine', angle: 120, type: 'harmonic' },
            { name: 'Square', angle: 90, type: 'dynamic' },
            { name: 'Sextile', angle: 60, type: 'harmonic' }
        ],
        moieties: {
            'sun': 15.0, 'moon': 13.0, 'mercury': 7.0, 'venus': 8.0,
            'mars': 7.5, 'jupiter': 12.0, 'saturn': 10.0
        }
    };

    const BODY_MAP = {
        'sun': Astronomy.Body.Sun, 'moon': Astronomy.Body.Moon,
        'mercury': Astronomy.Body.Mercury, 'venus': Astronomy.Body.Venus,
        'mars': Astronomy.Body.Mars, 'jupiter': Astronomy.Body.Jupiter,
        'saturn': Astronomy.Body.Saturn
    };

    const TARGET_PLANETS = Object.keys(BODY_MAP);
    let lastLST = -1;

    function getAngularDistance(l1, l2) {
        let diff = Math.abs(l1 - l2);
        if (diff > 180) diff = 360 - diff;
        return diff;
    }

    window.Sphere10.addDrawHook(function (ctx, state) {
        const toggle = document.getElementById('aspectToggle');
        if (!toggle || !toggle.checked) return;
        if (!window.planetEclipticLongitudes) return;

        // 【重要】停止中も明滅させるため、常に次のフレームを描画予約する
        if (typeof window.requestRender === 'function') {
            window.requestRender();
        }

        // 時間の状態検知
        const isTimeStopped = Math.abs(state.angle - lastLST) < 0.0000001;
        lastLST = state.angle;

        // 明滅計算
        let flickerAlpha = 1.0;
        let blurBoost = 1.0;

        if (isTimeStopped && CONFIG.flicker.enabled) {
            const now = performance.now();
            // ベースの呼吸（0.75 - 1.0 の範囲で揺らす）
            flickerAlpha = (1.0 - CONFIG.flicker.intensity) + (Math.sin(now * CONFIG.flicker.speed) * CONFIG.flicker.intensity);

            // 埃のスパイク（ランダムに透明度とBlurを上げる）
            if (Math.random() < CONFIG.flicker.dustChance) {
                flickerAlpha += CONFIG.flicker.dustAlpha;
                blurBoost = 1.8;
            }
        }

        const time = Astronomy.MakeTime(window.Sphere10.getDate());
        const observer = new Astronomy.Observer(state.latitude, state.longitude || 0, 0);
        const coordsCache = {};

        const getProj = (key) => {
            if (coordsCache[key]) return coordsCache[key];
            const body = BODY_MAP[key];
            const equ = Astronomy.Equator(body, time, observer, true, true);
            const raRad = equ.ra * 15 * Math.PI / 180;
            const decRad = equ.dec * Math.PI / 180;
            const hor = state.toHorizontal(raRad, decRad, state.angle);
            const rot = state.applyAllRotations(hor.x, hor.y, hor.z);
            const proj = state.project(rot.x, rot.y, rot.z);
            coordsCache[key] = proj;
            return proj;
        };

        ctx.save();
        ctx.lineCap = 'round';

        for (let i = 0; i < TARGET_PLANETS.length; i++) {
            for (let j = i + 1; j < TARGET_PLANETS.length; j++) {
                const k1 = TARGET_PLANETS[i];
                const k2 = TARGET_PLANETS[j];
                const l1 = window.planetEclipticLongitudes[k1];
                const l2 = window.planetEclipticLongitudes[k2];

                if (typeof l1 !== 'number' || typeof l2 !== 'number') continue;

                const orbLimit = (CONFIG.moieties[k1] + CONFIG.moieties[k2]) / 2;
                const diff = getAngularDistance(l1, l2);

                for (const asp of CONFIG.defs) {
                    const delta = Math.abs(diff - asp.angle);
                    if (delta <= orbLimit) {
                        const p1 = getProj(k1);
                        const p2 = getProj(k2);

                        if (p1 && p2) {
                            const intensity = Math.max(0, 1.0 - (delta / orbLimit));
                            const depthDim = (p1.isBackSide || p2.isBackSide) ? 0.5 : 1.0;

                            // 明滅係数をアルファに乗算
                            const alpha = (0.3 + (intensity * 0.7)) * depthDim * CONFIG.fadeOpacity * flickerAlpha;

                            ctx.beginPath();
                            ctx.moveTo(p1.sx, p1.sy);
                            ctx.lineTo(p2.sx, p2.sy);

                            ctx.strokeStyle = '#FFFFFF';
                            ctx.shadowColor = CONFIG.colors[asp.type];
                            // Blurも埃のヒットに合わせてブースト
                            ctx.shadowBlur = (15 + (intensity * 20)) * blurBoost;
                            ctx.lineWidth = (1.2 + (intensity * 1.5));
                            ctx.globalAlpha = Math.min(1.0, alpha);

                            ctx.stroke();
                        }
                        break;
                    }
                }
            }
        }
        ctx.restore();
    });

    // キーボードショートカットの登録 (Alt + A)
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.code === 'KeyA') {
        e.preventDefault(); 
        e.stopPropagation();
            
            const toggle = document.getElementById('aspectToggle');
            if (toggle) {
                toggle.checked = !toggle.checked;
                
                // Sphere10の localStorage ロジックと同期
                if (typeof store !== 'undefined' && store.set) {
                    store.set('sphere10_showAspects', toggle.checked);
                }

                // 停止中でも即座に表示を切り替えるために requestRender を呼ぶ
                if (typeof window.requestRender === 'function') {
                    window.requestRender();
                }
                
                console.log(`[Aspects] Hidden Toggle: ${toggle.checked ? 'ON' : 'OFF'}`);
            }
        }
    }, true); // イベントキャプチャを有効にして確実に拾う
})();
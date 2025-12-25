/**
 * scripts/utilities.js
 * Sphere10 周辺機能ユーティリティ
 * - スクリーンショット撮影
 * - 右下ドックのUI制御と連動ロジック
 */
(function () {
    const Utilities = {
        // スクリーンショット撮影機能
        captureScreenshot: function () {
            const originalCanvas = document.getElementById('sky');
            if (!originalCanvas) return;

            // --- 1. 背景色と日時オブジェクトの固定 (同期の要) ---
            const bgColor = "#000000";
            const d = window.Sphere10?.getDate ? window.Sphere10.getDate() : new Date();

            // --- 2. 一時的なCanvasの作成 ---
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            tempCanvas.width = originalCanvas.width;
            tempCanvas.height = originalCanvas.height;

            // --- 3. 背景と天球図の合成 ---
            tempCtx.fillStyle = bgColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(originalCanvas, 0, 0);

            // --- 4. 情報の刻印 (左下・2行) ---
            // 刻印用テキストの生成
            const dateStr = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0') + ' ' +
                String(d.getHours()).padStart(2, '0') + ':' +
                String(d.getMinutes()).padStart(2, '0') + ':' +
                String(d.getSeconds()).padStart(2, '0');

            const lat = typeof latitude !== 'undefined' ? latitude : 35.4437;
            const lon = typeof longitude !== 'undefined' ? longitude : 139.6380;
            const latStr = (lat >= 0 ? 'N' : 'S') + Math.abs(lat).toFixed(3);
            const lonStr = (lon >= 0 ? 'E' : 'W') + Math.abs(lon).toFixed(4);
            const locStr = `${latStr}, ${lonStr}`;

            // 描画スタイルの設定 (10pt相当)
            const fontSize = 10 * dpr;
            tempCtx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
            tempCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
            tempCtx.textAlign = "left";
            tempCtx.textBaseline = "bottom";

            const margin = 15 * dpr;
            const lineHeight = fontSize * 1.4;

            // 左下に2行で描画
            tempCtx.fillText(locStr, margin, tempCanvas.height - margin);
            tempCtx.fillText(dateStr, margin, tempCanvas.height - margin - lineHeight);

            // --- 5. 保存処理 (ファイル名に同じ日時を使用) ---
            const fileTimestamp = d.getFullYear() +
                String(d.getMonth() + 1).padStart(2, '0') +
                String(d.getDate()).padStart(2, '0') + "_" +
                String(d.getHours()).padStart(2, '0') +
                String(d.getMinutes()).padStart(2, '0') +
                String(d.getSeconds()).padStart(2, '0');

            const fileName = `Sphere10_${fileTimestamp}.png`;

            tempCanvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 'image/png');
        },

        // ドックボタンのイベント管理（既存のsphere10.jsからロジックを分離）
        initDockControls: function () {
            // 撮影ボタン
            document.getElementById('btnCapture')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.captureScreenshot();
            });

            // 星ボタン: メインパネルの「恒星(starToggle)」の値を反転させ、イベントを発火させる
            const btnS = document.getElementById('toggleZodiacBtn');
            const starToggle = document.getElementById('starToggle');
            btnS?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (starToggle) {
                    starToggle.checked = !starToggle.checked;
                    starToggle.dispatchEvent(new Event('change'));
                }
            });

            // ☿ボタン: chart.jsが生成した「toggleChartBtn」をプログラムからクリックする
            const btnChart = document.getElementById('togglePlanetsBtn');
            btnChart?.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('toggleChartBtn')?.click();
            });
        },

        init: function () {
            this.initDockControls();
        }
    };

    /**
     * ステルス入力機能の初期化
     * スライダーの横の数値を直接クリックして編集可能にする
     */
    /**
     * ステルス入力機能の初期化（Enhanced Ver.）
     * Escキャンセル、矢印キー操作、バリデーション対応
     */
    function initStealthInputs() {
        const inputs = [
            { valId: 'rotationZVal', sliderId: 'rotationZSlider', unit: '°' },
            { valId: 'rotationYVal', sliderId: 'rotationYSlider', unit: '°' },
            { valId: 'rotationEWVal', sliderId: 'rotationEWSlider', unit: '°' }
        ];

        inputs.forEach(item => {
            const valEl = document.getElementById(item.valId);
            const sliderEl = document.getElementById(item.sliderId);

            if (!valEl || !sliderEl) return;

            // フォーカス時: 元の値を保存し、数値のみ表示にして全選択
            valEl.addEventListener('focus', () => {
                const currentText = valEl.textContent.replace(item.unit, '').trim();
                valEl.dataset.originalValue = currentText; // キャンセル用に保存
                valEl.textContent = currentText;

                const range = document.createRange();
                range.selectNodeContents(valEl);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            });

            // キー操作ハンドリング
            valEl.addEventListener('keydown', (e) => {
                const min = parseFloat(sliderEl.min);
                const max = parseFloat(sliderEl.max);

                // Enter: 確定
                if (e.key === 'Enter') {
                    e.preventDefault();
                    valEl.blur();
                }

                // Escape: キャンセル
                if (e.key === 'Escape') {
                    e.preventDefault();
                    valEl.textContent = valEl.dataset.originalValue; // 元の値に戻す
                    valEl.blur(); // 確定処理へ（blurイベントで再フォーマットされる）
                }

                // Arrow Keys: インクリメント/デクリメント
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    let step = e.shiftKey ? 10 : 1;
                    if (e.key === 'ArrowDown') step *= -1;

                    let currentVal = parseFloat(valEl.textContent);
                    if (isNaN(currentVal)) currentVal = parseFloat(valEl.dataset.originalValue || 0);

                    let newVal = currentVal + step;
                    newVal = Math.max(min, Math.min(max, newVal)); // Clamp

                    // 即時反映
                    valEl.textContent = Math.round(newVal); // 整数で表示更新

                    // 全選択状態を維持（連続操作のため）
                    const range = document.createRange();
                    range.selectNodeContents(valEl);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);

                    // 天球更新
                    sliderEl.value = newVal;
                    sliderEl.dispatchEvent(new Event('input'));
                }
            });

            // 確定時 (Blur): 最終バリデーションとフォーマット復帰
            valEl.addEventListener('blur', () => {
                let num = parseFloat(valEl.textContent);
                const min = parseFloat(sliderEl.min);
                const max = parseFloat(sliderEl.max);

                // 無効値なら元の値（またはキャンセルされた値）を採用
                if (isNaN(num)) {
                    num = parseFloat(valEl.dataset.originalValue || sliderEl.value);
                } else {
                    num = Math.max(min, Math.min(max, num));
                }

                // 最終更新
                sliderEl.value = num;
                sliderEl.dispatchEvent(new Event('input'));

                // 表示を単位付きに戻す
                valEl.textContent = Math.round(num) + item.unit;
            });
        });
    }

    /**
     * Secret Astrometry HUD
     * Shift + H でトグル表示される詳細天体データ
     */
    function initSecretHUD() {
        const hud = document.getElementById('secretHUD');
        const hudBody = document.getElementById('hudBody');
        const hudLat = document.getElementById('hudLat');
        const hudLon = document.getElementById('hudLon');
        let hudInterval = null;

        // Toggle HUD logic
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyH' && e.shiftKey) {
                e.preventDefault();
                hud.classList.toggle('hidden');

                if (!hud.classList.contains('hidden')) {
                    startHUDLoop();
                } else {
                    stopHUDLoop();
                }
            }
        });

        function startHUDLoop() {
            if (hudInterval) return;
            updateHUD(); // 初回即時実行
            hudInterval = setInterval(updateHUD, 500);
        }

        function stopHUDLoop() {
            if (hudInterval) {
                clearInterval(hudInterval);
                hudInterval = null;
            }
        }

        function updateHUD() {
            // 1. 日時の取得 (Sphere10 API経由)
            const date = window.Sphere10 && window.Sphere10.getDate
                ? window.Sphere10.getDate()
                : new Date();

            // 2. 場所の取得 (DOMから直接)
            const latInput = document.getElementById('latitudeInput');
            const lonInput = document.getElementById('longitudeInput');
            const lat = latInput ? parseFloat(latInput.value) : 35.4437;
            const lon = lonInput ? parseFloat(lonInput.value) : 139.6380;

            hudLat.textContent = lat.toFixed(4);
            hudLon.textContent = lon.toFixed(4);

            // 3. Astronomy.js による計算
            const bodies = [
                { name: 'Sun', obj: 'Sun' },
                { name: 'Moon', obj: 'Moon' },
                { name: 'Mercury', obj: 'Mercury' },
                { name: 'Venus', obj: 'Venus' },
                { name: 'Mars', obj: 'Mars' },
                { name: 'Jupiter', obj: 'Jupiter' },
                { name: 'Saturn', obj: 'Saturn' }
            ];

            const observer = new Astronomy.Observer(lat, lon, 0);
            const time = Astronomy.MakeTime(date);

            let html = '';

            bodies.forEach(b => {
                // 赤道座標 (RA, Dec)
                const eq = Astronomy.Equator(b.obj, time, observer, true, true);
                // 地平座標 (Alt, Az)
                const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
                // 黄道座標 (GeoVector -> Ecliptic)
                const vec = Astronomy.GeoVector(b.obj, time, false); // false = Aberrationなし
                const ecl = Astronomy.Ecliptic(vec);

                html += `
                <tr>
                    <td>${b.name}</td>
                    <td class="val-ecl">${ecl.elon.toFixed(2)}°</td>
                    <td class="val-ecl">${ecl.elat.toFixed(2)}°</td>
                    <td class="val-eq">${eq.ra.toFixed(2)}h</td>
                    <td class="val-eq">${eq.dec.toFixed(2)}°</td>
                    <td class="val-hor">${hor.altitude.toFixed(2)}°</td>
                    <td class="val-hor">${hor.azimuth.toFixed(2)}°</td>
                </tr>`;
            });

            hudBody.innerHTML = html;
        }

        // --- Drag Functionality for HUD ---
        const header = hud.querySelector('.hud-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        // Mouse & Touch Events
        header.addEventListener('mousedown', dragStart);
        header.addEventListener('touchstart', dragStart, { passive: false });

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            if (hud.classList.contains('hidden')) return;

            isDragging = true;

            // Normalize touch/mouse input
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;

            const rect = hud.getBoundingClientRect();

            // Convert 'bottom' positioning to absolute 'top/left' to prevent jumping
            hud.style.bottom = 'auto';
            hud.style.right = 'auto';
            hud.style.left = rect.left + 'px';
            hud.style.top = rect.top + 'px';

            initialLeft = rect.left;
            initialTop = rect.top;

            // Prevent text selection during drag
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault(); // Prevent scrolling on touch

            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            hud.style.left = `${initialLeft + dx}px`;
            hud.style.top = `${initialTop + dy}px`;
        }

        function dragEnd() {
            isDragging = false;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            Utilities.init();
            initStealthInputs();
            initSecretHUD();
        });
    } else {
        Utilities.init();
        initStealthInputs();
        initSecretHUD();
    }
    window.Sphere10Utils = Utilities;
})();

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
            const bgColor = "#333333";
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Utilities.init());
    } else {
        Utilities.init();
    }
    window.Sphere10Utils = Utilities;
})();

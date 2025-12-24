/**
 * scripts/house.js
 * House System Draw Hook for Sphere10 (v3.8)
 * Added: Whole Sign House support
 */
(function () {
    if (!window.Sphere10 || typeof window.Sphere10.addDrawHook !== 'function') return;
    const DEG2RAD = Math.PI / 180;
    const EPSILON = 23.439281 * DEG2RAD; // 黄道傾斜角
    const HOUSE_COLOR = 'rgba(0, 255, 255, 0.4)';
    const LABEL_COLOR = 'rgba(0, 255, 255, 0.8)';
    const STEPS = 90;
    // AC（アセンダント）の黄経を計算
    function getAscendant(lst, lat) {
        const sinLST = Math.sin(lst);
        const cosLST = Math.cos(lst);
        const tanPhi = Math.tan(lat);
        const cosEps = Math.cos(EPSILON);
        const sinEps = Math.sin(EPSILON);

        let asc = Math.atan2(cosLST, -(sinLST * cosEps + tanPhi * sinEps));
        return (asc + 2 * Math.PI) % (2 * Math.PI);
    }
    window.Sphere10.addDrawHook(function (ctx, state) {
        if (!state.houseSystem || state.houseSystem === 'none' || !state.applyAllRotations || !state.project) return;
        const latRad = state.latitude * DEG2RAD;
        const lstRad = state.angle;
        const baseAngles = [0, -30, -60, -90, -120, -150];
        let houseData = { mode: '', angles: [] };
        // --- House System Logic ---
        if (state.houseSystem === 'campanus') {
            houseData.mode = 'horizontal';
            houseData.angles = baseAngles.map(a => a * DEG2RAD);
        } else if (state.houseSystem === 'regiomontanus') {
            houseData.mode = 'horizontal';
            const cosPhi = Math.cos(latRad);
            houseData.angles = baseAngles.map(a => {
                const rad = a * DEG2RAD;
                if (Math.abs(a) === 90) return (a > 0 ? 1 : -1) * Math.PI / 2;
                let h = Math.atan(Math.tan(rad) * cosPhi);
                if (a < -90) h -= Math.PI; // 象限補正
                return h;
            });
        } else if (state.houseSystem === 'equal' || state.houseSystem === 'whole-sign') {
            houseData.mode = 'ecliptic';
            const acLong = getAscendant(lstRad, latRad);

            let startLong = acLong;

            // Whole Sign: ACが含まれるサインの0度を起点とする
            if (state.houseSystem === 'whole-sign') {
                // AC(ラジアン)を度数に変換 -> 30で割って切り捨て -> 30を掛ける -> ラジアンに戻す
                const acDeg = acLong / DEG2RAD;
                const signStartDeg = Math.floor(acDeg / 30) * 30;
                startLong = signStartDeg * DEG2RAD;
            }
            // 黄道順(反時計回り)
            const equalAngles = [0, 30, 60, 90, 120, 150];
            houseData.angles = equalAngles.map(a => startLong + a * DEG2RAD);
        }
        ctx.lineWidth = 1;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // --- Label Positioning Logic ---
        let labelIdxFront, labelIdxBack;
        if (houseData.mode === 'ecliptic') {
            // Equal / Whole Sign: 黄道付近
            labelIdxFront = 5;  // +20 deg
            labelIdxBack = 40;  // +160 deg (Opposite +20 deg)
        } else {
            // Horizontal: 天頂・天底付近
            labelIdxFront = 23;
            labelIdxBack = 68;
        }
        // 2. 描画ループ
        houseData.angles.forEach((h, idx) => {
            ctx.strokeStyle = HOUSE_COLOR;
            ctx.beginPath();
            let currentPathActive = false;

            let labelPosFront = null;
            let labelPosBack = null;
            for (let i = 0; i <= STEPS; i++) {
                const t = (i / STEPS) * 2 * Math.PI;
                let x, y, z;
                if (houseData.mode === 'horizontal') {
                    const sinT = Math.sin(t);
                    const cosT = Math.cos(t);
                    x = sinT * Math.cos(h);
                    y = -cosT;
                    z = sinT * Math.sin(h);
                } else {
                    const lambda = h;
                    const beta = t;
                    const dec = Math.asin(Math.sin(beta) * Math.cos(EPSILON) + Math.cos(beta) * Math.sin(EPSILON) * Math.sin(lambda));
                    const ra = Math.atan2(Math.cos(beta) * Math.cos(EPSILON) * Math.sin(lambda) - Math.sin(beta) * Math.sin(EPSILON), Math.cos(beta) * Math.cos(lambda));
                    const hor = state.toHorizontal(ra, dec, lstRad);
                    x = hor.x; y = hor.y; z = hor.z;
                }
                const rot = state.applyAllRotations(x, y, z);
                const p = state.project(rot.x, rot.y, rot.z);
                if (p) {
                    if (!currentPathActive) { ctx.moveTo(p.sx, p.sy); currentPathActive = true; }
                    else { ctx.lineTo(p.sx, p.sy); }
                    if (i === labelIdxFront) labelPosFront = p;
                    if (i === labelIdxBack) labelPosBack = p;
                } else {
                    currentPathActive = false;
                }
            }
            ctx.stroke();
            // 3. ハウス番号ラベルの描画
            ctx.fillStyle = LABEL_COLOR;

            if (labelPosFront) {
                const num = idx + 1;
                ctx.fillText(num, labelPosFront.sx, labelPosFront.sy);
            }
            if (labelPosBack) {
                const num = idx + 7;
                ctx.fillText(num, labelPosBack.sx, labelPosBack.sy);
            }
        });
    });
    console.log('House System v3.8: Added Whole Sign House.');
})();
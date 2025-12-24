/**
 * scripts/house.js
 * House System Draw Hook for Sphere10 (v4.3)
 * Fixed: Visual alignment of Angle labels (1,4,7,10)
 * Placed at Equator intersections instead of Ecliptic to match other labels.
 */
(function () {
    if (!window.Sphere10 || typeof window.Sphere10.addDrawHook !== 'function') return;

    const DEG2RAD = Math.PI / 180;
    const EPSILON = 23.439281 * DEG2RAD;
    const HOUSE_COLOR = 'rgba(0, 255, 255, 0.4)';
    const LABEL_COLOR = 'rgba(0, 255, 255, 0.8)';
    const STEPS = 90;

    function getAscendant(lst, lat) {
        const sinLST = Math.sin(lst);
        const cosLST = Math.cos(lst);
        const tanPhi = Math.tan(lat);
        const cosEps = Math.cos(EPSILON);
        const sinEps = Math.sin(EPSILON);
        let asc = Math.atan2(cosLST, -(sinLST * cosEps + tanPhi * sinEps));
        return (asc + 2 * Math.PI) % (2 * Math.PI);
    }

    function getProjectedPoint(state, ra, dec) {
        const { x, y, z } = state.toHorizontal(ra, dec, state.angle);
        const rot = state.applyAllRotations(x, y, z);
        return state.project(rot.x, rot.y, rot.z);
    }

    function drawCurveFromPoints(ctx, state, points, houseNumFront, houseNumBack) {
        if (points.length === 0) return;

        // Front
        ctx.beginPath();
        let started = false;
        let labelPosFront = null;
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const rot = state.applyAllRotations(pt.x, pt.y, pt.z);
            const p = state.project(rot.x, rot.y, rot.z);
            if (p) {
                if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
                else { ctx.lineTo(p.sx, p.sy); }
                if (i === Math.floor(points.length / 2)) labelPosFront = p;
            } else { started = false; }
        }
        ctx.stroke();

        // Back
        ctx.beginPath();
        started = false;
        let labelPosBack = null;
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const rot = state.applyAllRotations(-pt.x, -pt.y, -pt.z);
            const p = state.project(rot.x, rot.y, rot.z);
            if (p) {
                if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
                else { ctx.lineTo(p.sx, p.sy); }
                if (i === Math.floor(points.length / 2)) labelPosBack = p;
            } else { started = false; }
        }
        ctx.stroke();

        ctx.fillStyle = LABEL_COLOR;
        if (labelPosFront) ctx.fillText(houseNumFront, labelPosFront.sx, labelPosFront.sy);
        if (labelPosBack) ctx.fillText(houseNumBack, labelPosBack.sx, labelPosBack.sy);
    }

    window.Sphere10.addDrawHook(function (ctx, state) {
        if (!state.houseSystem || state.houseSystem === 'none' || !state.applyAllRotations || !state.project) return;

        const latRad = state.latitude * DEG2RAD;
        const lstRad = state.angle;

        ctx.lineWidth = 1;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = HOUSE_COLOR;

        // === Placidus System ===
        if (state.houseSystem === 'placidus') {
            const limitDec = (90 - Math.abs(state.latitude) - 0.5) * DEG2RAD;
            const curves = { c11: [], c12: [], c09: [], c08: [] };
            const tanPhi = Math.tan(latRad);

            for (let dec = -limitDec; dec <= limitDec; dec += 2 * DEG2RAD) {
                const tanDec = Math.tan(dec);
                const val = -tanPhi * tanDec;
                if (Math.abs(val) >= 1) continue;

                const H = Math.acos(val);

                const offsets = [
                    { key: 'c11', ra: lstRad + H / 3 },
                    { key: 'c12', ra: lstRad + 2 * H / 3 },
                    { key: 'c09', ra: lstRad - H / 3 },
                    { key: 'c08', ra: lstRad - 2 * H / 3 }
                ];

                offsets.forEach(o => {
                    const { x, y, z } = state.toHorizontal(o.ra, dec, lstRad);
                    curves[o.key].push({ x, y, z });
                });
            }

            drawCurveFromPoints(ctx, state, curves.c11, 11, 5);
            drawCurveFromPoints(ctx, state, curves.c12, 12, 6);
            drawCurveFromPoints(ctx, state, curves.c09, 9, 3);
            drawCurveFromPoints(ctx, state, curves.c08, 8, 2);

            // ★ Angle Labels (1, 4, 7, 10) - Visual Alignment Fix ★
            // 黄道上ではなく、天の赤道(Dec=0)との交点に配置することで、
            // S字曲線の中央(Dec=0)にある他のラベルと高さを揃える。
            ctx.fillStyle = LABEL_COLOR;

            // 1. House 10 (MC Axis) & 4 (IC Axis) on Equator
            // Meridianは RA = LST
            const p10 = getProjectedPoint(state, lstRad, 0); // South (MC side) on Equator
            const p4 = getProjectedPoint(state, lstRad + Math.PI, 0); // North (IC side) on Equator

            if (p10) ctx.fillText("10", p10.sx, p10.sy);
            if (p4) ctx.fillText("4", p4.sx, p4.sy);

            // 2. House 1 (Asc Axis) & 7 (Dsc Axis) on Equator
            // Horizonは RA = LST +/- 90deg で赤道と交差する (East/West Point)
            // East Point (Rising) -> RA = LST + PI/2
            const p1 = getProjectedPoint(state, lstRad + Math.PI / 2, 0); // East Point
            const p7 = getProjectedPoint(state, lstRad - Math.PI / 2, 0); // West Point

            if (p1) ctx.fillText("1", p1.sx, p1.sy);
            if (p7) ctx.fillText("7", p7.sx, p7.sy);

            return;
        }

        // === Other Systems ===
        const baseAngles = [0, -30, -60, -90, -120, -150];
        let houseData = { mode: '', angles: [] };

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
                if (a < -90) h -= Math.PI;
                return h;
            });
        } else if (state.houseSystem === 'equal' || state.houseSystem === 'whole-sign') {
            houseData.mode = 'ecliptic';
            const acLong = getAscendant(lstRad, latRad);
            let startLong = acLong;
            if (state.houseSystem === 'whole-sign') {
                const acDeg = acLong / DEG2RAD;
                const signStartDeg = Math.floor(acDeg / 30) * 30;
                startLong = signStartDeg * DEG2RAD;
            }
            const equalAngles = [0, 30, 60, 90, 120, 150];
            houseData.angles = equalAngles.map(a => startLong + a * DEG2RAD);
        }

        let labelIdxFront, labelIdxBack;
        if (houseData.mode === 'ecliptic') {
            labelIdxFront = 5; labelIdxBack = 40;
        } else {
            labelIdxFront = 23; labelIdxBack = 68;
        }

        houseData.angles.forEach((h, idx) => {
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
                } else { currentPathActive = false; }
            }
            ctx.stroke();
            ctx.fillStyle = LABEL_COLOR;
            if (labelPosFront) { ctx.fillText(idx + 1, labelPosFront.sx, labelPosFront.sy); }
            if (labelPosBack) { ctx.fillText(idx + 7, labelPosBack.sx, labelPosBack.sy); }
        });
    });
    console.log('House System v4.3: Visual Alignment of Angles.');
})();
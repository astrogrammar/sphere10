// Sphere10 - 天球シミュレーター
// 古典占星術向けの3D天球表示アプリケーション

// ★★★ 初期化関数 ★★★
function initApp() {
    // キャンバス要素の取得とサイズ設定
    const canvas = document.getElementById('sky');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const w = canvas.width;
    const h = canvas.height;
    let zoom = 1.0;
    let scale = w * 0.35 * zoom;
    const centerX = w / 2;
    const centerY = h / 2;

    // ★★★ タッチ操作対応（iPadサポート） ★★★
    let initialTouchDistance = null;
    let initialZoom = zoom;

    // タッチイベントリスナー
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialTouchDistance = Math.hypot(dx, dy);
            initialZoom = zoom;
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialTouchDistance !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);
            zoom = initialZoom * (currentDistance / initialTouchDistance);
            zoom = Math.min(Math.max(zoom, 0.1), 10);
            scale = w * 0.4 * zoom;
            e.preventDefault();
        }
    });
    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialTouchDistance = null;
        }
    });

    // ★★★ マウスホイールによるズーム機能 ★★★
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;  
        zoom += delta;
        zoom = Math.min(Math.max(zoom, 0.1), 10);
        scale = w * 0.4 * zoom;
    });
    
    console.log("スクリプトが実行されています。");

    let rotationZ = 0;  
    let rotationY = 0;  
    let rotationEW = 0; 

    const rotationZSlider = document.getElementById('rotationZSlider');
    const rotationYSlider = document.getElementById('rotationYSlider');
    const rotationEWSlider = document.getElementById('rotationEWSlider');
    const rotationZVal = document.getElementById('rotationZVal');
    const rotationYVal = document.getElementById('rotationYVal');
    const rotationEWVal = document.getElementById('rotationEWVal');

    let angle = 0; 
    let isPlaying = true;
    let playbackSpeed = 1; 

    let currentDate = new Date(); 
    let latitude = 35.4333; 
    let longitude = 139.65;

    // ★★★ 設定値記憶機能 ★★★
    function saveSettings() {
      try {
        const settings = {
          latitude: latitude,
          rotationZ: rotationZ,
          rotationY: rotationY,
          rotationEW: rotationEW,
          horizonVisible: horizonVisible,
          meridianVisible: meridianVisible,
          equatorVisible: equatorVisible,
          eclipticVisible: eclipticVisible,
          eclipticBandVisible: eclipticBandVisible,
          ra12LinesVisible: ra12LinesVisible,
          declinationLinesVisible: declinationLinesVisible,
          starsVisible: starsVisible,
          showBackSide: showBackSide,
          planetLabelsVisible: planetLabelsVisible,
          reverseEastWest: reverseEastWest,
          directionVisible: directionVisible
        };
        localStorage.setItem('sphere10_settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('設定の保存に失敗しました:', e);
      }
    }

    function loadSettings() {
      try {
        const saved = localStorage.getItem('sphere10_settings');
        if (saved) {
          const settings = JSON.parse(saved);
          // 各値を復元（デフォルト値をフォールバック）
          latitude = settings.latitude ?? 35.4333;
          rotationZ = settings.rotationZ ?? 0;
          rotationY = settings.rotationY ?? 0;
          rotationEW = settings.rotationEW ?? 0;
          horizonVisible = settings.horizonVisible ?? true;
          meridianVisible = settings.meridianVisible ?? true;
          equatorVisible = settings.equatorVisible ?? true;
          eclipticVisible = settings.eclipticVisible ?? true;
          eclipticBandVisible = settings.eclipticBandVisible ?? true;
          ra12LinesVisible = settings.ra12LinesVisible ?? true;
          declinationLinesVisible = settings.declinationLinesVisible ?? true;
          starsVisible = settings.starsVisible ?? true;
          showBackSide = settings.showBackSide ?? false;
          planetLabelsVisible = settings.planetLabelsVisible ?? false;
          reverseEastWest = settings.reverseEastWest ?? false;
          directionVisible = settings.directionVisible ?? true;
          console.log('設定を復元しました');
          return true;
        }
      } catch (e) {
        console.warn('設定の読み込みに失敗しました:', e);
      }
      return false;
    }

    function updateAllUI() {
      // スライダー値の更新
      if (rotationZSlider) {
        rotationZSlider.value = (rotationZ * 180 / Math.PI).toFixed(0);
        rotationZVal.textContent = rotationZSlider.value + "°";
      }
      if (rotationYSlider) {
        rotationYSlider.value = (rotationY * 180 / Math.PI).toFixed(0);
        rotationYVal.textContent = rotationYSlider.value + "°";
      }
      if (rotationEWSlider) {
        rotationEWSlider.value = (rotationEW * 180 / Math.PI).toFixed(0);
        rotationEWVal.textContent = rotationEWSlider.value + "°";
      }
      // 緯度入力の更新
      const latitudeInput = document.getElementById("latitudeInput");
      if (latitudeInput) {
        latitudeInput.value = latitude.toFixed(1);
      }
    }

    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const fastForwardButton = document.getElementById('fastForwardButton');
    const reverseButton = document.getElementById('reverseButton');

    const datetimeInput = document.getElementById('datetimeInput');
    const locationInput = document.getElementById('locationInput');
    const setLocationButton = document.getElementById('setLocationButton');

    // ★★★ 恒星表示・裏側描画のフラグ ★★★
    let starsVisible = true;
    let showBackSide = false;
    const starToggle = document.getElementById('starToggle');
    starToggle.addEventListener('change', () => { starsVisible = starToggle.checked; saveSettings(); });
    const backToggle = document.getElementById('backToggle');
    backToggle.addEventListener('change', () => { showBackSide = backToggle.checked; saveSettings(); });

    // ★★★ 惑星ラベルの表示フラグ ★★★
    let planetLabelsVisible = false;
    const planetLabelToggle = document.getElementById('planetLabelToggle');
    planetLabelToggle.addEventListener('change', () => { planetLabelsVisible = planetLabelToggle.checked; saveSettings(); });

    // ★★★ 表示項目のトグル ★★★
    const horizonToggle = document.getElementById('horizonToggle');
    const meridianToggle = document.getElementById('meridianToggle');
    const equatorToggle = document.getElementById('equatorToggle');
    const eclipticToggle = document.getElementById('eclipticToggle');
    const eclipticBandToggle = document.getElementById('eclipticBandToggle');
    const ra12LinesToggle = document.getElementById('ra12LinesToggle');
    const declinationLinesToggle = document.getElementById('declinationLinesToggle');
    let horizonVisible = horizonToggle.checked;
    let meridianVisible = meridianToggle.checked;
    let equatorVisible = equatorToggle.checked;
    let eclipticVisible = eclipticToggle.checked;
    let eclipticBandVisible = eclipticBandToggle.checked;
    let ra12LinesVisible = ra12LinesToggle.checked;
    let declinationLinesVisible = declinationLinesToggle.checked;
    horizonToggle.addEventListener('change', () => { horizonVisible = horizonToggle.checked; saveSettings(); });
    meridianToggle.addEventListener('change', () => { meridianVisible = meridianToggle.checked; saveSettings(); });
    equatorToggle.addEventListener('change', () => { equatorVisible = equatorToggle.checked; saveSettings(); });
    eclipticToggle.addEventListener('change', () => { eclipticVisible = eclipticToggle.checked; saveSettings(); });
    eclipticBandToggle.addEventListener('change', () => { eclipticBandVisible = eclipticBandToggle.checked; saveSettings(); });
    ra12LinesToggle.addEventListener('change', () => { ra12LinesVisible = ra12LinesToggle.checked; saveSettings(); });
    declinationLinesToggle.addEventListener('change', () => { declinationLinesVisible = declinationLinesToggle.checked; saveSettings(); });

    // ★★★ 方角表示設定 ★★★
    const directionToggle = document.getElementById('directionToggle');
    const directionTextSizeSlider = document.getElementById('directionTextSize');
    const directionTextSizeVal = document.getElementById('directionTextSizeVal');
    const directionTextColorPicker = document.getElementById('directionTextColor');
    let directionVisible = directionToggle.checked;
    let directionTextSize = parseInt(directionTextSizeSlider.value, 10);
    let directionTextColor = directionTextColorPicker.value;
    directionToggle.addEventListener('change', () => { directionVisible = directionToggle.checked; saveSettings(); });
    directionTextSizeSlider.addEventListener('input', () => {
      directionTextSize = parseInt(directionTextSizeSlider.value, 10);
      directionTextSizeVal.textContent = directionTextSizeSlider.value + "px";
    });
    directionTextColorPicker.addEventListener('input', () => { directionTextColor = directionTextColorPicker.value; });

    // ★★★ 新規追加: 東西反転トグル ★★★
    let reverseEastWest = false;
    const reverseEWToggle = document.getElementById('reverseEWToggle');
    reverseEWToggle.addEventListener('change', () => { reverseEastWest = reverseEWToggle.checked; saveSettings(); });

    // ★★★ 設定読み込みとUI同期 ★★★
    loadSettings(); // 保存された設定を読み込み
    updateAllUI();  // UIに反映
    
    // チェックボックスの状態を復元
    if (horizonToggle) horizonToggle.checked = horizonVisible;
    if (meridianToggle) meridianToggle.checked = meridianVisible;
    if (equatorToggle) equatorToggle.checked = equatorVisible;
    if (eclipticToggle) eclipticToggle.checked = eclipticVisible;
    if (eclipticBandToggle) eclipticBandToggle.checked = eclipticBandVisible;
    if (ra12LinesToggle) ra12LinesToggle.checked = ra12LinesVisible;
    if (declinationLinesToggle) declinationLinesToggle.checked = declinationLinesVisible;
    if (starToggle) starToggle.checked = starsVisible;
    if (backToggle) backToggle.checked = showBackSide;
    if (planetLabelToggle) planetLabelToggle.checked = planetLabelsVisible;
    if (reverseEWToggle) reverseEWToggle.checked = reverseEastWest;
    if (directionToggle) directionToggle.checked = directionVisible;

    datetimeInput.addEventListener('change', () => {
      const userDate = new Date(datetimeInput.value);
      if (!isNaN(userDate)) {
        currentDate = userDate;
        updateAllPositions();
      }
    });

    setLocationButton.addEventListener('click', async () => {
      const city = locationInput.value.trim();
      if (city) {
        try {
          const response = await fetch('./data/location.json');
          if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
          const locData = await response.json();
          if (locData[city]) {
            latitude = locData[city].latitude;
            longitude = locData[city].longitude;
            // 緯度入力フィールドも同期更新
            const latitudeInput = document.getElementById("latitudeInput");
            if (latitudeInput) {
              latitudeInput.value = latitude.toFixed(1);
            }
            updateAllPositions();
          } else {
            console.error("指定された都市がlocation.jsonにありません");
          }
        } catch (e) {
          console.error("location.json取得エラー:", e);
        }
      }
    });

    // ★★★ 緯度調節機能 ★★★
    const latitudeInput = document.getElementById("latitudeInput");
    latitudeInput.addEventListener("change", () => {
      let newLat = parseFloat(latitudeInput.value);
      if (isNaN(newLat)) {
        newLat = 35.4; // デフォルト値に戻す
      }
      if (newLat > 89.9999) newLat = 89.9999;
      if (newLat < -89.9999) newLat = -89.9999;
      latitude = newLat;
      latitudeInput.value = latitude.toFixed(1);
      updateAllPositions();
      saveSettings();
    });

    // 初期値の設定
    latitudeInput.value = latitude.toFixed(1);

    rotationZSlider.addEventListener('input', () => {
      rotationZ = rotationZSlider.value * Math.PI / 180;
      rotationZVal.textContent = rotationZSlider.value + "°";
      window.lastRotationTime = Date.now(); // ★★★ 回転検出用タイムスタンプ ★★★
      saveSettings();
    });
    rotationYSlider.addEventListener('input', () => {
      rotationY = rotationYSlider.value * Math.PI / 180;
      rotationYVal.textContent = rotationYSlider.value + "°";
      window.lastRotationTime = Date.now(); // ★★★ 回転検出用タイムスタンプ ★★★
      saveSettings();
    });
    rotationEWSlider.addEventListener('input', () => {
      rotationEW = rotationEWSlider.value * Math.PI / 180;
      rotationEWVal.textContent = rotationEWSlider.value + "°";
      window.lastRotationTime = Date.now(); // ★★★ 回転検出用タイムスタンプ ★★★
      saveSettings();
    });

    // ★★★ マウスドラッグによる回転操作 ★★★
    let isDragging = false;
    let lastMouseX, lastMouseY;
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        // 感度は適宜調整（ここでは 0.005 ラジアン/ピクセル）
        rotationZ += dx * 0.005;
        rotationY += dy * 0.005;
        window.lastRotationTime = Date.now(); // ★★★ 回転検出用タイムスタンプ ★★★
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        // スライダー表示の更新
        rotationZSlider.value = (rotationZ * 180 / Math.PI).toFixed(0);
        rotationZVal.textContent = rotationZSlider.value + "°";
        rotationYSlider.value = (rotationY * 180 / Math.PI).toFixed(0);
        rotationYVal.textContent = rotationYSlider.value + "°";
      }
    });
    canvas.addEventListener('mouseup', () => { 
      if (isDragging) {
        isDragging = false; 
        saveSettings(); // ドラッグ終了時に保存
      }
    });
    canvas.addEventListener('mouseleave', () => { 
      if (isDragging) {
        isDragging = false; 
        saveSettings(); // ドラッグ終了時に保存
      }
    });

    // ★★★ パネル折りたたみボタン ★★★
    const controls = document.querySelector('.controls');
    const togglePanelButton = document.getElementById('togglePanelButton');
    togglePanelButton.addEventListener('click', () => { 
      controls.classList.toggle('minimized'); 
      togglePanelButton.textContent = controls.classList.contains('minimized') ? '+' : '−';
    });

    // ★★★ セクション折りたたみ機能 ★★★
    function initSectionToggles() {
      const sectionHeaders = document.querySelectorAll('.section-header');
      
      // 初期状態をlocalStorageから読み込み、デフォルトは全て展開
      const sectionStates = JSON.parse(localStorage.getItem('sectionStates')) || {
        rotation: true,
        indicator: true,
        option: true,
        planets: true,
        location: true
      };

      sectionHeaders.forEach(header => {
        const section = header.closest('.section');
        const sectionName = header.dataset.section;
        const content = section.querySelector('.section-content');
        
        // 初期状態の設定
        if (!sectionStates[sectionName]) {
          section.classList.add('collapsed');
          content.classList.add('collapsed');
        }

        // タッチとクリックイベントの追加（タッチデバイス対応）
        const toggleSection = () => {
          const isCollapsed = section.classList.contains('collapsed');
          
          section.classList.toggle('collapsed');
          content.classList.toggle('collapsed');
          
          // 状態をlocalStorageに保存
          sectionStates[sectionName] = isCollapsed; // 反転した値
          localStorage.setItem('sectionStates', JSON.stringify(sectionStates));
        };

        // タッチデバイス対応: イベント重複を防ぐ統一ハンドラー
        let touchHandled = false;
        
        header.addEventListener('touchstart', (e) => {
          touchHandled = true;
          toggleSection();
          e.preventDefault(); // clickイベントの発火を防ぐ
        });
        
        header.addEventListener('click', (e) => {
          if (!touchHandled) {
            toggleSection();
          }
          touchHandled = false; // 次のイベントのためにリセット
        });
      });
    }

    // セクション折りたたみ機能を初期化
    initSectionToggles();

    // ★★★ 隠しデバッグモード実装 ★★★
    let debugMode = false;
    let debugPanel = null;
    let fpsHistory = [];
    let frameCount = 0;
    let lastFpsTime = performance.now();

    function createDebugPanel() {
      if (debugPanel) return debugPanel;
      
      debugPanel = document.createElement('div');
      debugPanel.id = 'debugPanel';
      debugPanel.innerHTML = `
        <div style="
          position: fixed; 
          top: 80px; 
          right: 20px; 
          background: rgba(20, 20, 30, 0.95); 
          color: #00ff00; 
          padding: 15px; 
          border-radius: 8px; 
          font-family: 'Courier New', monospace; 
          font-size: 11px; 
          line-height: 1.4;
          border: 1px solid rgba(0, 255, 0, 0.3);
          min-width: 200px;
          z-index: 10000;
          backdrop-filter: blur(5px);
        ">
          <div style="color: #ffff00; font-weight: bold; margin-bottom: 8px;">🔬 DEBUG MODE</div>
          <div id="debugFPS">FPS: --</div>
          <div id="debugFrameTime">Frame: --ms</div>
          <div id="debugStars">Stars: --</div>
          <div id="debugMemory">Memory: --MB</div>
          <div id="debugRotation">Rotation: --</div>
          <div id="debugDrawTimes" style="margin-top: 8px; font-size: 10px;"></div>
          <div style="margin-top: 8px; color: #888; font-size: 9px;">
            Ctrl+Shift+D to toggle
          </div>
        </div>
      `;
      document.body.appendChild(debugPanel);
      return debugPanel;
    }

    function updateDebugInfo() {
      if (!debugMode || !debugPanel) return;

      frameCount++;
      const now = performance.now();
      
      // FPS計算
      if (now - lastFpsTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
        document.getElementById('debugFPS').textContent = `FPS: ${fps}`;
        frameCount = 0;
        lastFpsTime = now;
        
        // FPS履歴
        fpsHistory.push(fps);
        if (fpsHistory.length > 10) fpsHistory.shift();
      }

      // メモリ使用量 (対応ブラウザのみ)
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        document.getElementById('debugMemory').textContent = `Memory: ${usedMB}MB`;
      }

      // 回転状態
      const rotX = (rotationZ * 180 / Math.PI).toFixed(1);
      const rotY = (rotationY * 180 / Math.PI).toFixed(1);
      const rotEW = (rotationEW * 180 / Math.PI).toFixed(1);
      document.getElementById('debugRotation').textContent = `R: ${rotX}°/${rotY}°/${rotEW}°`;
    }

    // 隠しキー操作の検出 (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyX') {
        e.preventDefault();
        debugMode = !debugMode;
        
        if (debugMode) {
          createDebugPanel();
          console.log('🔬 Sphere10 Debug Mode: ON');
        } else {
          if (debugPanel) {
            debugPanel.remove();
            debugPanel = null;
          }
          console.log('🔬 Sphere10 Debug Mode: OFF');
        }
      }
    });

    // ★★★ Control Panel ドラッグ移動機能 ★★★
    let isDraggingPanel = false;
    let panelOffsetX = 0;
    let panelOffsetY = 0;
    
    const controlHeader = document.querySelector('.control-header');
    
    controlHeader.addEventListener('mousedown', (e) => {
      // トグルボタンクリック時はドラッグしない
      if (e.target === togglePanelButton) return;
      
      isDraggingPanel = true;
      const rect = controls.getBoundingClientRect();
      panelOffsetX = e.clientX - rect.left;
      panelOffsetY = e.clientY - rect.top;
      controlHeader.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDraggingPanel) {
        const newX = e.clientX - panelOffsetX;
        const newY = e.clientY - panelOffsetY;
        
        // 画面端での制限
        const maxX = window.innerWidth - controls.offsetWidth;
        const maxY = window.innerHeight - controls.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        controls.style.left = constrainedX + 'px';
        controls.style.top = constrainedY + 'px';
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDraggingPanel) {
        isDraggingPanel = false;
        controlHeader.style.cursor = 'grab';
      }
    });

    function setActiveButton(activeButton) {
      [playButton, pauseButton, fastForwardButton, reverseButton].forEach(btn => { btn.classList.remove('active'); });
      activeButton.classList.add('active');
    }

    playButton.addEventListener('click', () => { isPlaying = true; playbackSpeed = 1; setActiveButton(playButton); });
    pauseButton.addEventListener('click', () => { isPlaying = false; setActiveButton(pauseButton); });
    fastForwardButton.addEventListener('click', () => { playbackSpeed = 2; isPlaying = true; setActiveButton(fastForwardButton); });
    reverseButton.addEventListener('click', () => { playbackSpeed = -1; isPlaying = true; setActiveButton(reverseButton); });

    let sunRA = 0;  
    let sunDec = 0; 
    let moonRA = 0; 
    let moonDec = 0; 

    const planetData = [
      { name: "Mercury", body: Astronomy.Body.Mercury, color: "#cccccc", RA: 0, Dec: 0 },
      { name: "Venus",   body: Astronomy.Body.Venus,   color: "#cc99ff", RA: 0, Dec: 0 },
      { name: "Mars",    body: Astronomy.Body.Mars,    color: "#ff2222", RA: 0, Dec: 0 },
      { name: "Jupiter", body: Astronomy.Body.Jupiter, color: "#ffffcc", RA: 0, Dec: 0 },
      { name: "Saturn",  body: Astronomy.Body.Saturn,  color: "#ff9966", RA: 0, Dec: 0 },
      { name: "Uranus",  body: Astronomy.Body.Uranus,  color: "#66ccff", RA: 0, Dec: 0 },
      { name: "Neptune", body: Astronomy.Body.Neptune, color: "#6699ff", RA: 0, Dec: 0 },
      { name: "Pluto",   body: Astronomy.Body.Pluto,   color: "#aaaaaa", RA: 0, Dec: 0 }
    ];

    async function updateAllPositions() {
      const time = Astronomy.MakeTime(currentDate);
      const observer = new Astronomy.Observer(latitude, longitude, 0);
      const equSun = Astronomy.Equator(Astronomy.Body.Sun, time, observer, true, true);
      sunRA = equSun.ra;
      sunDec = equSun.dec;
      const equMoon = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
      moonRA = equMoon.ra;
      moonDec = equMoon.dec;
      for (let p of planetData) {
        const equ = Astronomy.Equator(p.body, time, observer, true, true);
        p.RA = equ.ra;   
        p.Dec = equ.dec; 
      }
    }

    function toHorizontal(ra, dec, lst) {
      const latRad = latitude * Math.PI / 180;
      const ha = lst - ra;
      const sinAlt = Math.sin(dec) * Math.sin(latRad) + Math.cos(dec) * Math.cos(latRad) * Math.cos(ha);
      const alt = Math.asin(sinAlt);
      const cosAz = (Math.sin(dec) - Math.sin(latRad) * Math.sin(alt)) / (Math.cos(latRad) * Math.cos(alt));
      let az = Math.acos(cosAz);
      if (Math.sin(ha) > 0) az = 2 * Math.PI - az;
      const x = Math.cos(alt) * Math.sin(az);
      const y = -Math.cos(alt) * Math.cos(az);
      const z = Math.sin(alt);
      return { x, y, z };
    }

    function rotateZaxis(x, y, z, angleZ) {
      const cz = Math.cos(angleZ), sz = Math.sin(angleZ);
      return { x: x * cz - y * sz, y: x * sz + y * cz, z };
    }
    function rotateXaxis(x, y, z, angleX) {
      const cx = Math.cos(angleX), sx = Math.sin(angleX);
      return { x, y: y * cx - z * sx, z: y * sx + z * cx };
    }
    function rotateYaxis(x, y, z, angleY) {
      const cy = Math.cos(angleY), sy = Math.sin(angleY);
      return { x: z * sy + x * cy, y, z: z * cy - x * sy };
    }
    function applyAllRotations(x, y, z) {
      ({ x, y, z } = rotateZaxis(x, y, z, rotationZ));
      ({ x, y, z } = rotateYaxis(x, y, z, rotationY));
      ({ x, y, z } = rotateXaxis(x, y, z, rotationEW));
      return { x, y, z };
    }

    // 裏側描画フラグを考慮
    function project(x, y, z) {
      if (!showBackSide && x < 0) return null;
      // 東西反転トグルがオンの場合、y の符号を反転
      const effectiveY = reverseEastWest ? -y : y;
      const sx = centerX + scale * effectiveY;
      const sy = centerY - scale * z;
      return { sx, sy };
    }

    const magToSize = [
      { limit: 1.0, size: 3.0 },
      { limit: 2.0, size: 2.5 },
      { limit: 3.0, size: 2.0 },
      { limit: 4.0, size: 1.5 },
    ];
    function getStarSize(mag) {
      for (const m of magToSize) {
        if (mag <= m.limit) return m.size;
      }
      return 1.0;
    }
    function getStarColor(mag) {
      if (mag <= 1.0) return "#ffffff";
      if (mag <= 2.0) return "#aaaaaa";
      if (mag <= 3.0) return "#777777";
      return "#555555";
    }

    let starsData = [];
    async function loadStars() {
      try {
        const response = await fetch('./data/bsc5.csv');
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const text = await response.text();
        const lines = text.trim().split('\n');
        lines.shift(); // ヘッダ行スキップ
        const stars = [];
        for (let line of lines) {
          const cols = line.split(';');
          if (cols.length < 3) continue;
          const [RAhms, DEdms, VmagStr] = cols;
          const Vmag = parseFloat(VmagStr);
          if (isNaN(Vmag) || Vmag > 5.5) continue;
          stars.push({ RAhms, DEdms, Vmag });
        }
        console.log(`Loaded ${stars.length} stars`);
        return stars;
      } catch (error) {
        console.error('星表データの読み込み失敗:', error);
        return [];
      }
    }
    function convertRA(RAhms) {
      const parts = RAhms.trim().split(' ');
      if (parts.length !== 3) return NaN;
      const hours = parseFloat(parts[0]),
            minutes = parseFloat(parts[1]),
            seconds = parseFloat(parts[2]);
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return NaN;
      return (hours + minutes / 60 + seconds / 3600) * 15;
    }
    function convertDec(DEdms) {
      const parts = DEdms.trim().split(' ');
      if (parts.length !== 3) return NaN;
      const degrees = parseFloat(parts[0]),
            minutes = parseFloat(parts[1]),
            seconds = parseFloat(parts[2]);
      if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) return NaN;
      return degrees + minutes / 60 + seconds / 3600;
    }

    // ★★★ 最適化された恒星描画 - バッチ処理 ★★★
    function drawStars() {
      if (!starsVisible) return;
      
      const drawStart = debugMode ? performance.now() : 0; 
      
      // 星を色とサイズでグループ化してバッチ描画
      const starGroups = new Map();
      
      for (const star of starsData) {
        const ra = star.RAdeg * Math.PI / 180;
        const dec = star.Decdeg * Math.PI / 180;
        let { x, y, z } = toHorizontal(ra, dec, angle);
        ({ x, y, z } = applyAllRotations(x, y, z));
        const p = project(x, y, z);
        
        if (p) {
          const size = getStarSize(star.Vmag);
          const color = getStarColor(star.Vmag);
          const key = `${color}_${size}`;
          
          if (!starGroups.has(key)) {
            starGroups.set(key, { color, size, points: [] });
          }
          starGroups.get(key).points.push({ x: p.sx, y: p.sy });
        }
      }
      
      // グループ毎にまとめて描画（大幅な最適化）
      for (const [key, group] of starGroups) {
        ctx.fillStyle = group.color;
        ctx.beginPath();
        for (const point of group.points) {
          ctx.moveTo(point.x + group.size, point.y);
          ctx.arc(point.x, point.y, group.size, 0, 2 * Math.PI);
        }
        ctx.fill();
      }
      
      // ★★★ デバッグ用描画時間測定 ★★★
      if (debugMode) {
        const drawTime = performance.now() - drawStart;
        const starsCount = starsData.length;
        if (document.getElementById('debugStars')) {
          document.getElementById('debugStars').textContent = `Stars: ${starsCount} (${drawTime.toFixed(1)}ms)`;
        }
      }
    }

    // ★★★ 最適化された太陽描画 ★★★
    function drawSun() {
      const sunRA_rad = (sunRA * 15) * Math.PI / 180;
      const sunDec_rad = sunDec * Math.PI / 180;
      let { x, y, z } = toHorizontal(sunRA_rad, sunDec_rad, angle);
      ({ x, y, z } = applyAllRotations(x, y, z));
      const p = project(x, y, z);
      if (p) {
        // シャドウ効果の最適化（必要な場合のみsave/restore）
        const originalShadowBlur = ctx.shadowBlur;
        const originalShadowColor = ctx.shadowColor;
        
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#ffff88";
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // シャドウをリセット
        ctx.shadowBlur = originalShadowBlur;
        ctx.shadowColor = originalShadowColor;
        
        if (planetLabelsVisible) {
          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#dddddd';
          ctx.fillText("Sun", p.sx + 30, p.sy);
        }
      }
    }

    function drawMoon() {
      const moonRA_rad = (moonRA * 15) * Math.PI / 180;
      const moonDec_rad = moonDec * Math.PI / 180;
      let { x, y, z } = toHorizontal(moonRA_rad, moonDec_rad, angle);
      ({ x, y, z } = applyAllRotations(x, y, z));
      const p = project(x, y, z);
      if (p) {
        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#dddddd";
        ctx.fillStyle = "#dddddd";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        if (planetLabelsVisible) {
          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#dddddd';
          ctx.fillText("Moon", p.sx + 30, p.sy);
        }
      }
    }

    function drawPlanets() {
      for (const pData of planetData) {
        const raRad = (pData.RA * 15) * Math.PI / 180;
        const decRad = pData.Dec * Math.PI / 180;
        let { x, y, z } = toHorizontal(raRad, decRad, angle);
        ({ x, y, z } = applyAllRotations(x, y, z));
        const projPos = project(x, y, z);
        if (projPos) {
          ctx.fillStyle = pData.color; 
          ctx.beginPath();
          ctx.arc(projPos.sx, projPos.sy, 5, 0, 2 * Math.PI);
          ctx.fill();
          if (planetLabelsVisible) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#dddddd';
            ctx.fillText(pData.name, projPos.sx + 35, projPos.sy);
          }
        }
      }
    }

    function drawHorizon() {
      if (!horizonVisible) return; 
      ctx.strokeStyle = "green"; 
      ctx.lineWidth = 1; 
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      const steps = 360;
      for (let i = 0; i <= steps; i++) {
        const az = i * (2 * Math.PI / steps);
        const alt = 0;
        let x = Math.cos(alt) * Math.sin(az);
        let y = -Math.cos(alt) * Math.cos(az);
        let z = Math.sin(alt);
        ({ x, y, z } = applyAllRotations(x, y, z));
        const p = project(x, y, z);
        if (p) {
          if (!started) { 
            ctx.moveTo(p.sx, p.sy); 
            started = true; 
          } else { 
            ctx.lineTo(p.sx, p.sy); 
          }
        } else {
          if (started) {
            ctx.stroke();
            started = false;
          }
        }
      }
      if (started) { ctx.stroke(); }
    }

    const epsilon = 23.439281 * Math.PI / 180;
    
    function drawGreatCircle(raDecFunc, color, lineWidth = 1, dashed = false, steps = 360) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dashed ? [5, 5] : []);
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const t = i * (2 * Math.PI / steps);
        const { ra, dec } = raDecFunc(t);
        let { x, y, z } = toHorizontal(ra, dec, angle);
        ({ x, y, z } = applyAllRotations(x, y, z));
        const p = project(x, y, z);
        if (p) {
          if (!started) {
            ctx.beginPath();
            ctx.moveTo(p.sx, p.sy);
            started = true;
          } else {
            ctx.lineTo(p.sx, p.sy);
          }
        } else {
          if (started) {
            ctx.stroke();
            started = false;
          }
        }
      }
      if (started) { ctx.stroke(); }
    }

    function drawMeridian() {
      if (!meridianVisible) return;
      drawGreatCircle(
        (t) => {
          const dec = t - Math.PI; 
          const ra = angle; 
          return { ra, dec };
        },
        "green",
        1,
        true,
        360
      );
    }

    function drawEquator() {
      if (!equatorVisible) return; 
      drawGreatCircle((t) => ({ ra: t, dec: 0 }), "red", 1, false); // false＝実線
    }

    function drawEcliptic() {
      if (!eclipticVisible) return; 
      drawGreatCircle((lambda) => {
        const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
        const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
        return { ra, dec };
      }, "orange", 1, false);
    }

    function drawEclipticBand() {
      if (!eclipticBandVisible) return; 
      
      // ★★★ パフォーマンス最適化: 回転状態に応じた動的品質調整 ★★★
      const currentTime = window.currentFrameTime || Date.now();
      const isRotating = (currentTime - (window.lastRotationTime || 0)) < 150;
      const steps = isRotating ? 90 : 180; // 360 → 90-180 (75-50%削減)
      
      function drawLineBeta(betaDeg) {
        const beta = betaDeg * Math.PI / 180;
        drawGreatCircle((lambda) => {
          const dec = Math.asin(Math.sin(beta) * Math.cos(epsilon) + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda));
          const ra = Math.atan2(
            Math.cos(beta) * Math.cos(epsilon) * Math.sin(lambda) - Math.sin(beta) * Math.sin(epsilon),
            Math.cos(beta) * Math.cos(lambda)
          );
          return { ra, dec };
        }, "orange", 1, false, steps);
      }
      drawLineBeta(8);
      drawLineBeta(-8);
    }

    function drawZodiacDivisions() {
      if (!eclipticBandVisible) return; 
      ctx.strokeStyle = "orange";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      
      // ★★★ 最適化: 全ての線を一つのパスにまとめる + 動的品質調整 ★★★
      ctx.beginPath();
      const divisions = 12;
      
      // 回転状態に応じて描画品質を動的調整
      const currentTime = window.currentFrameTime || Date.now();
      const isRotating = (currentTime - (window.lastRotationTime || 0)) < 150;
      const steps = isRotating ? 12 : 20; // 回転中は軽量、静止時は高品質
      
      for (let i = 0; i < divisions; i++) {
        const lambdaConst = i * 30 * Math.PI / 180;
        let started = false;
        
        for (let j = 0; j <= steps; j++) {
          const beta = -8 * Math.PI / 180 + (16 * Math.PI / 180) * (j / steps);
          const dec = Math.asin(
            Math.sin(beta) * Math.cos(epsilon) + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambdaConst)
          );
          const ra = Math.atan2(
            Math.cos(beta) * Math.cos(epsilon) * Math.sin(lambdaConst) - Math.sin(beta) * Math.sin(epsilon),
            Math.cos(beta) * Math.cos(lambdaConst)
          );
          let { x, y, z } = toHorizontal(ra, dec, angle);
          ({ x, y, z } = applyAllRotations(x, y, z));
          const p = project(x, y, z);
          if (p) {
            if (!started) { 
              ctx.moveTo(p.sx, p.sy); 
              started = true; 
            } else { 
              ctx.lineTo(p.sx, p.sy); 
            }
          } else {
            // 線が切れる場合は次のmoveToで新しいサブパスを開始
            started = false;
          }
        }
      }
      // ★★★ 全ての線を一度に描画 ★★★
      ctx.stroke();
    }

    function drawZodiacSymbols() {
      if (!eclipticBandVisible) return; 
      
      const zodiacSymbols = ["♈︎", "♉︎", "♊︎", "♋︎", "♌︎", "♍︎", "♎︎", "♏︎", "♐︎", "♑︎", "♒︎", "♓︎"];
      
      // ★★★ パフォーマンス最適化: 回転状態に応じてフォントサイズを調整 ★★★
      const currentTime = window.currentFrameTime || Date.now();
      const isRotating = (currentTime - (window.lastRotationTime || 0)) < 150;
      
      ctx.fillStyle = "orange";
      // 回転中は軽量なフォントサイズ、静止時は通常サイズ
      ctx.font = isRotating ? "30px sans-serif" : "40px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      for (let i = 0; i < 12; i++) {
        const lambdaDeg = i * 30 + 15;
        const lambda = lambdaDeg * Math.PI / 180;
        const dec = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
        const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
        let { x, y, z } = toHorizontal(ra, dec, angle);
        ({ x, y, z } = applyAllRotations(x, y, z));
        const p = project(x, y, z);
        if (p) ctx.fillText(zodiacSymbols[i], p.sx, p.sy);
      }
    }

    function drawRA12Lines() {
      if (!ra12LinesVisible) return; 
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      
      // ★★★ パフォーマンス最適化: 回転状態に応じた動的品質調整 ★★★
      const currentTime = window.currentFrameTime || Date.now();
      const isRotating = (currentTime - (window.lastRotationTime || 0)) < 150;
      
      for (let i = 0; i < 12; i++) {
        const RAconst = i * (30 * Math.PI / 180);
        let started = false;
        ctx.beginPath();
        const steps = isRotating ? 25 : 40; // 50 → 25-40 (50-20%削減)
        for (let j = 0; j <= steps; j++) {
          const dec = -Math.PI / 2 + (Math.PI * (j / steps));
          let { x, y, z } = toHorizontal(RAconst, dec, angle);
          ({ x, y, z } = applyAllRotations(x, y, z));
          const p = project(x, y, z);
          if (p) {
            if (!started) { 
              ctx.moveTo(p.sx, p.sy); 
              started = true; 
            } else { 
              ctx.lineTo(p.sx, p.sy); 
            }
          } else {
            if (started) {
              ctx.stroke();
              started = false;
            }
          }
        }
        if (started) { ctx.stroke(); }
      }
    }

    // ★★★ 赤緯線 (Declination Lines) の描画 ★★★
    function drawDeclinationLines() {
      if (!declinationLinesVisible) return;
      
      // 赤道よりも20%暗い赤色を使用
      ctx.strokeStyle = "#a32929";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]); // 点線
      
      // ★★★ パフォーマンス最適化: 回転状態に応じた動的品質調整 ★★★
      const currentTime = window.currentFrameTime || Date.now();
      const isRotating = (currentTime - (window.lastRotationTime || 0)) < 150;
      
      // -80° から +80° まで 10度間隔で描画
      for (let decDeg = -80; decDeg <= 80; decDeg += 10) {
        const decRad = decDeg * Math.PI / 180;
        let started = false;
        ctx.beginPath();
        
        // 動的品質調整: 回転中は大幅軽量化、静止時は高品質
        const steps = isRotating ? 24 : 48; // 72 → 24-48 (66-33%削減)
        for (let i = 0; i <= steps; i++) {
          const raRad = (i * 360 / steps) * Math.PI / 180;
          let { x, y, z } = toHorizontal(raRad, decRad, angle);
          ({ x, y, z } = applyAllRotations(x, y, z));
          const p = project(x, y, z);
          
          if (p) {
            if (!started) {
              ctx.moveTo(p.sx, p.sy);
              started = true;
            } else {
              ctx.lineTo(p.sx, p.sy);
            }
          } else {
            if (started) {
              ctx.stroke();
              started = false;
            }
          }
        }
        if (started) { ctx.stroke(); }
      }
      
      // 点線リセット
      ctx.setLineDash([]);
    }

    // ★★★ 方角 (Cardinal Directions) の描画 ★★★
    // ※ 以前は地平線に垂直に回転して表示していましたが、今回は固定の向き（水平）で描画します。
    function drawCardinalDirections() {
      if (!directionVisible) return;
      const directions = [
        { label: "N", az: 0 },
        { label: "E", az: Math.PI / 2 },
        { label: "S", az: Math.PI },
        { label: "W", az: 3 * Math.PI / 2 },
      ];
      for (let d of directions) {
        let az = d.az;
        let x = Math.sin(az);
        let y = -Math.cos(az);
        let z = 0;
        ({ x, y, z } = applyAllRotations(x, y, z));
        const p = project(x, y, z);
        if (p) {
          // 中心からの方向を計算して、少し外側へオフセット
          const dx = p.sx - centerX;
          const dy = p.sy - centerY;
          const radialAngle = Math.atan2(dy, dx);
          const offset = directionTextSize * 0.7;
          const offsetX = Math.cos(radialAngle) * offset;
          const offsetY = Math.sin(radialAngle) * offset;
          ctx.save();
          ctx.translate(p.sx + offsetX, p.sy + offsetY);
          // テキストは固定の向き（回転なし）で描画
          ctx.font = directionTextSize + "px sans-serif";
          ctx.fillStyle = directionTextColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(d.label, 0, 0);
          ctx.restore();
        }
      }
    }

    async function initStars() {
      const rawStars = await loadStars();
      starsData = rawStars
        .map(star => ({
          ...star,
          RAdeg: convertRA(star.RAhms),
          Decdeg: convertDec(star.DEdms)
        }))
        .filter(star => !isNaN(star.RAdeg) && !isNaN(star.Decdeg));
      await updateAllPositions();
    }

    // ★★★ 最適化されたアニメーションループ ★★★
    let lastRotationZ = 0;
    let lastRotationY = 0; 
    let lastRotationEW = 0;
    let staticElementsCache = null;
    
    function animate() {
      requestAnimationFrame(animate);
      
      // ★★★ 長時間動作最適化: フレーム共通値の事前計算 ★★★
      const frameTime = Date.now(); // 1回だけ取得
      
      if (isPlaying) {
        angle += 0.002 * playbackSpeed;
        currentDate.setSeconds(currentDate.getSeconds() + playbackSpeed);
        updateAllPositions();
        window.lastRotationTime = frameTime; // 自動回転の検出
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 回転状態の変化を検出（数値比較で最適化）
      const rotationChanged = (
        Math.abs(rotationZ - lastRotationZ) > 0.001 ||
        Math.abs(rotationY - lastRotationY) > 0.001 ||
        Math.abs(rotationEW - lastRotationEW) > 0.001
      );
      if (rotationChanged) {
        lastRotationZ = rotationZ;
        lastRotationY = rotationY; 
        lastRotationEW = rotationEW;
        window.lastRotationTime = frameTime;
      }
      
      // 回転状態をグローバルに共有（各描画関数でDate.now()呼び出し不要）
      window.currentFrameTime = frameTime;
      
      // 背景要素の描画（一部を条件付きで最適化）
      drawStars();
      drawHorizon();
      drawMeridian();
      drawEquator();
      drawEcliptic();
      drawEclipticBand();
      drawZodiacDivisions();
      drawZodiacSymbols();
      drawRA12Lines();
      drawDeclinationLines();
      drawCardinalDirections();
      
      // 太陽系天体の描画（常に更新が必要）
      drawSun();    
      drawMoon();   
      drawPlanets();
      
      // ★★★ デバッグ情報更新 ★★★
      updateDebugInfo();
    }

    initStars().then(() => { animate(); });
  }
  
  // DOMContentLoaded後にinitApp実行
  document.addEventListener('DOMContentLoaded', initApp);
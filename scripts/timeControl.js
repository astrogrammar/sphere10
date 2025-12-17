/**
 * Time Control Panel Logic
 * 
 * Handles local date/time manipulation and synchronizes with:
 * 1. The new "Modern" Time Panel UI
 * 2. The legacy `sphere10.js` core logic (via window.Sphere10 API)
 * 3. The legacy `chart.js` (via hidden datetime input events)
 */

(function () {
    // DOM Elements
    const panel = document.getElementById('timePanel');
    const panelHeader = document.getElementById('timePanelHeader');
    const closeBtn = document.getElementById('closeTimePanel');
    const toggleBtn = document.getElementById('toggleTimePanel');
    const dateInput = document.getElementById('modernDateInput');
    const timeInput = document.getElementById('modernTimeInput');

    const unitSettingsToggle = document.getElementById('toggleUnitSettings');
    const unitPopup = document.getElementById('unitSelectorPopup');
    const currentUnitDisplay = document.getElementById('currentUnitDisplay');
    const unitOptions = document.querySelectorAll('.unit-option');

    // Controls
    const btnRewindFast = document.getElementById('tpRewindFast');
    const btnRewind = document.getElementById('tpRewind');
    const btnPlayPause = document.getElementById('tpPlayPause');
    const btnForward = document.getElementById('tpForward');
    const btnForwardFast = document.getElementById('tpForwardFast');
    const btnToday = document.getElementById('tpToday');

    // State
    let currentUnit = 'minute'; // minute, hour, day, month, year
    let isPlaying = false;
    let playInterval = null;
    let playDirection = 0; // -2, -1, 0, 1, 2
    const PLAY_SPEED_MS = 33; // ~30fps

    // ============================================================
    // Initialization
    // ============================================================
    function init() {
        setupDrag(panel, panelHeader);
        setupEventListeners();

        // Initial sync from Sphere10 core
        if (window.Sphere10 && window.Sphere10.getDate) {
            updateDisplay(window.Sphere10.getDate());
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function setupEventListeners() {
        // Panel Toggle
        toggleBtn.addEventListener('click', () => {
            panel.style.display = 'flex';
        });
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
            // stopPlayback(); // REMOVED: Keep playing in background
        });

        // Unit Selector
        unitSettingsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            unitPopup.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!unitSettingsToggle.contains(e.target) && !unitPopup.contains(e.target)) {
                unitPopup.classList.add('hidden');
            }
        });

        unitOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                setUnit(opt.dataset.unit);
                unitPopup.classList.add('hidden');
            });
        });

        // VCR Controls
        btnRewindFast.addEventListener('click', () => togglePlay(-2));
        btnRewind.addEventListener('click', () => step(-1));
        btnPlayPause.addEventListener('click', () => togglePlay(1)); // Simple Play/Pause toggle
        btnForward.addEventListener('click', () => step(1));
        btnForwardFast.addEventListener('click', () => togglePlay(2));
        btnToday.addEventListener('click', setToday);

        // Manual Input (Enter Key)
        function handleManualInput(e) {
            if (e.key === 'Enter') {
                const dStr = dateInput.value;
                const tStr = timeInput.value;
                // Combine and parse
                // Expected format: YYYY/MM/DD and HH:mm
                // Replace / with - for standard parsing if needed, but standard Date constructor might handle slash.
                // Safest is to constructing ISO-like string or replacing / with - 
                const isoDateStr = dStr.replace(/\//g, '-') + 'T' + tStr;
                const newDate = new Date(isoDateStr);

                if (!isNaN(newDate.getTime())) {
                    setDate(newDate);
                    e.target.blur(); // Remove focus
                } else {
                    // Invalid date, revert to current
                    updateDisplay(getCurrentDate());
                }
            }
        }

        dateInput.addEventListener('keydown', handleManualInput);
        timeInput.addEventListener('keydown', handleManualInput);
    }

    // ============================================================
    // Logic
    // ============================================================

    function setUnit(unit) {
        currentUnit = unit;
        currentUnitDisplay.textContent = unit.charAt(0).toUpperCase() + unit.slice(1);

        // Update active class
        unitOptions.forEach(opt => {
            if (opt.dataset.unit === unit) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    function getCurrentDate() {
        if (window.Sphere10 && window.Sphere10.getDate) {
            return new Date(window.Sphere10.getDate());
        }
        return new Date();
    }

    function setDate(date) {
        // 1. Update Core
        if (window.Sphere10 && window.Sphere10.setDate) {
            window.Sphere10.setDate(date);
        }

        // 2. Update Local Display
        updateDisplay(date);

        // 3. Sync Legacy Input (Important for Chart.js)
        syncToLegacyInput(date);
    }

    function updateDisplay(date) {
        if (!date) return;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');

        dateInput.value = `${y}/${m}/${d}`;
        timeInput.value = `${h}:${min}`;
    }

    /**
     * Syncs the current date to the hidden legacy input.
     * STRICT IMPLEMENTATION: No toISOString() allowed.
     */
    function syncToLegacyInput(date) {
        const legacyInput = document.getElementById('datetimeInput');
        if (legacyInput) {
            // Create local ISO-like string manually
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');

            const localString = `${y}-${m}-${d}T${h}:${min}`;

            legacyInput.value = localString;
            // Dispatch events for chart.js
            legacyInput.dispatchEvent(new Event('change'));
            legacyInput.dispatchEvent(new Event('input'));
        }
    }

    function setToday() {
        stopPlayback();
        const now = new Date();
        setDate(now);
    }

    function step(direction) { // direction: 1 or -1
        const date = getCurrentDate();

        switch (currentUnit) {
            case 'minute': date.setMinutes(date.getMinutes() + direction); break;
            case 'hour': date.setHours(date.getHours() + direction); break;
            case 'day': date.setDate(date.getDate() + direction); break;
            case 'month': date.setMonth(date.getMonth() + direction); break;
            case 'year': date.setFullYear(date.getFullYear() + direction); break;
        }

        setDate(date);
    }

    // Playback Logic
    function togglePlay(speed) {
        // If clicking same speed, toggle pause
        if (isPlaying && playDirection === speed) {
            stopPlayback();
            return;
        }

        // Changing speed or starting
        stopPlayback(); // clear previous interval
        isPlaying = true;
        playDirection = speed;

        // Update UI state if needed (e.g. highlight active button)

        playInterval = setInterval(() => {
            // For fast forward/rewind, we might want bigger steps or just faster interval
            // Here we stick to 1 unit step but could be multiplied
            let magnitude = 1;
            if (Math.abs(speed) === 2) magnitude = 5; // Fast speed multiplier

            const dir = speed > 0 ? 1 : -1;

            // Optimize: Do not call full render on every frame if possible?
            // For now, we just call step repeatedly
            for (let i = 0; i < magnitude; i++) {
                step(dir);
            }
        }, PLAY_SPEED_MS);
    }

    function stopPlayback() {
        isPlaying = false;
        playDirection = 0;
        if (playInterval) clearInterval(playInterval);
        playInterval = null;
    }

    // ============================================================
    // Draggable Logic
    // ============================================================
    function setupDrag(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialBottom;

        handle.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Touch support
        handle.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            const rect = element.getBoundingClientRect();
            // Store current visual position
            // Note: We use bottom/left in CSS, but getBoundingClientRect returns top/left relative to viewport
            // To maintain "bottom" positioning, we should calculate it.

            const computedStyle = window.getComputedStyle(element);
            initialLeft = parseInt(computedStyle.left);
            initialBottom = parseInt(computedStyle.bottom);

            // If left is explicitly auto or not set, we might need fallback, 
            // but our CSS sets left: 50% and transform: translateX(-50%).
            // It's easier to switch to pure left/top or left/bottom positioning for dragging.
            // Let's stick to modifying left/bottom variables.

            isDragging = true;
            element.style.transition = 'none'; // Disable transition during drag

            // Prevent text selection
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();

            let clientX, clientY;
            if (e.type === 'touchmove') {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const deltaX = clientX - startX;
            const deltaY = clientY - startY; // positive = down

            // Update position
            // Moving mouse down (positive deltaY) means bottom value decreases
            element.style.bottom = `${initialBottom - deltaY}px`;

            // Moving mouse right (positive deltaX) means left value increases
            element.style.left = `${initialLeft + deltaX}px`;
        }

        function dragEnd() {
            isDragging = false;
            element.style.transition = ''; // Restore transition
        }
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

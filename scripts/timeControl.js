/**
 * scripts/timeControl.js
 * Time Control Panel Logic (Split Inputs Version)
 * Fixed: Removed all references to 'dateInput' to prevent TypeErrors.
 */
(function () {
    // Variables
    let panel, panelHeader, closeBtn, toggleBtn;
    let valYear, valMonth, valDay, valHour, valMinute; // New Split Inputs
    let unitSettingsToggle, unitPopup, currentUnitDisplay, unitOptions;
    let btnRewindFast, btnRewind, btnPlayPause, btnForward, btnForwardFast, btnToday;

    // State
    let currentUnit = 'minute';
    let isPlaying = false;
    let playInterval = null;
    let playDirection = 0;
    const PLAY_SPEED_MS = 33;
    const MIN_YEAR = 1;
    const MAX_YEAR = 3000;

    // ============================================================
    // Initialization
    // ============================================================
    function init() {
        // 1. Get Elements
        panel = document.getElementById('timePanel');
        
        // Split Inputs (New IDs)
        valYear = document.getElementById('valYear');
        valMonth = document.getElementById('valMonth');
        valDay = document.getElementById('valDay');
        valHour = document.getElementById('valHour');
        valMinute = document.getElementById('valMinute');

        // Check if critical elements exist
        if (!panel || !valYear) {
            console.warn("Time Control elements missing. Retrying in 100ms...");
            setTimeout(init, 100);
            return;
        }

        // Get remaining elements
        panelHeader = document.getElementById('timePanelHeader');
        closeBtn = document.getElementById('closeTimePanel');
        toggleBtn = document.getElementById('toggleTimePanel');
        
        unitSettingsToggle = document.getElementById('toggleUnitSettings');
        unitPopup = document.getElementById('unitSelectorPopup');
        currentUnitDisplay = document.getElementById('currentUnitDisplay');
        unitOptions = document.querySelectorAll('.unit-option');

        btnRewindFast = document.getElementById('tpRewindFast');
        btnRewind = document.getElementById('tpRewind');
        btnPlayPause = document.getElementById('tpPlayPause');
        btnForward = document.getElementById('tpForward');
        btnForwardFast = document.getElementById('tpForwardFast');
        btnToday = document.getElementById('tpToday');

        // 3. Setup
        setupDrag(panel, panelHeader);
        setupEventListeners();
        setUnit(currentUnit);

        // 4. Initial Sync from Core
        if (window.Sphere10 && window.Sphere10.getDate) {
            updateDisplay(window.Sphere10.getDate());
        }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    function setupEventListeners() {
        // Toggle Panel
        toggleBtn?.addEventListener('click', () => { panel.style.display = 'flex'; });
        closeBtn?.addEventListener('click', () => { panel.style.display = 'none'; });

        // Unit Selector
        unitSettingsToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            unitPopup.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (unitSettingsToggle && unitPopup && !unitSettingsToggle.contains(e.target) && !unitPopup.contains(e.target)) {
                unitPopup.classList.add('hidden');
            }
        });

        unitOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                setUnit(opt.dataset.unit);
                unitPopup.classList.add('hidden');
            });
        });

        // VCR Buttons
        btnRewindFast?.addEventListener('click', () => togglePlay(-2));
        btnRewind?.addEventListener('click', () => step(-1));
        btnPlayPause?.addEventListener('click', () => togglePlay(1));
        btnForward?.addEventListener('click', () => step(1));
        btnForwardFast?.addEventListener('click', () => togglePlay(2));
        btnToday?.addEventListener('click', setToday);

        // Manual Input Handler (Enter Key on any split field)
        function handleManualInput(e) {
            if (e.key === 'Enter') {
                const y = parseInt(valYear.value, 10);
                const m = parseInt(valMonth.value, 10) - 1; // 0-based month
                const d = parseInt(valDay.value, 10);
                const h = parseInt(valHour.value, 10);
                const min = parseInt(valMinute.value, 10);

                const newDate = new Date(y, m, d, h, min);
                if (!isNaN(newDate.getTime())) {
                    validateAndClampDate(newDate);
                    setDate(newDate);
                    e.target.blur(); // Remove focus
                } else {
                    // Invalid date, revert display
                    updateDisplay(getCurrentDate());
                }
            }
        }

        // Attach listener to all split inputs
        [valYear, valMonth, valDay, valHour, valMinute].forEach(input => {
            if (input) input.addEventListener('keydown', handleManualInput);
        });
    }

    // ============================================================
    // Logic
    // ============================================================
    function setUnit(unit) {
        currentUnit = unit;
        const unitLabels = {
            'minute': '<span class="lang-en">Minute</span><span class="lang-ja">分</span>',
            'hour': '<span class="lang-en">Hour</span><span class="lang-ja">時</span>',
            'day': '<span class="lang-en">Day</span><span class="lang-ja">日</span>',
            'month': '<span class="lang-en">Month</span><span class="lang-ja">月</span>',
            'year': '<span class="lang-en">Year</span><span class="lang-ja">年</span>'
        };
        if (currentUnitDisplay) {
            currentUnitDisplay.innerHTML = unitLabels[unit] || unit;
        }
        unitOptions.forEach(opt => {
            if (opt.dataset.unit === unit) opt.classList.add('selected');
            else opt.classList.remove('selected');
        });
    }

    function validateAndClampDate(date) {
        let year = date.getFullYear();
        if (year < MIN_YEAR) date.setFullYear(MIN_YEAR);
        else if (year > MAX_YEAR) date.setFullYear(MAX_YEAR);
        return date;
    }

    function getCurrentDate() {
        if (window.Sphere10 && window.Sphere10.getDate) {
            return new Date(window.Sphere10.getDate());
        }
        return new Date();
    }

    function setDate(date) {
        // Update Core
        if (window.Sphere10 && window.Sphere10.setDate) {
            window.Sphere10.setDate(date);
        }
        updateDisplay(date);
        syncToLegacyInput(date);
    }

    // Update the 5 split inputs
    function updateDisplay(date) {
        if (!date || !valYear) return;
        valYear.value = date.getFullYear();
        valMonth.value = String(date.getMonth() + 1).padStart(2, '0');
        valDay.value = String(date.getDate()).padStart(2, '0');
        valHour.value = String(date.getHours()).padStart(2, '0');
        valMinute.value = String(date.getMinutes()).padStart(2, '0');
    }

    // Keep compatibility with hidden input for chart.js
    function syncToLegacyInput(date) {
        const legacyInput = document.getElementById('datetimeInput');
        if (legacyInput) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            legacyInput.value = `${y}-${m}-${d}T${h}:${min}`;
            legacyInput.dispatchEvent(new Event('change'));
            legacyInput.dispatchEvent(new Event('input'));
        }
    }

    function setToday() {
        stopPlayback();
        setDate(new Date());
    }

    function step(direction) {
        const date = getCurrentDate();
        switch (currentUnit) {
            case 'minute': date.setMinutes(date.getMinutes() + direction); break;
            case 'hour': date.setHours(date.getHours() + direction); break;
            case 'day': date.setDate(date.getDate() + direction); break;
            case 'month': date.setMonth(date.getMonth() + direction); break;
            case 'year': date.setFullYear(date.getFullYear() + direction); break;
        }
        validateAndClampDate(date);
        setDate(date);
    }

    function updateVCRUI() {
        [btnRewindFast, btnRewind, btnPlayPause, btnForward, btnForwardFast, btnToday].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (!isPlaying) return;
        if (playDirection === 1) btnPlayPause.classList.add('active');
        else if (playDirection === 2) btnForwardFast.classList.add('active');
        else if (playDirection === -2) btnRewindFast.classList.add('active');
    }

    function togglePlay(speed) {
        if (isPlaying && playDirection === speed) {
            stopPlayback();
            return;
        }
        stopPlayback();
        isPlaying = true;
        playDirection = speed;
        updateVCRUI();
        playInterval = setInterval(() => {
            let magnitude = (Math.abs(speed) === 2) ? 5 : 1;
            const dir = speed > 0 ? 1 : -1;
            for (let i = 0; i < magnitude; i++) step(dir);
        }, PLAY_SPEED_MS);
    }

    function stopPlayback() {
        isPlaying = false;
        playDirection = 0;
        if (playInterval) clearInterval(playInterval);
        playInterval = null;
        updateVCRUI();
    }

    function setupDrag(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialBottom;

        handle.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        handle.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', dragEnd);

        function dragStart(e) {
            // Fix: Ignore interactions on inputs/buttons
            if (e.target.closest('button') || e.target.closest('input') || 
                e.target.closest('.close-btn') || e.target.closest('.icon-btn')) {
                return;
            }

            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            const computedStyle = window.getComputedStyle(element);
            initialLeft = parseInt(computedStyle.left) || 0;
            initialBottom = parseInt(computedStyle.bottom) || 0;
            isDragging = true;
            element.style.transition = 'none';
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            let clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
            let clientY = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;
            const deltaX = clientX - startX;
            const deltaY = clientY - startY;
            element.style.bottom = `${initialBottom - deltaY}px`;
            element.style.left = `${initialLeft + deltaX}px`;
        }

        function dragEnd() {
            isDragging = false;
            element.style.transition = '';
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
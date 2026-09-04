// 1. Establish the base starting calendar year dynamically using the PC system clock
let currentYear = new Date().getFullYear();

// Global control variables for kiosk run modes
let shortDatePeriod = 1;
let isKioskShiftActive = false; 

// Month View Architecture Management Trackers
let currentActiveWorkspaceMode = "STANDARD_GREEN"; // Options: STANDARD_GREEN, ADMIN_PURPLE, PLAIN_MODE, DISPATCH_MODE
let monthActiveTargetYearInt = null;
const fullMonthNamesMap = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

// Universal JSON List Editor Workspace Tracker Layers
let activeEditorFileKey = ""; // Tracks which file is open (category, toiletries, etc.)
let activeFocusedInputId = null; // Tracks which specific list button slot is being typed into
let isEditorShiftActive = false;

// Base runtime configuration layer blueprint matching config.json keys exactly
let kioskConfig = {
    isFourthYearReleased: false,
    showPrintConfirmation: true,
    securityPin: "1234"
};

// ==========================================================================
// WORKSPACE MODES & PROCESSING TRACKERS
// ==========================================================================
let isDemoModeActive = false;           // Prevents system timing drops during testing runs
let isAdminMultiplesModeActive = false; 
let multiplesCountTarget = 1;          
let lastExecutedPrintPayload = null;    

// Hardcoded legacy administrative secondary menu backup password
let adminSystemPassword = "DCPdrum1";
let pendingAdminOptionKey = null; 

// Structural row class names matching your palette mappings
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// Fetch configuration profile asynchronously from the live Python server disk file
function loadKioskConfigurationState() {
    fetch('http://localhost:8080/config.json')
        .then(response => {
            if (!response.ok) throw new Error("Config file missing or server unreachable.");
            return response.json();
        })
        .then(parsedConfig => {
            // Merge file settings smoothly into the runtime blueprint
            kioskConfig = { ...kioskConfig, ...parsedConfig };
            
            // Rebuild matrix layout cleanly using the newly retrieved data parameters
            generateDynamicGrid();
            console.log("⚙️ Kiosk configuration loaded successfully from server disk.");
        })
        .catch(e => {
            console.warn("⚠️ Local network config fetch failed, relying on defaults:", e);
            generateDynamicGrid();
        });
}

// Push configuration updates directly to the background Python persistence daemon
function saveKioskConfigurationState() {
    fetch('http://localhost:8080/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kioskConfig)
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP save sync failure status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("💾 Persistent layout configurations updated on server disk:", data);
    })
    .catch(error => {
        console.error("❌ Failed to push setting changes to server storage:", error);
        showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO SAVE CONFIGURATION TO DISK' }, 4000);
    });
}

// Call on startup pipeline immediately
loadKioskConfigurationState();
// Build the matrix template grid with proper rolling years and expiration profiles
function generateDynamicGrid() {
    const gridContainer = document.getElementById('master-grid');
    if (!gridContainer) return;
    
    const systemDate = new Date();
    const systemYear = systemDate.getFullYear();
    const systemMonthIndex = systemDate.getMonth(); 
    
    let gridHTML = '';

    const quarterMonthsMap = [
        { qName: 'Q1', months: ['Jan', 'Feb', 'Mar'], indices: [0, 1, 2] },
        { qName: 'Q2', months: ['Apr', 'May', 'Jun'], indices: [3, 4, 5] },
        { qName: 'Q3', months: ['Jul', 'Aug', 'Sep'], indices: [6, 7, 8] },
        { qName: 'Q4', months: ['Oct', 'Nov', 'Dec'], indices: [9, 10, 11] }
    ];

    for (let i = 0; i < 4; i++) {
        const targetYear = currentYear + i;
        const remainder = targetYear % 4;
        let colorIndex;
        
        if (remainder === 2) colorIndex = 0;      // Pink
        else if (remainder === 3) colorIndex = 1; // Green
        else if (remainder === 0) colorIndex = 2; // Yellow
        else if (remainder === 1) colorIndex = 3; // Blue
        
        const colorClass = colorCycle[colorIndex];
        const isFourthRow = (i === 3);
        const isRowFourInactive = isFourthRow && !kioskConfig.isFourthYearReleased;
        const rowStatusClass = isRowFourInactive ? 'inactive-row' : '';

        let rowHTML = `<div class="grid-row ${colorClass} ${rowStatusClass}">`;

        quarterMonthsMap.forEach(qBlock => {
            let disabledMonthsCount = 0;
            let monthsMarkup = '';
            let zplPrintMonths = [];

            qBlock.indices.forEach((mIdx, pos) => {
                const mName = qBlock.months[pos];
                let isMonthExpired = false;
                let isMonthShortDate = false;

                if (targetYear < systemYear) {
                    isMonthExpired = true;
                } else if (targetYear === systemYear) {
                    if (mIdx < systemMonthIndex) isMonthExpired = true;
                }

                if (!isMonthExpired) {
                    const yearDiff = targetYear - systemYear;
                    const absoluteMonthOffset = (yearDiff * 12) + mIdx - systemMonthIndex;
                    if (absoluteMonthOffset >= 0 && absoluteMonthOffset <= shortDatePeriod) {
                        isMonthShortDate = true;
                    }
                }

                if (isMonthExpired) {
                    disabledMonthsCount++;
                    monthsMarkup += `<span class="expired-month">${mName}</span>`;
                    zplPrintMonths.push('x');
                } else if (isMonthShortDate) {
                    disabledMonthsCount++;
                    monthsMarkup += `<span class="short-date-month">${mName}</span>`;
                    zplPrintMonths.push('x');
                } else {
                    monthsMarkup += `<span>${mName}</span>`;
                    zplPrintMonths.push(mName);
                }
            });

            const isButtonFullyDisabled = (disabledMonthsCount === 3);
            const isButtonDisabled = isRowFourInactive || isButtonFullyDisabled;
            const buttonStatusClass = isButtonFullyDisabled ? 'btn-expired-out' : '';
            
            const payloadArrayString = zplPrintMonths.map(m => `'${m}'`).join(',');
            const clickPayload = isButtonDisabled ? '' : `onclick="handleCardClick('${targetYear}', '${qBlock.qName}', [${payloadArrayString}])"`;

            rowHTML += `
            <div class="card-btn ${buttonStatusClass}" ${clickPayload}>
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> ${qBlock.qName.charAt(1)}</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text">${monthsMarkup}</div>
            </div>`;
        });

        const clickYearPayload = isRowFourInactive ? '' : `onclick="handleCardClick('${targetYear}', 'Full Year', ['All'])"`;
        rowHTML += `
            <div class="card-btn year-card" ${clickYearPayload}>${targetYear}</div>
        </div>`;

        gridHTML += rowHTML;
    }
    gridContainer.innerHTML = gridHTML;
}
// Direct click handler function linked to your simulation testing tools
function triggerManualRollOver() {
    currentYear += 1;
    generateDynamicGrid();
}

// Initialize the dynamically built interface once DOM structures are loaded
window.addEventListener('DOMContentLoaded', () => {
    // A. Build the multi-year calendar grid instantly
    // generateDynamicGrid(); Instruction removed to avoid building layout twice at startup
    
    // B. Cache our UI view elements, layout groups, and text tracks
    const homeGrid = document.getElementById('home-category-grid');
    const workspaceView = document.getElementById('workspace-view');
    const homeDeck = document.getElementById('deck-home-actions');
    const screen2Deck = document.getElementById('deck-screen2-nav');
    
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    
    const categoryButtons = document.querySelectorAll('.home-cat-btn');

    // C. Attach click handlers to the active matrix category buttons
    if (categoryButtons.length > 0) {
        categoryButtons.forEach((button, index) => {
            // Slots 27-35 (index 26 and above) stay completely inactive
            if (index >= 26) {
                button.style.cursor = 'default';
                return; 
            }

            button.addEventListener('click', () => {
                const textElement = button.querySelector('.btn-text');
                const rawCategoryText = textElement ? textElement.textContent.trim() : '';

                // Split text cleanly by spaces or hyphens to look for multi-word configurations
                const wordsArray = rawCategoryText.split(/[\s-]+/);

                // CORRECT COMPONENT FORMAT:
                if (slot1 && slot2) {
                    if (wordsArray.length > 1) {
                        // First part goes to line 1, remaining parts go to line 2
                        slot1.textContent = wordsArray[0].toUpperCase();
                        slot2.textContent = wordsArray.slice(1).join('-').toUpperCase();
                    } else {
                        // Single word configuration
                        slot1.textContent = rawCategoryText.toUpperCase();
                        slot2.textContent = '';
                    }
                }

                // D. TO VIEW STATE 2 FLIP: Completely swap grid tracks cleanly using explicit style overrides
                if (homeGrid && workspaceView && homeDeck && screen2Deck) {
                    homeGrid.style.setProperty('display', 'none', 'important');
                    homeDeck.style.setProperty('display', 'none', 'important');
    
                    workspaceView.classList.remove('screen-hide');
                    workspaceView.style.setProperty('display', 'flex', 'important'); 
    
                    screen2Deck.classList.remove('screen-hide');
                }
            });
        });
    }
});

/**
 * Core Touch Event Processors & Network Print Router Pipeline
 * INTERCEPT LAYER: Prepares data payload and halts instant printing if Multiples Mode is active.
 */
function handleCardClick(year, period, zplMonths) { 
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    const activeWord1 = slot1 ? slot1.textContent.trim() : '';
    const activeWord2 = slot2 ? slot2.textContent.trim() : '';

    const currentEvt = window.event || (arguments.callee ? arguments.callee.caller.arguments : null);
    const activeBtn = currentEvt ? currentEvt.currentTarget || currentEvt.target : null;
    const parentRow = activeBtn ? activeBtn.closest('.grid-row') : null;
    let detectedColor = 'green'; 

    if (parentRow) {
        const matchClasses = Array.from(parentRow.classList);
        if (matchClasses.includes('row-2026')) detectedColor = 'pink';
        else if (matchClasses.includes('row-2027')) detectedColor = 'green';
        else if (matchClasses.includes('row-2028')) detectedColor = 'yellow';
        else if (matchClasses.includes('row-2029')) detectedColor = 'blue';
    }

    let month1 = ' ', month2 = ' ', month3 = ' ';
    if (zplMonths && zplMonths.length === 3) {
        month1 = zplMonths[0]; month2 = zplMonths[1]; month3 = zplMonths[2];
    }

    const printPayload = {
        color: detectedColor,
        cwrd1: activeWord1,
        cwrd2: activeWord2,
        q: period === 'Full Year' ? 'FY' : period.charAt(1),
        year: year,
        m1: month1,
        m2: month2,
        m3: month3
    };

    let targetHexColor = '#ffcdd2';
    if (printPayload.color === 'green') targetHexColor = '#a5d6a7';
    else if (printPayload.color === 'yellow') targetHexColor = '#fff59d';
    else if (printPayload.color === 'blue') targetHexColor = '#81d4fa';

    const displayQuarterText = printPayload.q === 'FY' ? '' : `Qtr ${printPayload.q}`;
    
    // Save selected layout parameters safely to global space
    lastExecutedPrintPayload = { 
        ...printPayload, 
        finalHex: targetHexColor, 
        finalPeriod: displayQuarterText 
    };

    // Sequence Divergence Gate
    if (isAdminMultiplesModeActive) {
        console.log("📌 Multiples Mode Intercept: Pausing print queue. Loading key entry pad.");
        triggerMultiplesQuantityOverlay();
    } else {
        console.log("🟢 Normal Mode: Dispatching single print job.");
        executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);
    }
}

/**
 * Dedicated Multiples Loop Execution Engine
 * Fires network requests sequentially based on validated user numeric input.
 */
function executePhysicalPrintSpooler(payload, totalRuns) {
    if (!payload) return;

    const mainWrapper = document.getElementById('main-app-wrapper');
    if (mainWrapper) {
        mainWrapper.classList.add('printing-active-state');
    }

    if (isDemoModeActive) {
        console.log(`✈️ DEMO MODE ACTIVE: Bypassing print daemon for ${totalRuns} labels.`);
        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: payload.year, 
            hexColor: payload.finalHex 
        }, 3000);
    } else {
        const structuralPostPayload = {
            color: payload.color,
            cwrd1: payload.cwrd1,
            cwrd2: payload.cwrd2,
            q: payload.q,
            year: payload.year,
            m1: payload.m1,
            m2: payload.m2,
            m3: payload.m3
        };

        // Fire the print loop cleanly for the exact keypad target quantity
        for (let run = 0; run < totalRuns; run++) {
            fetch('http://localhost:8080', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(structuralPostPayload)
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log(`🎉 Dispatched run (${run + 1}/${totalRuns}) to local CUPS spooler:`, data);
            })
            .catch(error => {
                console.error('❌ Network printing engine link broken:', error);
                const wrapper = document.getElementById('main-app-wrapper');
                if (wrapper) wrapper.classList.remove('printing-active-state');
                showUserAlert('SYSTEM_ALERT', { message: 'PRINTER ROUTER CONNECTION OFFLINE' }, 5000);
            });
        }

        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: payload.year, 
            hexColor: payload.finalHex 
        }, 3000);
    }
}

/**
 * Universal Navigation Sidebar Action Manager
 */
function sidebarAction(action) {
    const homeGrid = document.getElementById('home-category-grid');
    const workspaceView = document.getElementById('workspace-view');
    const monthView = document.getElementById('month-selection-view');
    const homeDeck = document.getElementById('deck-home-actions');
    const screen2Deck = document.getElementById('deck-screen2-nav');
    const monthsActionWrapper = document.getElementById('sidebar-months-action-wrapper');

    if (action === 'BACK') {
        // If on Month View, BACK returns to Date View
        if (!monthView.classList.contains('screen-hide')) {
            monthView.style.setProperty('display', 'none', 'important');
            monthView.classList.add('screen-hide');
            
            workspaceView.classList.remove('screen-hide');
            workspaceView.style.setProperty('display', 'flex', 'important');
            
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
            return;
        }

        // Standard exit out of Date Selection view back to Categories matrix
        if (workspaceView && homeGrid && homeDeck && screen2Deck) {
            workspaceView.style.setProperty('display', 'none', 'important');
            workspaceView.classList.add('screen-hide');
            screen2Deck.classList.add('screen-hide');
            
            homeGrid.style.setProperty('display', 'grid', 'important');
            homeDeck.style.setProperty('display', 'flex', 'important');
            
            syncKioskBackgroundState();
        }
    } else if (action === 'MONTHS') {
        // Route from Date selection workspace into Months screen layout
        if (workspaceView && monthView) {
            workspaceView.style.setProperty('display', 'none', 'important');
            workspaceView.classList.add('screen-hide');
            
            // Sync up word banners to Month workspace view slots
            document.getElementById('month-cat-word1').textContent = document.getElementById('cat-word1').textContent;
            document.getElementById('month-cat-word2').textContent = document.getElementById('cat-word2').textContent;
            
            // Hide the MONTHS switcher trigger button out of the sidebar view safely
            if (monthsActionWrapper) monthsActionWrapper.style.setProperty('display', 'none', 'important');
            
            monthView.classList.remove('screen-hide');
            monthView.style.setProperty('display', 'flex', 'important');
            
            // Automatically select current system calendar year on load execution
            selectMonthTargetYear('CURRENT');
        }
    }
}

/**
 * Universal Inform User Alert Canvas Component
 */
function showUserAlert(type, data = {}, duration = 3000) {
    if (type === 'PRINT_CONFIRM' && !kioskConfig.showPrintConfirmation) {
        // Strip active background animation queue instantly if modals are turned off
        const mainWrapper = document.getElementById('main-app-wrapper');
        if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
        sidebarAction('BACK');
        return;
    }

    const oldModal = document.getElementById('kiosk-universal-overlay');
    if (oldModal) oldModal.remove();

    let modalHtml = '';
    if (type === 'PRINT_CONFIRM') {
        modalHtml = `
            <div class="modal-overlay" id="kiosk-universal-overlay">
                <div class="modal-content">
                    <div class="preview-label" style="background-color: ${data.hexColor || '#ffffff'}">
                        <div class="p-title1">${data.categoryName || ''}</div>
                        <div class="p-title2" style="margin: 5px 0; font-size: 1.3rem; font-weight: bold; min-height: 1.5rem;">${data.periodText || ''}</div>
                        <div id="modal-preview-year">${data.yearText || ''}</div>
                    </div>
                    <div class="modal-caption">PLEASE TAKE YOUR LABEL</div>
                </div>
            </div>`;
    } else if (type === 'SYSTEM_ALERT') {
        modalHtml = `
            <div class="modal-overlay" id="kiosk-universal-overlay">
                <div class="modal-content modal-alert-border">
                    <div class="preview-label modal-alert-bg">
                        <div class="p-title1 modal-alert-text">⚠️ SYSTEM STATUS</div>
                        <div class="p-title2 modal-alert-text" style="margin: 10px 0; font-size: 1.1rem; min-height: 1.5rem;">${data.message || 'UNKNOWN ERROR'}</div>
                        <div id="modal-preview-year" class="modal-alert-text" style="font-size: 1.1rem !important;">ACTION REQUIRED</div>
                    </div>
                    <div class="modal-caption modal-alert-text">ATTENTION REQUIRED</div>
                </div>
            </div>`;
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    setTimeout(() => {
        // 🔒 SAFETY CHECK: If admin multiples selection overlay is open on screen, halt auto-dismiss entirely!
        if (isAdminMultiplesModeActive) {
            console.log("🔒 Admin Multiples Mode active: Halting automatic alert dashboard dismiss countdown.");
            return;
        }

        const activeModal = document.getElementById('kiosk-universal-overlay');
        if (activeModal) {
            activeModal.remove();
            
            const mainWrapper = document.getElementById('main-app-wrapper');
            if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
            
            if (type === 'PRINT_CONFIRM') {
                const monthView = document.getElementById('month-selection-view');
                if (monthView && !monthView.classList.contains('screen-hide')) {
                    handleContinuityChoice('EXIT_TO_HOME_SCREEN_DIRECTLY');
                } else {
                    sidebarAction('BACK');
                }
            }
        }
    }, duration);

}
/**
 * Intercepts the settings cog click event right at the front gate
 */
function interceptSettingsCogClick() {
    const pinModal = document.getElementById('gatekeeper-pin-modal');
    const pinInput = document.getElementById('gatekeeper-pin-input');
    const errorSlot = document.getElementById('gatekeeper-pin-error');
    
    if (pinModal && pinInput) {
        pinInput.value = ''; 
        if (errorSlot) {
            errorSlot.style.display = 'none';
            errorSlot.textContent = '';
        }
        pinModal.classList.remove('modal-hide');
        pinModal.style.setProperty('display', 'flex', 'important'); 
    }
}

/**
 * Appends standard touches to our 4-digit entry array buffer
 */
function pressPinPadKey(digitString) {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    const errorSlot = document.getElementById('gatekeeper-pin-error');
    if (!pinInput) return;
    
    if (errorSlot) {
        errorSlot.style.display = 'none';
    }

    if (pinInput.value.length < 4) {
        pinInput.value += digitString;
    }

    // Automatically fire verification code validation the exact moment length reaches 4
    if (pinInput.value.length === 4) {
        setTimeout(verifyGatekeeperPinEntry, 200);
    }
}

function clearPinPadEntry() {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    if (pinInput) pinInput.value = '';
}

function dismissPinPadSecurity() {
    const pinModal = document.getElementById('gatekeeper-pin-modal');
    if (pinModal) {
        pinModal.style.setProperty('display', 'none', 'important');
        pinModal.classList.add('modal-hide');
    }
}

/**
 * Strict 4-Digit Entry Verification Routing Pipeline
 */
function verifyGatekeeperPinEntry() {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    const errorSlot = document.getElementById('gatekeeper-pin-error');
    if (!pinInput) return;

    if (pinInput.value === kioskConfig.securityPin) {
        dismissPinPadSecurity();
        
        const homeGrid = document.getElementById('home-category-grid');
        const homeDeck = document.getElementById('deck-home-actions');
        const adminView = document.getElementById('admin-settings-view');

        if (homeGrid && homeDeck && adminView) {
            homeGrid.style.setProperty('display', 'none', 'important');
            homeDeck.style.setProperty('display', 'none', 'important');
            adminView.classList.remove('screen-hide');
            adminView.style.setProperty('display', 'block', 'important');
            
                        // 🔒 BULLETPROOF SYNC: Match visual states directly to user-facing config properties
            const row4Checkbox = document.getElementById('admin-toggle-row4');
            const confirmCheckbox = document.getElementById('admin-toggle-confirm');
            if (row4Checkbox) row4Checkbox.checked = kioskConfig.isFourthYearReleased;
            if (confirmCheckbox) confirmCheckbox.checked = kioskConfig.showPrintConfirmation;
        }
    } else {
        if (errorSlot) {
            errorSlot.textContent = "INVALID PIN - ACCESS DENIED";
            errorSlot.style.display = 'block';
        }
        pinInput.value = '';
    }
}

function handleAdminMenuSelection(optionKey) {
    if (optionKey === 'EXIT') {
        const adminView = document.getElementById('admin-settings-view');
        const homeGrid = document.getElementById('home-category-grid');
        const homeDeck = document.getElementById('deck-home-actions');
        
        if (adminView && homeGrid && homeDeck) {
            adminView.style.setProperty('display', 'none', 'important');
            adminView.classList.add('screen-hide');
            
            homeGrid.style.removeProperty('grid-template-columns');
            homeGrid.style.setProperty('display', 'grid', 'important');
            
            homeDeck.style.setProperty('display', 'flex', 'important');
            document.body.style.backgroundColor = isAdminMultiplesModeActive ? '#7851A9' : '#1b5e20';
        }
        return;
    }

    if (optionKey === 'TOGGLE_ROW4' || optionKey === 'TOGGLE_CONFIRM') {
        executeValidatedAdminAction(optionKey);
        return;
    }

    // Intercept data list editing requests and launch the workspace layout
    if (['EDIT_CATEGORY', 'EDIT_TOILETRIES', 'EDIT_CHRISTMAS', 'EDIT_MISC', 'EDIT_DISPATCH'].includes(optionKey)) {
        const listMappingKeys = {
            'EDIT_CATEGORY': 'category',
            'EDIT_TOILETRIES': 'toiletries',
            'EDIT_CHRISTMAS': 'christmas',
            'EDIT_MISC': 'misc',
            'EDIT_DISPATCH': 'dispatch'
        };
        launchListEditorWorkspace(listMappingKeys[optionKey]);
        return;
    }

    console.log(`🔓 Admin option authorized & executed instantly: [${optionKey}]`);
    executeValidatedAdminAction(optionKey);
}

function pressKioskKey(keyCharacter) {
    const inputField = document.getElementById('admin-password-input');
    if (!inputField) return;
    let targetChar = isKioskShiftActive ? keyCharacter.toUpperCase() : keyCharacter.toLowerCase();
    if (inputField.value.length < 16) inputField.value += targetChar;
}

function backspaceKioskKey() {
    const inputField = document.getElementById('admin-password-input');
    if (inputField && inputField.value.length > 0) inputField.value = inputField.value.slice(0, -1);
}

function toggleKioskShift() {
    isKioskShiftActive = !isKioskShiftActive;
    const shiftBtn = document.getElementById('kbd-shift-btn');
    const letterKeys = document.querySelectorAll('.letter-key');
    if (shiftBtn) shiftBtn.style.backgroundColor = isKioskShiftActive ? '#4cd964' : '#90caf9';
    letterKeys.forEach(key => {
        key.textContent = isKioskShiftActive ? key.textContent.toUpperCase() : key.textContent.toLowerCase();
    });
}

function submitAdminPasswordVerification() {
    const inputField = document.getElementById('admin-password-input');
    const errorSlot = document.getElementById('admin-auth-error-msg');
    if (!inputField) return;
    
    const pwd = inputField.value;
    const triggerInlineError = (msg) => {
        if (errorSlot) { errorSlot.textContent = msg; errorSlot.style.display = 'block'; }
        inputField.value = '';
    };

    if (pwd.length < 8 || pwd.length > 16) return triggerInlineError('REJECTED: Password must be 8-16 characters!');
    if (!/[A-Z]/.test(pwd)) return triggerInlineError('REJECTED: Missing an UPPERCASE letter!');
    if (!/[a-z]/.test(pwd)) return triggerInlineError('REJECTED: Missing a lowercase letter!');
    if (!/[0-9]/.test(pwd)) return triggerInlineError('REJECTED: Missing a number digit!');
    if (pwd !== adminSystemPassword) return triggerInlineError('ACCESS DENIED: Incorrect password!');

    console.log(`🔓 ACCESS GRANTED for execution key payload target: [${pendingAdminOptionKey}]`);
    document.getElementById('admin-auth-modal').style.setProperty('display', 'none', 'important');
    
    executeValidatedAdminAction(pendingAdminOptionKey);
    pendingAdminOptionKey = null; 
}

function cancelAdminPasswordVerification() {
    const authModal = document.getElementById('admin-auth-modal');
    if (authModal) { authModal.style.setProperty('display', 'none', 'important'); authModal.classList.add('modal-hide'); }
    pendingAdminOptionKey = null;
}

function syncKioskBackgroundState() {
    const mainWrapper = document.getElementById('main-app-wrapper');
    // Maintain deep purple for admin modes, and return to standard rich green for your home matrix screen
    const targetColor = (currentActiveWorkspaceMode === 'ADMIN_PURPLE' || isAdminMultiplesModeActive) ? '#7851A9' : '#1b5e20';
    
    document.body.style.backgroundColor = targetColor;
    if (mainWrapper) {
        mainWrapper.style.setProperty('background-color', targetColor, 'important');
        mainWrapper.style.setProperty('background', targetColor, 'important');
    }
}

function executeValidatedAdminAction(actionKey) {
    if (actionKey === 'CLOSE_PROGRAM') {
        setTimeout(() => { window.open('', '_self', ''); window.close(); window.location.href = 'about:blank'; }, 500);
        return;
    }
    
    if (actionKey === 'TOGGLE_ROW4') {
    // Toggle the release parameter directly
    kioskConfig.isFourthYearReleased = !kioskConfig.isFourthYearReleased;
        
    // Sync checkmark visually to match the user's intent perfectly
    const row4Checkbox = document.getElementById('admin-toggle-row4');
    if (row4Checkbox) row4Checkbox.checked = kioskConfig.isFourthYearReleased;
        
    generateDynamicGrid(); 
    saveKioskConfigurationState();
    return;
    }
   
    if (actionKey === 'TOGGLE_CONFIRM') {
        kioskConfig.showPrintConfirmation = !kioskConfig.showPrintConfirmation;
        
        const confirmCheckbox = document.getElementById('admin-toggle-confirm');
        if (confirmCheckbox) confirmCheckbox.checked = kioskConfig.showPrintConfirmation;
        
        saveKioskConfigurationState();
        return;
    }

    if (actionKey === 'MULTIPLES') {
        isAdminMultiplesModeActive = true;
        currentActiveWorkspaceMode = "ADMIN_PURPLE";
        handleAdminMenuSelection('EXIT');
        syncKioskBackgroundState();
        return;
    }

}

function triggerMultiplesQuantityOverlay() {
    multiplesCountTarget = 0; 
    const qtyDisplay = document.getElementById('admin-qty-display');
    if (qtyDisplay) qtyDisplay.value = "";
    
    document.getElementById('multiples-modal-title').textContent = "Set Print Quantity";
    document.getElementById('multiples-qty-zone').style.display = 'flex';
    document.getElementById('multiples-fork-zone').style.display = 'none';
    
    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.classList.remove('modal-hide');
        multiplesModal.style.setProperty('display', 'flex', 'important');
    }
}

function pressQtyPadKey(digitString) {
    const qtyDisplay = document.getElementById('admin-qty-display');
    if (!qtyDisplay) return;
    
    // Prevent starting a multi-digit number with a leading zero
    if (qtyDisplay.value === "" && digitString === "0") {
        return;
    }
    
    // Allow direct consecutive appending up to 2 physical numeric characters
    if (qtyDisplay.value.length < 2) {
        qtyDisplay.value += digitString;
    }
    
    let currentParsedValue = parseInt(qtyDisplay.value) || 1;
    if (currentParsedValue > 50) {
        qtyDisplay.value = "50";
        currentParsedValue = 50;
    }
    multiplesCountTarget = currentParsedValue;
}

function clearQtyPadEntry() {
    const qtyDisplay = document.getElementById('admin-qty-display');
    if (qtyDisplay) qtyDisplay.value = "";
    multiplesCountTarget = 0;
}

function confirmMultiplesQuantityRun() {
    // 🚀 EXECUTE PRINT LOOP NOW: Fires the target count collected by the keypad sliders
    if (lastExecutedPrintPayload) {
        executePhysicalPrintSpooler(lastExecutedPrintPayload, multiplesCountTarget);
    }

    // 🧼 CLEAN-UP: Instantly find and remove the standard print confirmation overlay if it popped up
    const universalOverlay = document.getElementById('kiosk-universal-overlay');
    if (universalOverlay) {
        universalOverlay.remove();
    }

    // Strip active background animation queue safely
    const mainWrapper = document.getElementById('main-app-wrapper');
    if (mainWrapper) {
        mainWrapper.classList.remove('printing-active-state');
    }

    document.getElementById('multiples-modal-title').textContent = "Print Job Dispatched";
    document.getElementById('multiples-qty-zone').style.display = 'none';
    document.getElementById('multiples-fork-zone').style.display = 'flex';
}

function handleContinuityChoice(choiceType) {
    const multiplesModal = document.getElementById('admin-multiples-modal');
    const monthView = document.getElementById('month-selection-view');
    
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }

    if (choiceType === 'SAME') {
        setTimeout(triggerMultiplesQuantityOverlay, 150);
    } else {
        // For FRESH_PURPLE, EXIT_GREEN, or standard prints, clear views completely and drop cleanly to Home Screen
        if (!monthView.classList.contains('screen-hide')) {
            // Clear Month Selection Workspace elements
            monthView.style.setProperty('display', 'none', 'important');
            monthView.classList.add('screen-hide');
            
            // Un-hide Month Action in sidebars if previously cleared out
            const monthsActionWrapper = document.getElementById('sidebar-months-action-wrapper');
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
        }
        
        if (choiceType === 'EXIT_GREEN') {
            isAdminMultiplesModeActive = false;
            currentActiveWorkspaceMode = "STANDARD_GREEN";
        }
        
        // Trigger a force route all the way back to main categories matrix array
        const workspaceView = document.getElementById('workspace-view');
        if (workspaceView) {
            workspaceView.style.setProperty('display', 'none', 'important');
            workspaceView.classList.add('screen-hide');
        }
        
        const homeGrid = document.getElementById('home-category-grid');
        const homeDeck = document.getElementById('deck-home-actions');
        const screen2Deck = document.getElementById('deck-screen2-nav');
        
        if (homeGrid && homeDeck && screen2Deck) {
            screen2Deck.classList.add('screen-hide');
            homeGrid.style.setProperty('display', 'grid', 'important');
            homeDeck.style.setProperty('display', 'flex', 'important');
        }
        
        syncKioskBackgroundState();
    }
}

/**
 * Resolves the 4-year industrial color mapping assignments
 */
function resolveYearThemeHexColor(targetYear) {
    const remainder = targetYear % 4;
    if (remainder === 2) return '#ffcdd2';      // Pink
    if (remainder === 3) return '#a5d6a7';      // Green
    if (remainder === 0) return '#fff59d';      // Yellow
    return '#81d4fa';                           // Blue
}

/**
 * Handles toggling between Current and Next Year scopes on the Months layout
 */
function selectMonthTargetYear(yearScopeKey) {
    const systemDate = new Date();
    const systemYear = systemDate.getFullYear();
    
    monthActiveTargetYearInt = (yearScopeKey === 'CURRENT') ? systemYear : (systemYear + 1);
    
    const currentBtn = document.getElementById('btn-month-current-year');
    const nextBtn = document.getElementById('btn-month-next-year');
    
    if (currentBtn && nextBtn) {
        currentBtn.textContent = systemYear;
        nextBtn.textContent = systemYear + 1;
        
        currentBtn.classList.remove('year-selected-focus');
        nextBtn.classList.remove('year-selected-focus');
        
        currentBtn.style.backgroundColor = resolveYearThemeHexColor(systemYear);
        nextBtn.style.backgroundColor = resolveYearThemeHexColor(systemYear + 1);
        
        const targetBtn = (yearScopeKey === 'CURRENT') ? currentBtn : nextBtn;
        targetBtn.classList.add('year-selected-focus');
    }
    
    rebuildMonthCellsValidationAesthetics();
}

/**
 * Validates calendars and dynamic boundary frames to flag expired cells
 */
function rebuildMonthCellsValidationAesthetics() {
    const systemDate = new Date();
    const systemYear = systemDate.getFullYear();
    const systemMonthIndex = systemDate.getMonth();
    
    const themeColor = resolveYearThemeHexColor(monthActiveTargetYearInt);
    
    for (let mIdx = 0; mIdx < 12; mIdx++) {
        const cellButton = document.getElementById(`m-cell-${mIdx}`);
        if (!cellButton) continue;
        
        let isExpired = false;
        let isShortDate = false;
        
        if (monthActiveTargetYearInt < systemYear) {
            isExpired = true;
        } else if (monthActiveTargetYearInt === systemYear) {
            if (mIdx < systemMonthIndex) isExpired = true;
        }
        
        if (!isExpired) {
            const offset = ((monthActiveTargetYearInt - systemYear) * 12) + mIdx - systemMonthIndex;
            if (offset >= 0 && offset <= shortDatePeriod) isShortDate = true;
        }
        
                cellButton.classList.remove('month-inactive');
        
        // Force every cell to take the active year color first
        cellButton.style.backgroundColor = themeColor;
        
        // If it's expired or short-date, apply the inactive overlay rule
        if (isExpired || isShortDate) {
            cellButton.classList.add('month-inactive');
        }

    }
}

/**
 * Formats data models and coordinates submissions to physical printer channels
 */
function handleMonthGridCellClick(monthIndexInt) {
    const word1 = document.getElementById('month-cat-word1').textContent.trim();
    const word2 = document.getElementById('month-cat-word2').textContent.trim();
    const monthName = fullMonthNamesMap[monthIndexInt];
    
    const isPurpleActive = (currentActiveWorkspaceMode === 'ADMIN_PURPLE' || isAdminMultiplesModeActive);
    let targetColorTrackingString = "green";
    const yearColorHex = resolveYearThemeHexColor(monthActiveTargetYearInt);
    
    const targetRemainder = monthActiveTargetYearInt % 4;
    if (targetRemainder === 2) targetColorTrackingString = 'pink';
    else if (targetRemainder === 3) targetColorTrackingString = 'green';
    else if (targetRemainder === 0) targetColorTrackingString = 'yellow';
    else if (targetRemainder === 1) targetColorTrackingString = 'blue';

    // Pack payload matching templates routing profiles cleanly
    lastExecutedPrintPayload = {
        color: targetColorTrackingString,
        cwrd1: word1,
        cwrd2: word2,
        q: "MM", // Marker flag indicating Month template processing configurations
        year: monthActiveTargetYearInt,
        m1: monthName, // Pass targeted full month name straight into standard M1 slot
        m2: " ",
        m3: " ",
        finalHex: yearColorHex,
        finalPeriod: monthName
    };

    if (isPurpleActive) {
        console.log("📌 Admin Months Intercept: Loading quantity matrix keypad panels.");
        triggerMultiplesQuantityOverlay();
    } else {
        console.log("🟢 Normal User Month Run: Dispatching single print target job.");
        executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);
    }
}

/**
 * Fetches targeted array content from server storage and populates editor input forms
 */

// Universal JSON Multi-Field State Trackers
let currentListSchemaDataArray = []; // Stores live array of objects fetched from disk
let activeFocusedFieldKey = "line1"; // Active sub-field typing path: 'line1', 'line2', 'image'

/**
 * Stage 5 Suite Launcher: Streams object schemas, maps lengths, and updates label colors
 */
function launchListEditorWorkspace(listFileKey) {
    activeEditorFileKey = listFileKey;
    activeFocusedInputId = null;
    activeFocusedFieldKey = "line1";
    currentListSchemaDataArray = [];
    
    // Reset our canvas preview display inputs
    document.getElementById('editor-input-line1').value = "";
    document.getElementById('editor-input-line2').value = "";
    document.getElementById('editor-input-image').value = "";
    document.getElementById('editor-active-index-badge').value = "1";
    
    // Synchronise title banner text cleanly
    const visualHeaderTitles = {
        'category': 'CATEGORY LABELS LIST',
        'toiletries': 'TOILETRIES LABELS LIST',
        'christmas': 'CHRISTMAS LABELS LIST',
        'misc': 'MISCELLANEOUS LABELS LIST',
        'dispatch': 'DISPATCH LABELS LIST'
    };
    document.getElementById('list-editor-title-banner').textContent = visualHeaderTitles[listFileKey] || "LABELS LIST";

    // Set rigid length caps matching industrial device specifications
    const maxBoundaryCaps = { 'category': 35, 'toiletries': 14, 'christmas': 14, 'misc': 7, 'dispatch': 48 };
    const currentTargetListCap = maxBoundaryCaps[listFileKey] || 35;

    // DYNAMIC CARD LAYER ASSEMBLY: Applies theme colors onto the single unified label surface block
    const unifiedSurfaceCard = document.getElementById('unified-card-surface-block');
    const targetLabelHexFillColor = (listFileKey === 'category') ? "#FFF4C2" : "#FFFFFF";
    
    // 1. Shift the master card rectangle background color
    if (unifiedSurfaceCard) {
        unifiedSurfaceCard.style.backgroundColor = targetLabelHexFillColor;
    }

    // 2. Ensure the individual entry fields retain transparent backgrounds so they blend into the card
    const targetLabelElements = [
        'editor-input-line1', 
        'editor-input-line2', 
        'editor-input-image', 
        'editor-preview-pane-container-layer'
    ];

    targetLabelElements.forEach(elementId => {
        const itemEl = document.getElementById(elementId);
        if (itemEl) {
            itemEl.style.backgroundColor = "transparent";
        }
    });

    fetch(`http://localhost:8080/api/list?name=${listFileKey}`)
        .then(res => res.json())
        .then(serverPayloadArray => {
            // Guarantee perfect structural formatting and cushion padding up to max bounds
            for (let i = 0; i < currentTargetListCap; i++) {
                const item = serverPayloadArray[i] || {};
                currentListSchemaDataArray.push({
                    text1: (item.text1 || "").toString().trim().toUpperCase(),
                    text2: (item.text2 || "").toString().trim().toUpperCase(),
                    image_file: (item.image_file || (listFileKey === 'dispatch' ? "" : "blank.jpg")).toString().trim()
                });
            }
            
            // Re-render the right pane selection list stream seamlessly
            rebuildPlaylistVisualStreamContainer();

            // Toggle dashboard screen states safely
            document.getElementById('admin-settings-view').style.setProperty('display', 'none', 'important');
            const workspace = document.getElementById('admin-list-editor-workspace');
            workspace.classList.remove('screen-hide');
            workspace.style.setProperty('display', 'block', 'important');

            // Default focus the very first index cell automatically on interface generation
            setEditorInputFocus(0);
        })
        .catch(err => {
            console.error("❌ Failed to stream configuration database arrays:", err);
            alert("CRITICAL ERROR: UNABLE TO ACCESS LIVE NETWORK TARGET STORAGE");
        });
}

/**
 * Re-orders visual highlights and maps objects contents to active canvas elements
 */
function setEditorInputFocus(targetSlotIndex) {
    if (targetSlotIndex < 0 || targetSlotIndex >= currentListSchemaDataArray.length) return;

    // Drop historical focus outlines across all row buttons smoothly
    const historicElements = document.querySelectorAll('.playlist-stream-row-btn');
    historicElements.forEach(el => {
        el.style.backgroundColor = "#FFFFFF";
        el.style.borderColor = "#7851A9";
    });

    activeFocusedInputId = targetSlotIndex;
    
    // Update numerical badge indicator tracking values (No Hash Symbol)
    document.getElementById('editor-active-index-badge').value = targetSlotIndex + 1;

    const targetObjectData = currentListSchemaDataArray[targetSlotIndex];
    
    // Map current text metrics straight to editing inputs bars
    document.getElementById('editor-input-line1').value = targetObjectData.text1;
    document.getElementById('editor-input-line2').value = targetObjectData.text2;
    document.getElementById('editor-input-image').value = targetObjectData.image_file;

    // Set prominent highlighted focus on targeted row matching mock-up soft green
    const activeRowElement = document.getElementById(`playlist-row-cell-id-${targetSlotIndex}`);
    if (activeRowElement) {
        activeRowElement.style.backgroundColor = "#a5d6a7";
        activeRowElement.style.borderColor = "#000000";
        activeRowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Retain targeted field sub-focus or fallback to line1
    setEditorFieldFocus(activeFocusedFieldKey || 'line1');
    refreshLiveWorkspaceCanvasPreviews();
}

/**
 * Focus Router: Shifts focus onto inputs and applies soft green shading relative to list type
 */
function setEditorFieldFocus(fieldKey) {
    activeFocusedFieldKey = fieldKey;
    
    const textEntryFields = ['line1', 'line2', 'image'];
    
    textEntryFields.forEach(key => {
        const fieldEl = document.getElementById(`editor-input-${key}`);
        if (fieldEl) {
            fieldEl.style.backgroundColor = "transparent";
            fieldEl.style.borderColor = "rgba(0, 0, 0, 0.2)"; // Soft default border
        }
    });

    // High contrast lookups for the active focused entry row box
    const activeInputTarget = document.getElementById(`editor-input-${fieldKey}`);
    if (activeInputTarget) {
        activeInputTarget.style.backgroundColor = "#a5d6a7";
        activeInputTarget.style.borderColor = "#000000"; // Sharp, solid black active border
    }
}

/**
 * Character Stream Proxy: Appends touches from the digital keyboard into the active object buffer
 */
function pressEditorKey(keyChar) {
    if (activeFocusedInputId === null || !activeFocusedFieldKey) return;
    
    const targetObject = currentListSchemaDataArray[activeFocusedInputId];
    let currentValue = "";
    
    // VARIABLE CHARACTER BOUNDARIES CONFIGURATION
    // 11 characters max for Category list, 13 characters max for Toiletries, Christmas, Miscellaneous
    let characterLimit = (activeEditorFileKey === 'category') ? 11 : 13;
    
    if (activeFocusedFieldKey === 'line1') {
        currentValue = targetObject.text1;
    } else if (activeFocusedFieldKey === 'line2') {
        currentValue = targetObject.text2;
    } else if (activeFocusedFieldKey === 'image') {
        currentValue = targetObject.image_file;
        characterLimit = 40; // Extended path name limit unchanged
    }
    
    // Force uppercase filtering for text entry slots
    let processedChar = (activeFocusedFieldKey === 'image') ? keyChar : keyChar.toUpperCase();
    
    if (currentValue.length < characterLimit) {
        let updatedValue = currentValue + processedChar;
        
        // Save state changes directly inside the live memory object matrix array
        if (activeFocusedFieldKey === 'line1') targetObject.text1 = updatedValue;
        else if (activeFocusedFieldKey === 'line2') targetObject.text2 = updatedValue;
        else if (activeFocusedFieldKey === 'image') targetObject.image_file = updatedValue;
        
        // Push string values visually onto active layout display inputs bars
        document.getElementById(`editor-input-${activeFocusedFieldKey}`).value = updatedValue;
        
        // Update the scrollable playlist row lookups dynamically
        synchronizePlaylistTextLineLabel(activeFocusedInputId);
        refreshLiveWorkspaceCanvasPreviews();
    }
}

/**
 * Backspace Processor: Remaps truncation requests down to active data strings
 */
function backspaceEditorKey() {
    if (activeFocusedInputId === null || !activeFocusedFieldKey) return;
    
    const targetObject = currentListSchemaDataArray[activeFocusedInputId];
    let currentValue = "";
    
    if (activeFocusedFieldKey === 'line1') currentValue = targetObject.text1;
    else if (activeFocusedFieldKey === 'line2') currentValue = targetObject.text2;
    else if (activeFocusedFieldKey === 'image') currentValue = targetObject.image_file;
    
    if (currentValue.length > 0) {
        let updatedValue = currentValue.slice(0, -1);
        
        if (activeFocusedFieldKey === 'line1') targetObject.text1 = updatedValue;
        else if (activeFocusedFieldKey === 'line2') targetObject.text2 = updatedValue;
        else if (activeFocusedFieldKey === 'image') targetObject.image_file = updatedValue;
        
        document.getElementById(`editor-input-${activeFocusedFieldKey}`).value = updatedValue;
        
        synchronizePlaylistTextLineLabel(activeFocusedInputId);
        refreshLiveWorkspaceCanvasPreviews();
    }
}

/**
 * Canvas Graphic Sync Controller: Drives real-time image asset previews inside the canvas
 */
function refreshLiveWorkspaceCanvasPreviews() {
    if (activeFocusedInputId === null) return;
    
    const currentObject = currentListSchemaDataArray[activeFocusedInputId];
    const frame1 = document.getElementById('editor-preview-graphic-frame-1');
    const frame2 = document.getElementById('editor-preview-graphic-frame-2');
    
    if (!frame1) return;
    
    let rawFilename = (currentObject.image_file || "").toString().trim();

    if (rawFilename === "" || rawFilename.toUpperCase() === "BLANK.JPG" || activeEditorFileKey === 'dispatch') {
        frame1.src = "label-graphics/blank.jpg";
        if (frame2) frame2.style.display = "none";
    } else {
        // Look up graphic files matching your global repository storage structures path
        frame1.src = `label-graphics/${rawFilename.toLowerCase()}`;
        
        // Graceful error recovery loop for broken file routes or typing states
        frame1.onerror = function() {
            frame1.src = "label-graphics/blank.jpg";
        };
        
        if (frame2) frame2.style.display = "none";
    }
}

/**
 * ENTER Key Controller: Commits structural adjustments and shifts focus dynamically
 */
function triggerEditorFieldCommit() {
    if (activeFocusedInputId === null) return;

    if (activeFocusedFieldKey === 'line1') {
        setEditorFieldFocus('line2');
    } else if (activeFocusedFieldKey === 'line2') {
        setEditorFieldFocus('image');
    } else {
        const nextRowIndex = activeFocusedInputId + 1;
        if (nextRowIndex < currentListSchemaDataArray.length) {
            setEditorInputFocus(nextRowIndex);
            setEditorFieldFocus('line1');
        } else {
            console.log("🏁 Reached the end of the editable pre-defined list array.");
        }
    }
}

/**
 * Visual Playlist Assembler: Builds row indicators explicitly omitting US-style '#' cross-hatches
 */
function rebuildPlaylistVisualStreamContainer() {
    const container = document.getElementById('list-editor-inputs-container');
    if (!container) return;

    let playlistHTML = "";
    currentListSchemaDataArray.forEach((item, index) => {
        let labelDisplaySummary = `${item.text1} ${item.text2}`.trim();
        if (labelDisplaySummary === "") labelDisplaySummary = "----- EMPTY SLOT -----";

        playlistHTML += `
        <button id="playlist-row-cell-id-${index}" class="playlist-stream-row-btn" onclick="setEditorInputFocus(${index})"
                style="display: flex; align-items: center; width: 100%; gap: 1vw; box-sizing: border-box; background-color: #FFFFFF; border: 2px solid #7851A9; border-radius: 8px; padding: 1.2vh 1vw; margin-bottom: 0.2vh; cursor: pointer; text-align: left; outline: none; transition: none;">
            <span style="font-weight: 900; color: #563380; font-size: 2.2vh; min-width: 2.5vw; text-align: right;">${index + 1}</span>
            <span id="playlist-text-label-node-${index}" style="font-weight: bold; color: #000000; font-size: 2.2vh; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${labelDisplaySummary}</span>
        </button>`;
    });

    container.innerHTML = playlistHTML;
}

/**
 * Text Synchronizer: Fast local update wrapper to refresh labels during live typing
 */
function synchronizePlaylistTextLineLabel(index) {
    const textLabelNode = document.getElementById(`playlist-text-label-node-${index}`);
    if (!textLabelNode) return;

    const item = currentListSchemaDataArray[index];
    let combinedSummary = `${item.text1} ${item.text2}`.trim();
    if (combinedSummary === "") combinedSummary = "----- EMPTY SLOT -----";

    textLabelNode.textContent = combinedSummary.toUpperCase();
}

/**
 * Playlist Shifter: Handles MOVE UP and MOVE DOWN sequential array swapping
 */
function executePlaylistItemShift(directionString) {
    if (activeFocusedInputId === null) return;

    const targetedSourceIndex = activeFocusedInputId;
    let targetedDestinationIndex = (directionString === 'UP') ? targetedSourceIndex - 1 : targetedSourceIndex + 1;

    if (targetedDestinationIndex < 0 || targetedDestinationIndex >= currentListSchemaDataArray.length) {
        console.log("🔒 Boundary blocked: Repositioning request falls outside active list range.");
        return;
    }

    let temporaryHolderObject = currentListSchemaDataArray[targetedSourceIndex];
    currentListSchemaDataArray[targetedSourceIndex] = currentListSchemaDataArray[targetedDestinationIndex];
    currentListSchemaDataArray[targetedDestinationIndex] = temporaryHolderObject;

    rebuildPlaylistVisualStreamContainer();
    setEditorInputFocus(targetedDestinationIndex);
}

/**
 * Playlist Insertion: Splices a fresh object row and shifts trailing entries down
 */
function executePlaylistItemInsert() {
    if (activeFocusedInputId === null) return;

    const targetInsertIndex = activeFocusedInputId;
    const finalSlotIndex = currentListSchemaDataArray.length - 1;
    const lastItemInList = currentListSchemaDataArray[finalSlotIndex];

    const isLastSlotEmpty = (lastItemInList.text1 === "" && lastItemInList.text2 === "");

    if (!isLastSlotEmpty) {
        alert("LIMIT REACHED: List boundaries are full. Delete an empty slot or item from the end before inserting.");
        return;
    }

    currentListSchemaDataArray.pop();

    const freshBlankObject = {
        text1: "",
        text2: "",
        image_file: (activeEditorFileKey === 'dispatch') ? "" : "blank.jpg"
    };

    currentListSchemaDataArray.splice(targetInsertIndex, 0, freshBlankObject);

    rebuildPlaylistVisualStreamContainer();
    setEditorInputFocus(targetInsertIndex);
}

/**
 * Playlist Deletion: Drops indices out of stream and appends dynamic balancing placeholders
 */
function executePlaylistItemDelete() {
    if (activeFocusedInputId === null) return;

    const targetDeleteIndex = activeFocusedInputId;
    currentListSchemaDataArray.splice(targetDeleteIndex, 1);

    const structuralBlankFallback = {
        text1: "",
        text2: "",
        image_file: (activeEditorFileKey === 'dispatch') ? "" : "blank.jpg"
    };
    currentListSchemaDataArray.push(structuralBlankFallback);

    rebuildPlaylistVisualStreamContainer();

    let adjustedFocusIndex = targetDeleteIndex;
    if (adjustedFocusIndex >= currentListSchemaDataArray.length) {
        adjustedFocusIndex = currentListSchemaDataArray.length - 1;
    }

    setEditorInputFocus(adjustedFocusIndex);
}

/**
 * Master API Sync: Posts multi-field arrays to backend storage daemon
 */
function saveActiveListEditorDataToDisk() {
    if (!activeEditorFileKey) return;

    fetch(`http://localhost:8080/api/list/save?name=${activeEditorFileKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentListSchemaDataArray)
    })
    .then(response => {
        if (!response.ok) throw new Error("Disk stream channel transmission timeout failure");
        return response.json();
    })
    .then(syncDataConfirmation => {
        console.log(`💾 Data-Driven array sync successful for [${activeEditorFileKey}]:`, syncDataConfirmation);
        exitListEditorWorkspace();
    })
    .catch(err => {
        console.error("❌ Critical server write sync error:", err);
        alert("CRITICAL STORAGE SYSTEM ERROR: FIELD DATA WRITE FAILURE STACKED");
    });
}

function exitListEditorWorkspace() {
    const editorWorkspace = document.getElementById('admin-list-editor-workspace');
    if (editorWorkspace) {
        editorWorkspace.style.setProperty('display', 'none', 'important');
        editorWorkspace.classList.add('screen-hide');
    }
    const adminView = document.getElementById('admin-settings-view');
    if (adminView) {
        adminView.classList.remove('screen-hide');
        adminView.style.setProperty('display', 'block', 'important');
    }
}

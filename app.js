// 1. Establish the base starting calendar year dynamically using the PC system clock
let currentYear = new Date().getFullYear();

// Global control variables for kiosk run modes
let shortDatePeriod = 1;
let isKioskShiftActive = false; 

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
    if (action === 'BACK') {
        const homeGrid = document.getElementById('home-category-grid');
        const workspaceView = document.getElementById('workspace-view');
        const homeDeck = document.getElementById('deck-home-actions');
        const screen2Deck = document.getElementById('deck-screen2-nav');

        if (homeGrid && workspaceView && homeDeck && screen2Deck) {
            workspaceView.style.setProperty('display', 'none', 'important');
            workspaceView.classList.add('screen-hide');
            screen2Deck.classList.add('screen-hide');
            
            homeGrid.style.setProperty('display', 'grid', 'important');
            homeDeck.style.setProperty('display', 'flex', 'important');
            
            // Keeps the screen purple if you are in admin multiples mode!
            syncKioskBackgroundState();
        }
    } else if (action === 'MONTHS') {
        alert('SYSTEM COMMAND:\nSwitching to Monthly Breakdown View');
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
        const activeModal = document.getElementById('kiosk-universal-overlay');
        if (activeModal) {
            activeModal.remove();
            
            // Clean queue animation safely once physical runtime block clears out
            const mainWrapper = document.getElementById('main-app-wrapper');
            if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
            
            if (type === 'PRINT_CONFIRM') sidebarAction('BACK');
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
            
            // Clear the 5-column distortion cleanly
            homeGrid.style.removeProperty('grid-template-columns');
            homeGrid.style.setProperty('display', 'grid', 'important');
            
            homeDeck.style.setProperty('display', 'flex', 'important');
            document.body.style.backgroundColor = isAdminMultiplesModeActive ? '#7851A9' : '#1b5e20';
        }
        return;
    }

    // Intercept toggles cleanly and return early to stop double-execution loops
    if (optionKey === 'TOGGLE_ROW4' || optionKey === 'TOGGLE_CONFIRM') {
        executeValidatedAdminAction(optionKey);
        return;
    }

    // Standard administrative suite password gates process normally here
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
    const TargetColor = isAdminMultiplesModeActive ? '#7851A9' : '#1b5e20';
    
    document.body.style.backgroundColor = TargetColor;
    if (mainWrapper) {
        mainWrapper.style.setProperty('background-color', TargetColor, 'important');
        mainWrapper.style.setProperty('background', TargetColor, 'important');
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
    
    if (qtyDisplay.value === "1" && digitString !== "0") {
        qtyDisplay.value = "";
    } else if (qtyDisplay.value === "1" && digitString === "0") {
        return;
    }
    
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

    document.getElementById('multiples-modal-title').textContent = "Print Job Dispatched";
    document.getElementById('multiples-qty-zone').style.display = 'none';
    document.getElementById('multiples-fork-zone').style.display = 'flex';
}

function handleContinuityChoice(choiceType) {
    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }

    if (choiceType === 'SAME') {
        setTimeout(triggerMultiplesQuantityOverlay, 150);
    } else if (choiceType === 'FRESH_PURPLE') {
        sidebarAction('BACK');
    } else if (choiceType === 'EXIT_GREEN') {
        isAdminMultiplesModeActive = false;
        syncKioskBackgroundState();
        sidebarAction('BACK');
    }
}

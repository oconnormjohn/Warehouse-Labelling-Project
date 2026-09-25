// ==========================================================================
// CORE STATE-AWARE KIOSK CORE SYSTEM TRACKERS
// ==========================================================================
// 🚀 STATE ENGINE RECONSTRUCTION: Explicit page index tracker matching the sitemap
let currentActiveScreen = "1"; // Options: "1", "2", "3", "1A", "2A", "3A", "4", "5", "6", "7"
let currentActiveWorkspaceMode = "STANDARD_GREEN"; // Options: STANDARD_GREEN, ADMIN_PURPLE, PLAIN_MODE, DISPATCH_MODE

// Global calendar tracking parameters
let currentYear = new Date().getFullYear();
let shortDatePeriod = 1;
let monthActiveTargetYearInt = null;
let isKioskShiftActive = false; 

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
    isFourthYearReleased: true,
    showPrintConfirmation: true,
    securityPin: "1234",
    shortDatePeriod: 1,
    isDemoModeActive: false // 🌟 NEW PARAMETER BOUND TO THE SERVER CORE CONFIG DATA OBJECT
};

// ==========================================================================
// WORKSPACE MODES & PROCESSING TRACKERS
// ==========================================================================
let isDemoModeActive = false;           
let isAdminMultiplesModeActive = false; 
let multiplesCountTarget = 1;          
let lastExecutedPrintPayload = null;    

// Hardcoded legacy administrative secondary menu backup password
let adminSystemPassword = "DCPdrum1";
let pendingAdminOptionKey = null; 

// Structural row class names matching your palette mappings
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// ==========================================================================
// CENTRALIZED STATE ENGINE CONTROLLER (THE CENTRAL STATE ROUTER)
// ==========================================================================
function switchKioskScreenLayout(targetScreenName) {
    currentActiveScreen = targetScreenName;
    console.log(`🎛️ State Machine Transition: Moving to Screen [${targetScreenName}]`);

    const mainWrapper = document.getElementById('main-app-wrapper');
    const sidebarContainer = document.querySelector('.sidebar-container');
    
    const homeTrack = document.getElementById('home-category-workspace-track');
    const workspaceView = document.getElementById('workspace-view');
    const monthView = document.getElementById('month-selection-view');
    const adminView = document.getElementById('admin-settings-view');
    const editorWorkspace = document.getElementById('admin-list-editor-workspace');
    const dispatchView = document.getElementById('dispatch-labels-view');

    const homeDeck = document.getElementById('deck-home-actions');
    const screen2Deck = document.getElementById('deck-screen2-nav');
    const monthsActionWrapper = document.getElementById('sidebar-months-action-wrapper');
    const sidebarCloseBtn = document.getElementById('sidebar-close-program-wrapper');
    const multiprintBtn = document.getElementById('sidebar-btn-multiprint');
    
    // 🚚 DECLARED ONCE HERE: Prevents duplicate variable definition crashes
    const dispatchBlankBtn = document.getElementById('sidebar-dispatch-blank-wrapper');

    // 🧼 PHASE 1: IRONCLAD UNIFORM SCREEN CLEANUP SWEEP
    const allContainers = [homeTrack, workspaceView, monthView, adminView, editorWorkspace, dispatchView];
    allContainers.forEach(container => {
        if (container) {
            container.classList.add('screen-hide');
            container.style.removeProperty('display');
        }
    });

    // Reset baseline sidebar element visibility defaults
    if (sidebarContainer) sidebarContainer.classList.remove('screen-hide');
    if (homeDeck) homeDeck.style.setProperty('display', 'none', 'important');
    if (screen2Deck) screen2Deck.classList.add('screen-hide');
    if (monthsActionWrapper) monthsActionWrapper.style.setProperty('display', 'none', 'important');
    if (sidebarCloseBtn) sidebarCloseBtn.style.setProperty('display', 'none', 'important');
    if (multiprintBtn) multiprintBtn.style.setProperty('display', 'none', 'important');
    
    // Default the blank dispatch button to hidden state across baseline transitions
    if (dispatchBlankBtn) dispatchBlankBtn.style.setProperty('display', 'none', 'important');

    // 🎨 PHASE 2: DETERMINISTIC ENVIRONMENT & PATHWAY RESOLUTION
    if (["1A", "2A", "3A", "6", "7"].includes(targetScreenName)) {
        currentActiveWorkspaceMode = "ADMIN_PURPLE";
    } else if (targetScreenName === "4") {
        currentActiveWorkspaceMode = "PLAIN_MODE";
    } else if (targetScreenName === "5") {
        currentActiveWorkspaceMode = "DISPATCH_MODE";
    } else {
        currentActiveWorkspaceMode = "STANDARD_GREEN";
    }

    const targetBgColor = (currentActiveWorkspaceMode === "ADMIN_PURPLE") ? '#7851A9' : '#1b5e20';
    document.body.style.backgroundColor = targetBgColor;
    if (mainWrapper) mainWrapper.style.setProperty('background-color', targetBgColor, 'important');

    // 🎛️ PHASE 3: SCREEN-SPECIFIC STRUCTURAL INJECTION MATCHING SITEMAP TRANSITIONS
    switch (targetScreenName) {
        case "1": // Screen 1 Home Screen (Standard Single Categories Selection)
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (homeDeck) homeDeck.style.setProperty('display', 'flex', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "1A": // Screen 1A Category Selection Screen (Administrative Multi-Print Run)
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = true;
            break;

        case "2": // Screen 2 Qtr-Year Selection Screen (Standard Single-Print Matrix)
            if (workspaceView) workspaceView.classList.remove('screen-hide');
            if (workspaceView) workspaceView.style.setProperty('display', 'flex', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
            isAdminMultiplesModeActive = false;
            break;

        case "2A": // Screen 2A Qtr-Year Selection Screen (Administrative Multi-Print Matrix)
            if (workspaceView) workspaceView.classList.remove('screen-hide');
            if (workspaceView) workspaceView.style.setProperty('display', 'flex', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
            isAdminMultiplesModeActive = true;
            break;

        case "3": // Screen 3 Month Selection Screen (Standard Single-Print View)
            if (monthView) monthView.classList.remove('screen-hide');
            if (monthView) monthView.style.setProperty('display', 'flex', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = false;
            break;

        case "3A": // Screen 3A Month Selection Screen (Administrative Multi-Print View)
            if (monthView) monthView.classList.remove('screen-hide');
            if (monthView) monthView.style.setProperty('display', 'flex', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = true;
            break;

        case "4": // Screen 4 Plain Labels Selection Workspace
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = false;
            break;

        case "5": // Screen 5 Dispatch Labels Grid Workspace
            if (dispatchView) dispatchView.classList.remove('screen-hide');
            if (dispatchView) dispatchView.style.setProperty('display', 'flex', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            
            // 🚛 VISIBILITY CONTROL: Unhide the blank print controller ONLY on screen 5
            if (dispatchBlankBtn) dispatchBlankBtn.style.setProperty('display', 'block', 'important');
            
            isAdminMultiplesModeActive = false;
            break;

        case "6": // Screen 6 Administrative Control Twin-Settings Panels Dashboard
            if (adminView) adminView.classList.remove('screen-hide');
            if (adminView) adminView.style.setProperty('display', 'grid', 'important');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (sidebarCloseBtn) sidebarCloseBtn.style.setProperty('display', 'block', 'important');
            if (multiprintBtn) multiprintBtn.style.setProperty('display', 'block', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "7": // Screen 7 Fullscreen Three-Pane Management List Editing Suite
            if (editorWorkspace) editorWorkspace.classList.remove('screen-hide');
            if (editorWorkspace) editorWorkspace.style.setProperty('display', 'block', 'important');
            if (sidebarContainer) sidebarContainer.classList.add('screen-hide');
            isAdminMultiplesModeActive = false;
            break;
    }
}

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
            
            // SYNC TRACKING VARIABLE: Force global variables to match config profile
            shortDatePeriod = kioskConfig.shortDatePeriod !== undefined ? kioskConfig.shortDatePeriod : 1;
            isDemoModeActive = kioskConfig.isDemoModeActive !== undefined ? kioskConfig.isDemoModeActive : false; // 🌟 SYNC GLOBAL VARIABLE FROM DISK
            
            // Automatically set the graphical checkbox switch check mark handle on startup
            const demoCheckbox = document.getElementById('admin-toggle-demo');
            if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;

            // Rebuild matrix layouts cleanly using the newly retrieved data parameters
            generateDynamicGrid();
            loadHomeMatrixCategories();
            console.log("⚙️ Kiosk configuration loaded successfully from server disk.");
        })
        .catch(e => {
            console.warn("⚠️ Local network config fetch failed, relying on defaults:", e);
            
            // Reassign tracking variables from defaults if server drops
            isDemoModeActive = kioskConfig.isDemoModeActive;
            const demoCheckbox = document.getElementById('admin-toggle-demo');
            if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;

            generateDynamicGrid();
            
            // RUN FALLBACK TRIGGER: Run anyway if network drops so page doesn't open blank
            loadHomeMatrixCategories(); 
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

// Fetch category database array and dynamically stream buttons onto the Home matrix grid
function loadHomeMatrixCategories() {
    const homeGrid = document.getElementById('home-category-grid');
    if (!homeGrid) return;

    fetch('http://localhost:8080/api/list?name=category')
        .then(res => {
            if (!res.ok) throw new Error("Category database missing or unreachable.");
            return res.json();
        })
        .then(categoryDataArray => {
            let matrixHTML = '';

            // Strictly cycle through all 35 physical standalone kiosk button slots
            for (let index = 0; index < 35; index++) {
                // If database slot exists and has text, retrieve it; otherwise use blank layout placeholders
                const slotItem = categoryDataArray[index] || {};
                const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
                const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
                
                // Combine multi-word configurations cleanly with a space to replicate historical strings
                let displayLabelSummary = `${line1Text} ${line2Text}`.trim();
                let graphicFile = (slotItem.image_file || "blank.jpg").toString().trim().toLowerCase();

                // If the entire data entry slot is empty, leave it clean and blank without numbers
                let inlineHomeBgOverride = "";
                if (displayLabelSummary === "") {
                    displayLabelSummary = "";
                    graphicFile = "categoryblank.png";
                    // Slide the brightness notch down a fraction specifically for empty home cells
                    inlineHomeBgOverride = "background-color: #EFE6BA !important;";
                }

                // ALL 35 active slots listen to database inputs natively and feed state tracker
                matrixHTML += `
                    <button class="home-cat-btn" style="${inlineHomeBgOverride}" onclick="handleHomeCategoryMatrixClick(this)">
                        <span class="btn-text">${displayLabelSummary}</span>
                        <img src="label-graphics/${graphicFile}" class="btn-icon" alt="Icon">
                    </button>`;
            }

            homeGrid.innerHTML = matrixHTML;
            console.log("📦 Stage 1 Home Category Matrix populated dynamically from JSON.");
        })
        .catch(err => {
            console.error("❌ Failed to stream home category database:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO LOAD CATEGORIES FROM DISK' }, 4000);
        });
}
// Phase A: Parallel data stream combiner for unified Plain Labels mode (Screen 4)
function loadPlainLabelsMatrix() {
    console.log("🔄 Initiating parallel fetch loop for Plain Labels datasets...");

    // Fire all three disk storage requests simultaneously
    Promise.all([
        fetch('http://localhost:8080/api/list?name=toiletries').then(res => res.json()),
        fetch('http://localhost:8080/api/list?name=christmas').then(res => res.json()),
        fetch('http://localhost:8080/api/list?name=misc').then(res => res.json())
    ])
    .then(([toiletriesArray, christmasArray, miscArray]) => {
        let consolidatedPlainItems = [];

        // 1. Map Toiletries data to Slots 1-14 (Indices 0 - 13)
        for (let i = 0; i < 14; i++) {
            consolidatedPlainItems.push(toiletriesArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }

        // 2. Map Christmas data to Slots 15-28 (Indices 14 - 27)
        for (let i = 0; i < 14; i++) {
            consolidatedPlainItems.push(christmasArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }

        // 3. Map Miscellaneous data to Slots 29-35 (Indices 28 - 34)
        for (let i = 0; i < 7; i++) {
            consolidatedPlainItems.push(miscArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }

        console.log("✅ Phase A Complete: Consolidated 35 data rows securely in memory.");
        
        // 🔗 PHASE A TO B BRIDGE HANDOVER
        renderPlainLabelsMatrixContainer(consolidatedPlainItems);

    })
    .catch(error => {
        console.error("❌ Plain Labels data consolidation loop crashed:", error);
        showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO CONSOLIDATE PLAIN DATA LISTS' }, 4000);
    });
}

// Phase B: Draw the consolidated plain items matrix directly onto the home selection grid
function renderPlainLabelsMatrixContainer(consolidatedItemsArray) {
    const homeGrid = document.getElementById('home-category-grid');
    if (!homeGrid) return;

    let plainMatrixHTML = '';

    // Walk through all 35 allocated category slots sequentially
    consolidatedItemsArray.forEach((slotItem, index) => {
        const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
        const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
        
        let displayLabelSummary = `${line1Text} ${line2Text}`.trim();
        
        // 🔒 INDUSTRIAL RESET: Default explicitly to your clean transparent file first
        let graphicFile = "categoryblank.png";

        // Only look up the database filename if the slot actually contains active text labels
        if (displayLabelSummary !== "") {
            let rawFile = (slotItem.image_file || "categoryblank.png").toString().trim().toLowerCase();
            if (rawFile !== "" && rawFile !== "categoryblank.jpg") {
                graphicFile = rawFile;
            }
        }

        // Determine the background color: Crisp white for active labels, ultra-soft grey for empty slots
        const inlinePlainBgColor = (displayLabelSummary !== "") ? "#FFFFFF" : "#F4F4F4";

        // UK SYSTEM PROFILE OVERRIDE: Enforce pristine text cards and soft grey relief boundaries
        plainMatrixHTML += `
            <button class="home-cat-btn" 
                    style="background-color: ${inlinePlainBgColor} !important; box-shadow: 0px 0.5vh 0px rgba(0,0,0,1) !important;" 
                    onclick="handlePlainMatrixCellClick(this)">
                <span class="btn-text" style="font-size: 2.2vh !important; line-height: 1.0 !important;">${displayLabelSummary}</span>
                <img src="label-graphics/${graphicFile}" class="btn-icon" alt="Icon">
            </button>`;
    });

    homeGrid.innerHTML = plainMatrixHTML;
    console.log("🎨 Phase B Complete: Plain Labels matrix canvas drawn with strict icon isolation.");
}
// Dedicated click handler for Plain Mode that captures labels and splits text fields natively
function handlePlainMatrixCellClick(buttonElement) {
    const textElement = buttonElement.querySelector('.btn-text');
    const rawPlainLabelText = textElement ? textElement.textContent.trim() : '';
    if (rawPlainLabelText === "") return;

    const imgElement = buttonElement.querySelector('.btn-icon');
    let dynamicImageFilename = "blank.png";
    if (imgElement) {
        const srcParts = imgElement.src.split('/');
        dynamicImageFilename = srcParts[srcParts.length - 1];
    }

    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    const wordsArray = rawPlainLabelText.split(/[\s-]+/);

    if (slot1 && slot2) {
        if (wordsArray.length > 1) {
            slot1.textContent = wordsArray[0].toUpperCase();
            slot2.textContent = wordsArray.slice(1).join('-').toUpperCase();
        } else {
            slot1.textContent = rawPlainLabelText.toUpperCase();
            slot2.textContent = '';
        }
    }

    lastExecutedPrintPayload = {
        color: "plain",
        cwrd1: slot1.textContent,
        cwrd2: slot2.textContent,
        q: "PL",
        year: " ",
        m1: dynamicImageFilename,
        m2: " ",
        m3: " ",
        finalHex: "#FFFFFF",
        finalPeriod: " "
    };

    triggerMultiplesQuantityOverlay();
}

// Dedicated click handler mapping banner text splits and driving state transitions cleanly
function handleHomeCategoryMatrixClick(buttonElement) {
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');

    const textElement = buttonElement.querySelector('.btn-text');
    const rawCategoryText = textElement ? textElement.textContent.trim() : '';
    if (rawCategoryText === "" || rawCategoryText.toUpperCase().includes("SPACER") || rawCategoryText.toUpperCase() === "BLANK") return;

    const wordsArray = rawCategoryText.split(/[\s-]+/);

    if (slot1 && slot2) {
        if (wordsArray.length > 1) {
            slot1.textContent = wordsArray[0].toUpperCase();
            slot2.textContent = wordsArray.slice(1).join('-').toUpperCase();
        } else {
            slot1.textContent = rawCategoryText.toUpperCase();
            slot2.textContent = '';
        }
    }

    // 🚀 STATE SWITCH: Check mode and transition to the correct Date Grid seamlessly
    if (isAdminMultiplesModeActive) {
        switchKioskScreenLayout("2A"); // Move to Screen 2A (Admin Multi-Print Date Matrix)
    } else {
        switchKioskScreenLayout("2");  // Move to Screen 2 (Standard Single-Print Date Matrix)
    }
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

window.addEventListener('DOMContentLoaded', () => {
    console.log("🖥️ Kiosk DOM structures cached and ready for dynamic rendering pipelines.");
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
        month1 = zplMonths; month2 = zplMonths; month3 = zplMonths;
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
 * Dedicated Multiples Loop Execution Engine (Asynchronous Sequential Upgrade)
 * Fires network requests strictly one after the other to prevent overwriting files on disk.
 */
async function executePhysicalPrintSpooler(payload, totalRuns) {
    if (!payload) return;

    // ANIMATION FIX: Explicitly remove animation tracker layout states cleanly
    const mainWrapper = document.getElementById('main-app-wrapper');
    if (mainWrapper) {
        mainWrapper.classList.remove('printing-active-state');
    }
    if (isDemoModeActive) {
        console.log(`✈️ DEMO MODE ACTIVE: Bypassing print daemon for ${totalRuns} labels.`);
        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: payload.year, 
            hexColor: payload.finalHex 
        }, 3000);
        return;
    }

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

    try {
        // SEQUENTIAL CHAINING: Wait for each network fetch to complete before starting the next
        for (let run = 0; run < totalRuns; run++) {
            const response = await fetch('http://localhost:8080', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(structuralPostPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`🎉 Dispatched run (${run + 1}/${totalRuns}) to local CUPS spooler:`, data);
        }

        // CONFIRMATION GATE: Only show success if all network iterations resolve perfectly
        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: payload.year, 
            hexColor: payload.finalHex 
        }, 3000);

    } catch (error) {
        console.error('❌ Network printing engine link broken during spooling sequence:', error);
        
        if (mainWrapper) {
            mainWrapper.classList.remove('printing-active-state');
        }
        showUserAlert('SYSTEM_ALERT', { message: 'PRINTER ROUTER CONNECTION OFFLINE' }, 5000);
    }
}

// Fetch dispatch database array and dynamically stream buttons onto the 6x7 Screen 5 matrix grid
function loadDispatchLabelsMatrix() {
    const dispatchGrid = document.getElementById('dispatch-labels-grid');
    if (!dispatchGrid) return;

    fetch('http://localhost:8080/api/list?name=dispatch')
        .then(res => {
            if (!res.ok) throw new Error("Dispatch database missing or unreachable.");
            return res.json();
        })
        .then(dispatchDataArray => {
            let matrixHTML = '';

            // Strictly cycle through all 42 physical layout slots (6 rows x 7 columns)
            for (let index = 0; index < 42; index++) {
                const slotItem = dispatchDataArray[index] || {};
                const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
                const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
                
                // Keep the postcode safely stowed away in memory objects for next-stage printing overlays
                const hiddenPostcode = (slotItem.postcode || "").toString().trim().toUpperCase();

                // Check if the current slot contains active label records
                if (line1Text !== "" || line2Text !== "") {
                    matrixHTML += `
                        <button class="dispatch-cat-btn" data-index="${index}" data-postcode="${hiddenPostcode}" onclick="handleDispatchMatrixCellClick(this)">
                            <div class="btn-text">${line1Text}<br>${line2Text}</div>
                        </button>`;
                } else {
                    // Apply the visual de-saturation filter class natively onto empty cells
                    matrixHTML += `
                        <button class="dispatch-cat-btn dispatch-inactive">
                            <div class="btn-text"></div>
                        </button>`;
                }
            }

            dispatchGrid.innerHTML = matrixHTML;
            console.log("📦 Stage 5 Dispatch Matrix populated dynamically from JSON.");
        })
        .catch(err => {
            console.error("❌ Failed to stream dispatch database:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO LOAD DISPATCH DATA FROM DISK' }, 4000);
        });
}

// Handles workflow routing when a destination cell button is clicked on Screen 5.
function handleDispatchMatrixCellClick(buttonElement) {
    const postcode = buttonElement.getAttribute('data-postcode') || " ";
    const labelLines = buttonElement.querySelector('.btn-text').innerHTML.split('<br>');
    
    // Extract the strings from the array positions safely before trimming
    const addr1 = (labelLines[0] || "").toString().trim().toUpperCase();
    const addr2 = (labelLines[1] || "").toString().trim().toUpperCase();
    
    console.log(`Grid destination selected: [${addr1} ${addr2}]. Populating overlay metrics data.`);
    
    // Save target data structure safely to global print payload parameters
    lastExecutedPrintPayload = {
        color: "dispatch",
        cwrd1: addr1,
        cwrd2: addr2,
        q: "ACTIVE_DISPATCH",
        year: " ",
        m1: postcode, 
        m2: " ",
        m3: " ",
        finalHex: "#e1f5fe",
        finalPeriod: "DISPATCH RUN"
    };

    // Launch our unified data collection overlay container loop instantly
    launchDispatchDataCollectionOverlay(addr1, addr2, postcode);
}

// Workspace tracker flags for the unified data collection modal overlay box
let activeDispatchFocusedInputKey = "trolleys"; // Current input track tracker: 'trolleys', 'trays', 'date'

/**
 * Triggers the unified dispatch overlay box open, populates the header strings,
 * and clears past input selections cleanly.
 */
function launchDispatchDataCollectionOverlay(addr1, addr2, postcode) {
    // 1. Map text fields straight to confirmation labels
    const modalAddr1 = document.getElementById('dispatch-modal-addr1');
    const modalAddr2 = document.getElementById('dispatch-modal-addr2');
    
    if (modalAddr1) modalAddr1.textContent = addr1;
    if (modalAddr2) modalAddr2.textContent = addr2;

    // 2. Clear historical inputs entirely to reset the form field state
    document.getElementById('dispatch-input-trolleys').value = "";
    document.getElementById('dispatch-input-trays').value = "";
    document.getElementById('dispatch-input-date').value = "";

    // 3. Unhide the master structural layout container cleanly
    const modalFrame = document.getElementById('dispatch-data-collection-modal');
    if (modalFrame) {
        modalFrame.classList.remove('modal-hide');
        modalFrame.style.setProperty('display', 'flex', 'important');
    }

    // 4. 🚀 PROACTIVE HIGHLIGHT FOCUS STATE: Light up the Trolleys row instantly upon presentation
    activeDispatchFocusedInputKey = "trolleys";
    
    // Reset all rows to neutral grey first
    const targetingKeys = ['trolleys', 'trays', 'date'];
    targetingKeys.forEach(key => {
        const inputEl = document.getElementById(`dispatch-input-${key}`);
        if (inputEl) inputEl.style.backgroundColor = "#F4F4F4";
    });

    // Explicitly shade the Trolleys input row background container to green right at startup
    const trolleyInput = document.getElementById('dispatch-input-trolleys');
    if (trolleyInput) {
        trolleyInput.style.backgroundColor = "#a5d6a7";
    }
}

/**
 * Resets all entry row backgrounds to clean default gray state
 */
function clearAllDispatchCollectionFocus() {
    activeDispatchFocusedInputKey = "";
    const targetingKeys = ['trolleys', 'trays', 'date'];
    targetingKeys.forEach(key => {
        const inputEl = document.getElementById(`dispatch-input-${key}`);
        if (inputEl) {
            inputEl.style.backgroundColor = "#F4F4F4";
        }
    });
}

/**
 * Cleanly dismisses the logistics overlay box overlay framework view
 */
function dismissDispatchCollectionOverlay() {
    const modalFrame = document.getElementById('dispatch-data-collection-modal');
    if (modalFrame) {
        modalFrame.style.setProperty('display', 'none', 'important');
        modalFrame.classList.add('modal-hide');
    }
}

/**
 * Focus Router: High contrast shading lookups for active text input rows.
 * Intercepts numeric inputs to launch the shared quantity keypad dynamically.
 */
function setDispatchCollectionFocus(inputFieldKey) {
    activeDispatchFocusedInputKey = inputFieldKey;

    const targetingKeys = ['trolleys', 'trays', 'date'];
    
    // Reset all target background parameters back to standard gray lookups
    targetingKeys.forEach(key => {
        const inputEl = document.getElementById(`dispatch-input-${key}`);
        if (inputEl) {
            inputEl.style.backgroundColor = "#F4F4F4";
        }
    });

    // Apply prominent soft green active focus highlight shading to the targeted box row element
    const activeTargetEl = document.getElementById(`dispatch-input-${inputFieldKey}`);
    if (activeTargetEl) {
        activeTargetEl.style.backgroundColor = "#a5d6a7";
    }

    // 🚀 KEYPAD INTERCEPT FOR NUMERIC LOGISTICS ROWS
    if (inputFieldKey === 'trolleys' || inputFieldKey === 'trays') {
        console.log(`Logistics row input focused: Initializing shared numeric keypad overlay.`);
        
        // Adapt text labels dynamically for custom value entry context
        const keypadTitle = document.getElementById('multiples-modal-title');
        const keypadSubmitText = document.getElementById('multiples-modal-submit-text');
        
        if (keypadTitle) keypadTitle.textContent = "ENTER A VALUE";
        if (keypadSubmitText) keypadSubmitText.textContent = "ENTER";
        
        // Reset keypad counter memory layout tracker to a blank state for crisp inputs
        multiplesCountTarget = "";
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) countBadge.value = "";
        
        // Launch the clean, stripped multiples keypad overlay instantly
        const multiplesModal = document.getElementById('admin-multiples-modal');
        if (multiplesModal) {
            multiplesModal.classList.remove('modal-hide');
            multiplesModal.style.setProperty('display', 'flex', 'important');
        }
    }

    // 🚀 DYNAMIC OVERLAY PICKER GATEWAY FOR DATE FIELD
    if (inputFieldKey === 'date') {
        console.log("🗓️ Date row field focused: Initializing 2-week rolling delivery picker canvas.");
        launchDispatchCalendarOverlay(); // 🗓️ Click Hook Activated! Opens the new 2x7 calendar tray instantly.
    }

}

/**
 * Master Dispatch Spooler: Gathers values from the unified data entry fields,
 * packages the parameters, and fires the data directly to the printing pipeline.
 */
function submitDispatchJobPrintSpool() {
    const tVal = document.getElementById('dispatch-input-trolleys').value.trim();
    const rVal = document.getElementById('dispatch-input-trays').value.trim();
    const dVal = document.getElementById('dispatch-input-date').value.trim();

    console.log("🚀 Initializing Logistics Spooler: Capturing fields for active print delivery loop.");
    console.log("📊 Trolleys: [" + tVal + "], Trays: [" + rVal + "], Date: [" + dVal + "]");

    // Build the dynamic parameters array onto the global print payload tracker object
    lastExecutedPrintPayload = {
        color: "dispatch",            // Forces routing to the dedicated dispatch printer queue
        cwrd1: lastExecutedPrintPayload.cwrd1, // Address Line 1
        cwrd2: lastExecutedPrintPayload.cwrd2, // Address Line 2
        q: "ACTIVE_DISPATCH",          // Core active queue routing marker flag
        year: tVal,                    // Pass total trolleys quantity (Y) through the year tracking slot
        m1: lastExecutedPrintPayload.m1,       // Hidden postcode string stowed securely in memory
        m2: rVal,                      // Pass total trays count through the m2 tracking slot
        m3: dVal                       // Pass formatted intended delivery date through the m3 tracking slot
    };

    // Fire the physical system print engine instantly (Running 1 time since Python will loop inside the box)
    executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);

    // Close down the overlay and return cleanly to a fresh Screen 5 matrix look
    dismissDispatchCollectionOverlay();
}

/**
 * Universal Navigation Sidebar Action Manager (Explicit State Machine Engine)
 * 🎛️ SYSTEM OVERHAUL: All transitions strictly evaluate currentActiveScreen
 * to guarantee robust layout cleanup and fulfill sitemap routing paths.
 */
function sidebarAction(action) {
    // 🍊 PLAIN LABELS BUTTON CLICKED EVENT INTERCEPT
    if (action === 'PLAIN_MODE') {
        console.log("📝 Plain Labels Mode Activated. Re-routing sidebar controls.");
        loadPlainLabelsMatrix();
        switchKioskScreenLayout("4");
        return;
    }
    
    // 🚛 DISPATCH LABELS BUTTON CLICKED EVENT INTERCEPT (Screen 5 Grid Activation Hook)
    if (action === 'DISPATCH_MODE') {
        console.log("🚛 Dispatch Labels Mode Activated. Streaming logistics matrix.");
        loadDispatchLabelsMatrix();
        switchKioskScreenLayout("5");
        return;
    }

    if (action === 'BACK') {
        console.log(`↩️ Back Button Clicked. Processing from Screen State: [${currentActiveScreen}]`);

        switch (currentActiveScreen) {
            case "1A": // Screen 1A Back to Screen 6 Admin Settings (Fulfills 6A Back)
                switchKioskScreenLayout("6");
                break;

            case "2": // Screen 2 Back to Screen 1 Home Screen (Fulfills 1 Back)
                // Clear category words text parameters natively on escape
                const slot1 = document.getElementById('cat-word1');
                const slot2 = document.getElementById('cat-word2');
                if (slot1) slot1.textContent = '';
                if (slot2) slot2.textContent = '';
                switchKioskScreenLayout("1");
                break;

            case "2A": // Screen 2A Back to Screen 1A Multiples Matrix (Fulfills 1A Back)
                switchKioskScreenLayout("1A");
                break;

            case "3": // Screen 3 Back to Screen 2 Date Grid (Fulfills 2 Back)
                switchKioskScreenLayout("2");
                break;

            case "3A": // Screen 3A Back to Screen 2A Multiples Date Grid (Fulfills 2A Back)
                switchKioskScreenLayout("2A");
                break;

            case "4": // Screen 4 Plain Labels Back to Screen 1 Home Screen (Fulfills 4 Back)
                loadHomeMatrixCategories(); // 🌟 LIVE WIPE: Instantly re-stream the buttermilk food category matrix buttons
                switchKioskScreenLayout("1");
                break;

            case "5": // Screen 5 Dispatch Labels Back to Screen 1 Home Screen (Fulfills 5 Back)
                switchKioskScreenLayout("1");
                break;

            case "6": // Screen 6 Admin Dashboard Back to Screen 1 Home Screen (Fulfills 6 Back)
                switchKioskScreenLayout("1");
                break;

            default:
                console.warn(`⚠️ Unhandled Back transition requested out of Screen state: [${currentActiveScreen}]. Falling back safely.`);
                switchKioskScreenLayout("1");
                break;
        }
        return;
    }

    if (action === 'MONTHS') {
        // Route active category from date range views into monthly matrices
        const systemYear = new Date().getFullYear();
        monthActiveTargetYearInt = monthActiveTargetYearInt || systemYear;

        // 🌟 ARCHITECTURAL PASS: Mirror category text strings over to Month header nodes
        const sourceWord1 = document.getElementById('cat-word1');
        const sourceWord2 = document.getElementById('cat-word2');
        const monthWord1 = document.getElementById('month-cat-word1');
        const monthWord2 = document.getElementById('month-cat-word2');

        if (sourceWord1 && monthWord1) monthWord1.textContent = sourceWord1.textContent;
        if (sourceWord2 && monthWord2) monthWord2.textContent = sourceWord2.textContent;

        if (currentActiveScreen === "2") {
            switchKioskScreenLayout("3");
            selectMonthTargetYear('CURRENT');
        } else if (currentActiveScreen === "2A") {
            switchKioskScreenLayout("3A");
            selectMonthTargetYear('CURRENT');
        }
        return;
    }

}

/**
 * Universal Inform User Alert Canvas Component
 * 🎛️ UPGRADED: Leverages the Central State Engine to enforce flawless post-print layout safety rules.
 */
function showUserAlert(type, data = {}, duration = 3000) {
    if (type === 'PRINT_CONFIRM' && !kioskConfig.showPrintConfirmation) {
        // Strip active background animation queue instantly if confirmations are bypassed
        const mainWrapper = document.getElementById('main-app-wrapper');
        if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
        
        // 🚛 BYPASS GATE INTERCEPT: If this is a blank dispatch run, preserve Screen 5 focus instead of falling back
        if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
            console.log("🚛 Blank Dispatch Run (Bypassed Alert): Retaining active focus safely on Screen 5.");
            loadDispatchLabelsMatrix();
            switchKioskScreenLayout("5");
        } else {
            sidebarAction('BACK');
        }
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
            
            const mainWrapper = document.getElementById('main-app-wrapper');
            if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
            
            if (type === 'PRINT_CONFIRM') {
                if (currentActiveWorkspaceMode === 'PLAIN_MODE') {
                    // Plain labels flow loop: Keep user locked into screen 4
                    return; 
                }

                // 🚛 BLANK DISPATCH RUN INTERCEPT: Freeze state completely and remain on Screen 5
                if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
                    console.log("🚛 Blank Dispatch Run Complete: Retaining active focus safely on Screen 5.");
                    loadDispatchLabelsMatrix();
                    switchKioskScreenLayout("5");
                    return;
                }

                // 🚀 STATE ENGINE RE-ROUTING COMPLIANCE FOR BASELINE CATEGORIES
                if (isAdminMultiplesModeActive) {
                    console.log("🍇 Admin Multi-Print Complete: Bypassing overlay prompts. Routing cleanly back to Screen 1A.");
                    switchKioskScreenLayout("1A");
                } else {
                    console.log("🟢 User Single-Print Complete: Routing control straight back to Screen 1 Home Screen.");
                    switchKioskScreenLayout("1");
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

    // 🔒 THE CRITICAL CHECK: Verify input matches security PIN parameters natively
    if (pinInput.value === kioskConfig.securityPin) {
        dismissPinPadSecurity();
        
        // 🚀 STATE SWITCH: Navigate cleanly to Screen 6 Admin Settings Panel
        switchKioskScreenLayout("6");
        
        // Synchronise checkmark switches visually to match data states perfectly
        const row4Checkbox = document.getElementById('admin-toggle-row4');
        const confirmCheckbox = document.getElementById('admin-toggle-confirm');
        if (row4Checkbox) row4Checkbox.checked = kioskConfig.isFourthYearReleased;
        if (confirmCheckbox) confirmCheckbox.checked = kioskConfig.showPrintConfirmation;
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
        switchKioskScreenLayout("1");
        return;
    }

    if (optionKey === 'TOGGLE_ROW4' || optionKey === 'TOGGLE_CONFIRM') {
        executeValidatedAdminAction(optionKey);
        return;
    }

    // Intercept short date definitions configuration request tracks
    if (optionKey === 'DEFINE_SHORTDATE') {
        launchShortDateConfigPanel();
        return;
    }

    // Intercept administrative numerical door code changes requests 
    if (optionKey === 'RESET_PASSWORD') {
        launchAdminPinResetPanel();
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
// Triggers the Short Date selection overlay window open
function launchShortDateConfigPanel() {
    const modal = document.getElementById('admin-shortdate-modal');
    if (modal) {
        modal.classList.remove('modal-hide');
        modal.style.setProperty('display', 'flex', 'important');
    }
}

// Dismisses the Short Date overlay safely
function dismissShortDateConfigPanel() {
    const modal = document.getElementById('admin-shortdate-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.add('modal-hide');
    }
}

// Processes the selected selection index parameter, updates configurations, and writes to disk
function submitShortDateConfigAdjustment(selectedTargetValueInt) {
    // 1. Commit the value change onto global workspace trackers immediately
    shortDatePeriod = selectedTargetValueInt;
    kioskConfig.shortDatePeriod = selectedTargetValueInt;
    
    console.log(`⚙️ System configuration changed: shortDatePeriod set to [${selectedTargetValueInt}]`);

    // 2. Persist the changes instantly down onto your Raspberry Pi disk storage configuration file
    saveKioskConfigurationState();
    
    // 🚀 FIXED LAYER: Rebuild matrix layout grids live to immediately recalculate ambient boundaries
    generateDynamicGrid();
    
    // 3. Clear window layout views cleanly
    dismissShortDateConfigPanel();
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
    const targetColor = (currentActiveWorkspaceMode === 'ADMIN_PURPLE' || isAdminMultiplesModeActive) ? '#7851A9' : '#1b5e20';
    
    document.body.style.backgroundColor = targetColor;
    if (mainWrapper) {
        mainWrapper.style.setProperty('background-color', targetColor, 'important');
    }
}

function executeValidatedAdminAction(actionKey) {
    if (actionKey === 'CLOSE_PROGRAM') {
        setTimeout(() => { window.open('', '_self', ''); window.close(); window.location.href = 'about:blank'; }, 500);
        return;
    }
    
    if (actionKey === 'TOGGLE_DEMO') {
        isDemoModeActive = !isDemoModeActive;
        kioskConfig.isDemoModeActive = isDemoModeActive; // Commit state directly to the core data configuration layer
        
        const demoCheckbox = document.getElementById('admin-toggle-demo');
        if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;
        
        console.log(`⚙️ Demo Mode state toggled: [${isDemoModeActive}]`);
        saveKioskConfigurationState(); // 💾 WRITE SELECTION PERSISTENTLY TO SERVER DISK IMMEDIATELY
        return;
    }
    
    if (actionKey === 'TOGGLE_ROW4') {
        kioskConfig.isFourthYearReleased = !kioskConfig.isFourthYearReleased;
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

    // 🍇 MULTI-PRINT ACTION INTERCEPT: Routed smoothly through the Central State Machine
    if (actionKey === 'MULTIPLES') {
        isAdminMultiplesModeActive = true;
        
        // Load Screen 1A Category Selection workspace inside the purple paradigm context
        switchKioskScreenLayout("1A");
        
        // Re-stream the main category buttons natively to populate the grid workspace
        loadHomeMatrixCategories();
        return;
    }
}

/**
 * Shared Multi-Use Overlay Trigger: Launches the numerical input keypad.
 * Dynamically enforces standard labels if triggered outside logistics view tracks.
 */
function triggerMultiplesQuantityOverlay() {
    // 🧼 BASELINE RESET: Restore default labels if not in dispatch data collection mode
    if (currentActiveWorkspaceMode !== "DISPATCH_MODE") {
        const keypadTitle = document.getElementById('multiples-modal-title');
        const keypadSubmitText = document.getElementById('multiples-modal-submit-text');
        
        if (keypadTitle) keypadTitle.textContent = "SET PRINT QUANTITY";
        if (keypadSubmitText) keypadSubmitText.textContent = "SEND";
    }

    // Initialize the shared numerical input variable state back to a baseline string
    multiplesCountTarget = "1";
    
    const countBadge = document.getElementById('admin-multiples-count-badge');
    if (countBadge) countBadge.value = "1";

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

/**
 * Commits numerical entries from the keypad: Spools print jobs for standard categories
 * or pipes values straight into the active Screen 5 text field input blocks.
 */
function confirmMultiplesQuantityRun() {
    // 🚛 INTERCEPT GATEWAY: Handle data values collection when inside dispatch view
    if (currentActiveWorkspaceMode === "DISPATCH_MODE") {
        
        // 🚀 NEW FIX: If this is an explicit Blank Label run, fire it straight to the print loop!
        if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
            console.log("🚛 Blank Dispatch Run Confirmed: Spooling batch directly into local queue.");
            executePhysicalPrintSpooler(lastExecutedPrintPayload, multiplesCountTarget);
            
            // Clean up the modal layout overlays instantly
            const multiplesModal = document.getElementById('admin-multiples-modal');
            if (multiplesModal) {
                multiplesModal.style.setProperty('display', 'none', 'important');
                multiplesModal.classList.add('modal-hide');
            }
            return;
        }

        // Standard fallback for normal form entry field input blocks (Trolleys/Trays keypad inputs)
        const collectedValue = multiplesCountTarget.toString().trim();
        const targetValue = (collectedValue === "") ? "0" : collectedValue;
        
        const activeInput = document.getElementById(`dispatch-input-${activeDispatchFocusedInputKey}`);
        if (activeInput) {
            activeInput.value = targetValue;
            console.log(`Value entry committed successfully: Field [dispatch-input-${activeDispatchFocusedInputKey}] -> [${targetValue}]`);
            updateDispatchPrintButtonState();
        }

        const multiplesModal = document.getElementById('admin-multiples-modal');
        if (multiplesModal) {
            multiplesModal.style.setProperty('display', 'none', 'important');
            multiplesModal.classList.add('modal-hide');
        }
        
        clearAllDispatchCollectionFocus();
        return;
    }

    // 🟢 BASELINE MULTI-PRINT SYSTEM RUN LOGIC (Untouched fallback rules for Screen 1A, 4, etc.)
    if (lastExecutedPrintPayload) {
        executePhysicalPrintSpooler(lastExecutedPrintPayload, multiplesCountTarget);
    }
    // ... rest of the function remains exactly the same ...

    const universalOverlay = document.getElementById('kiosk-universal-overlay');
    if (universalOverlay) {
        universalOverlay.remove();
    }

    const mainWrapper = document.getElementById('main-app-wrapper');
    if (mainWrapper) {
        mainWrapper.classList.remove('printing-active-state');
    }

    console.log("🚀 Multi-Print Spool Committed: Closing overlay instantly.");
    
    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }
    
    if (currentActiveScreen === "4") {
        loadPlainLabelsMatrix(); 
        switchKioskScreenLayout("4");
    } else if (currentActiveScreen === "5") {
        loadDispatchLabelsMatrix();
        switchKioskScreenLayout("5");
    } else {
        switchKioskScreenLayout("1A");
    }
}

/**
 * Handles workflow routing after a quantity selection run is dispatched
 * (Maintained for legacy interface hooks, now safely bound to the explicit state architecture)
 */
function handleContinuityChoice(choiceType) {
    const multiplesModal = document.getElementById('admin-multiples-modal');
    
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }

    if (choiceType === 'SAME') {
        setTimeout(triggerMultiplesQuantityOverlay, 150);
    } else {
        if (choiceType === 'EXIT_GREEN') {
            switchKioskScreenLayout("1");
        } else {
            switchKioskScreenLayout("1A");
        }
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

    if (isAdminMultiplesModeActive) {
        console.log("📌 Admin Months Intercept: Loading quantity matrix keypad panels.");
        triggerMultiplesQuantityOverlay();
    } else {
        console.log("🟢 Normal User Month Run: Dispatching single print target job.");
        executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);
    }
}

// Universal JSON Multi-Field State Trackers for Screen 7 List Suite
currentListSchemaDataArray = []; // Stores live array of objects fetched from disk
activeFocusedFieldKey = "line1"; // Active sub-field typing path: 'line1', 'line2', 'image'
activeFocusedInputId = null; 
activeEditorFileKey = "";

/**
 * Stage 5 Suite Launcher: Streams object schemas, maps lengths, updates label colors,
 * and dynamically swaps text labels between standard lists and dispatch formats.
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

    // Dynamic Form Helper Labels Swap Engine
    const row1Label = document.getElementById('editor-label-row1');
    const row2Label = document.getElementById('editor-label-row2');
    const row3Label = document.getElementById('editor-label-row3');

    if (listFileKey === 'dispatch') {
        if (row1Label) row1Label.textContent = "Address Line 1";
        if (row2Label) row2Label.textContent = "Address Line 2";
        if (row3Label) row3Label.textContent = "Postcode";
    } else {
        if (row1Label) row1Label.textContent = "Line 1 Text";
        if (row2Label) row2Label.textContent = "Line 2 Text";
        if (row3Label) row3Label.textContent = "Image Filename";
    }

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
                
                // Read from dispatch keys (text1, text2, postcode) or fallback to (text1, text2, image_file)
                let text3Value = item.image_file !== undefined ? item.image_file : "";
                if (listFileKey === 'dispatch' && item.postcode !== undefined) {
                    text3Value = item.postcode;
                }

                currentListSchemaDataArray.push({
                    text1: (item.text1 || "").toString().trim().toUpperCase(),
                    text2: (item.text2 || "").toString().trim().toUpperCase(),
                    image_file: text3Value.toString().trim() // Maps structural data seamlessly to form slots
                });
            }
            
            // Re-render the right pane selection list stream seamlessly
            rebuildPlaylistVisualStreamContainer();

            // 🚀 STATE SWITCH: Route operations safely to Screen 7 (Drop sidebar via tracker definitions)
            switchKioskScreenLayout("7");

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
    // 🚛 LOGISTICS MODAL INPUT INTERCEPT LAYER
    if (currentActiveWorkspaceMode === "DISPATCH_MODE") {
        if (!['0','1','2','3','4','5','6','7','8','9'].includes(keyChar)) return;
        if (activeDispatchFocusedInputKey === 'date') return;

        const activeInput = document.getElementById(`dispatch-input-${activeDispatchFocusedInputKey}`);
        if (activeInput) {
            if (activeInput.value === "TAP TO ENTER") activeInput.value = "";
            if (activeInput.value.length < 3) {
                activeInput.value += keyChar;
                updateDispatchPrintButtonState();
            }
        }
        return;
    }

    // 🟢 YOUR ORIGINAL UNTOUCHED FUNCTION LOGIC STARTS HERE
    if (activeFocusedInputId === null || !activeFocusedFieldKey) return;
    
    const targetObject = currentListSchemaDataArray[activeFocusedInputId];
    let currentValue = "";
    
    // VARIABLE CHARACTER BOUNDARIES CONFIGURATION
    let characterLimit = (activeEditorFileKey === 'category') ? 11 : 13;
    
    if (activeFocusedFieldKey === 'line1') {
        currentValue = targetObject.text1;
    } else if (activeFocusedFieldKey === 'line2') {
        currentValue = targetObject.text2;
    } else if (activeFocusedFieldKey === 'image') {
        currentValue = targetObject.image_file;
        characterLimit = 40;
    }
    
    let processedChar = (activeFocusedFieldKey === 'image') ? keyChar : keyChar.toUpperCase();
    
    if (currentValue.length < characterLimit) {
        let updatedValue = currentValue + processedChar;
        
        if (activeFocusedFieldKey === 'line1') targetObject.text1 = updatedValue;
        else if (activeFocusedFieldKey === 'line2') targetObject.text2 = updatedValue;
        else if (activeFocusedFieldKey === 'image') targetObject.image_file = updatedValue;
        
        document.getElementById(`editor-input-${activeFocusedFieldKey}`).value = updatedValue;
        
        synchronizePlaylistTextLineLabel(activeFocusedInputId);
        refreshLiveWorkspaceCanvasPreviews();
    }
}

/**
 * Backspace Processor: Remaps truncation requests down to active data strings
 */
function backspaceEditorKey() {
    // 🚛 LOGISTICS MODAL INPUT INTERCEPT LAYER
    if (currentActiveWorkspaceMode === "DISPATCH_MODE") {
        if (activeDispatchFocusedInputKey === 'date') return;
        
        const activeInput = document.getElementById(`dispatch-input-${activeDispatchFocusedInputKey}`);
        if (activeInput && activeInput.value.length > 0) {
            activeInput.value = activeInput.value.slice(0, -1);
            updateDispatchPrintButtonState();
        }
        return;
    }

    // 🟢 YOUR ORIGINAL UNTOUCHED FUNCTION LOGIC STARTS HERE
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
 * Canvas Graphic Sync Controller: Drives real-time image asset previews inside the canvas.
 * Logistics Lorry Graphic Anchor: Locks permanent delivery van image when inside dispatch list mode.
 */
function refreshLiveWorkspaceCanvasPreviews() {
    if (activeFocusedInputId === null) return;
    
    const currentObject = currentListSchemaDataArray[activeFocusedInputId];
    const frame1 = document.getElementById('editor-preview-graphic-frame-1');
    const frame2 = document.getElementById('editor-preview-graphic-frame-2');
    
    if (!frame1) return;
    
    // Explicitly strip any accidental leftover borders or backgrounds from the frames
    frame1.style.border = "none";
    frame1.style.backgroundColor = "transparent";
    
    if (activeEditorFileKey === 'dispatch') {
        // Enforce rigid asset lock for logistics operations with correct PNG path extension
        frame1.src = "label-graphics/dispatch-van.png";
        if (frame2) frame2.style.display = "none";
        
        frame1.onerror = function() {
            frame1.src = "label-graphics/blank.jpg";
        };
        return;
    }
    
    let rawFilename = (currentObject.image_file || "").toString().trim();

    if (rawFilename === "" || rawFilename.toUpperCase() === "BLANK.JPG") {
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
 * Master API Sync: Normalizes object fields relative to list type and posts to background database.
 * Non-Blocking Feedback: Displays a temporary toast notification upon successful save completion.
 */
function saveActiveListEditorDataToDisk() {
    if (!activeEditorFileKey) return;

    // Build standard or custom payload depending on operational modes
    const cleanOutputPayload = currentListSchemaDataArray.map(item => {
        if (activeEditorFileKey === 'dispatch') {
            return {
                text1: item.text1,
                text2: item.text2,
                postcode: item.image_file // Normalise form space value onto target storage key name
            };
        } else {
            return {
                text1: item.text1,
                text2: item.text2,
                image_file: item.image_file
            };
        }
    });

    fetch(`http://localhost:8080/api/list/save?name=${activeEditorFileKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOutputPayload)
    })
    .then(response => {
        if (!response.ok) throw new Error("Disk stream channel transmission timeout failure");
        return response.json();
    })
    .then(syncDataConfirmation => {
        console.log(`💾 Data sync successful for [${activeEditorFileKey}].`);
        
        // 🍞 INDUSTRIAL TOAST NOTIFICATION GENERATOR
        // Remove any historical lingering save alert toast block first
        const oldToast = document.getElementById('kiosk-save-toast-alert');
        if (oldToast) oldToast.remove();

        // Inject the visual feedback banner directly into the active viewport stream
        const toastHtml = `
            <div id="kiosk-save-toast-alert" style="position: fixed; top: 3vh; left: 50vw; transform: translateX(-50%); background-color: #4cd964; color: #000000; font-family: Arial, sans-serif; font-size: 2.6vh; font-weight: 900; padding: 2vh 4vw; border: 3px solid #000000; border-radius: 12px; box-shadow: 0px 8px 20px rgba(0,0,0,0.4); z-index: 9999999999; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; transition: opacity 0.3s ease;">
                CHANGES SAVED
            </div>`;
        document.body.insertAdjacentHTML('beforeend', toastHtml);

        // Automate a clean fading destruction sequence after 1500 milliseconds
        setTimeout(() => {
            const activeToast = document.getElementById('kiosk-save-toast-alert');
            if (activeToast) {
                activeToast.style.opacity = '0';
                setTimeout(() => activeToast.remove(), 300);
            }
        }, 1500);
    })
    .catch(err => {
        console.error("❌ Critical server write sync error:", err);
        alert("CRITICAL STORAGE SYSTEM ERROR: FIELD DATA WRITE FAILURE STACKED");
    });
}

function exitListEditorWorkspace() {
    // 🚀 STATE SWITCH: Navigate cleanly back to Screen 6 Admin Settings Panel
    switchKioskScreenLayout("6");
}

// Opens the numeric PIN modification dialogue layout panel
function launchAdminPinResetPanel() {
    const modal = document.getElementById('admin-pin-reset-modal');
    const displayField = document.getElementById('admin-new-pin-display');
    const errorSlot = document.getElementById('admin-pin-reset-error-msg');
    
    if (displayField) displayField.value = "";
    if (errorSlot) { errorSlot.style.display = "none"; errorSlot.textContent = ""; }
    
    if (modal) {
        modal.classList.remove('modal-hide');
        modal.style.setProperty('display', 'flex', 'important');
    }
}

// Dismisses the PIN modifications menu canvas safely
function dismissAdminPinResetPanel() {
    const modal = document.getElementById('admin-pin-reset-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.add('modal-hide');
    }
}

// Appends numeric entries directly into the 4-digit collection tracker bar
function pressResetPinPadKey(digitString) {
    const displayField = document.getElementById('admin-new-pin-display');
    const errorSlot = document.getElementById('admin-pin-reset-error-msg');
    if (!displayField) return;
    
    if (errorSlot) errorSlot.style.display = "none";

    // Strictly limit pin entries to exactly 4 layout positions
    if (displayField.value.length < 4) {
        displayField.value += digitString;
    }
}

function clearResetPinPadEntry() {
    const displayField = document.getElementById('admin-new-pin-display');
    if (displayField) displayField.value = "";
}

// Checks input compliance loops and persists the 4-digit code directly onto disk storage
function submitAdminPinResetAdjustment() {
    const displayField = document.getElementById('admin-new-pin-display');
    const errorSlot = document.getElementById('admin-pin-reset-error-msg');
    if (!displayField || !errorSlot) return;

    const targetNewPin = displayField.value;

    // Reject processing instantly if the string collection bounds fall short of a full PIN
    if (targetNewPin.length !== 4) {
        errorSlot.textContent = "Rejected: PIN must be 4 digits!";
        errorSlot.style.display = "block";
        return;
    }

    // Overwrite state metrics and dispatch payload directly to configuration json file
    kioskConfig.securityPin = targetNewPin;
    saveKioskConfigurationState();
    
    console.log("🔒 Security entry tracker authorization updated. New Admin PIN: [" + targetNewPin + "]");
    dismissAdminPinResetPanel();
}

/**
 * Intercepts the sidebar BLANK button touch event and launches the quantity pad.
 */
function handleBlankDispatchLabelsClick() {
    console.log("Committed Logistics Run: Preparing blank dispatch print quantity overlay.");
    
    // Package a clean placeholder print payload targeting the blank logistics template stock
    lastExecutedPrintPayload = {
        color: "dispatch", // 🚛 FIXED: Correctly routes directly to the dedicated dispatch printer queue
        cwrd1: "BLANK DISPATCH STOCK",
        cwrd2: "",
        q: "BLANK_DISPATCH", // Unique signature key flag for backend routing separation
        year: " ",
        m1: "blankDispatchLabel.zpl", // Direct template descriptor filename pointer
        m2: " ",
        m3: " ",
        finalHex: "#e1f5fe", // Soft ice-blue confirmation card profile
        finalPeriod: "MANUAL FILL"
    };

    // Fire the existing quantitative keypad layout overlay instantly
    triggerMultiplesQuantityOverlay();
}

/**
 * Keypad Entry Handler: Tracks touches from the 3x4 layout matrix grid.
 */
function pressMultiplesKey(digitString) {
    console.log(`Keypad digit touched: [${digitString}]`);
    
    // Convert multiples count memory tracker to a clean string space
    let currentInputString = (multiplesCountTarget || "").toString();

    // Enforce strict limit: Cap numerical string values at 3 digits max
    if (currentInputString.length < 3) {
        // Prevent leading zeros if the entry field box is currently empty
        if (currentInputString === "" && digitString === "0") return;
        
        multiplesCountTarget = currentInputString + digitString;
        
        // Push the update visually onto the active keypad header value badge display
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) countBadge.value = multiplesCountTarget;
    }
}

/**
 * Keypad Backspace: Erases the last character from the active entry string loop.
 */
function backspaceMultiplesKey() {
    let currentInputString = (multiplesCountTarget || "").toString();
    if (currentInputString.length > 0) {
        multiplesCountTarget = currentInputString.slice(0, -1);
        
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) countBadge.value = multiplesCountTarget;
    }
}

/**
 * Keypad Clear: Flushes the numeric memory tracker instantly to a blank space.
 */
function clearMultiplesKey() {
    multiplesCountTarget = "";
    const countBadge = document.getElementById('admin-multiples-count-badge');
    if (countBadge) countBadge.value = "";
}

/**
 * Multiples Overlay Dismissal Helper: Safely closes the keypad block view.
 */
function dismissMultiplesQuantityOverlay() {
    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }
    
    // Clear active focus highlight safely if escaping out from a dispatch row selection loop
    if (currentActiveWorkspaceMode === "DISPATCH_MODE") {
        clearAllDispatchCollectionFocus();
    }
}

/**
 * Evaluates the dispatch input statuses and unlocks the PRINT button 
 * safely with zero string conversion crashes.
 */
function updateDispatchPrintButtonState() {
    const tInput = document.getElementById('dispatch-input-trolleys');
    const rInput = document.getElementById('dispatch-input-trays');
    const dInput = document.getElementById('dispatch-input-date');
    
    // Fallback safely to empty strings if elements are missing from DOM tracking
    const tVal = tInput ? tInput.value.toString().trim() : "";
    const rVal = rInput ? rInput.value.toString().trim() : "";
    const dVal = dInput ? dInput.value.toString().trim() : "";
    
    const printBtn = document.getElementById('dispatch-modal-print-btn');
    const printSvg = document.getElementById('dispatch-modal-print-svg');
    const printText = document.getElementById('dispatch-modal-print-text');
    
    if (!printBtn) return;

    // Filter out standard baseline placeholder text strings from validation passes
    const isTrolleysDone = (tVal !== "" && tVal !== "TAP TO ENTER");
    const isTraysDone = (rVal !== "" && rVal !== "TAP TO ENTER");
    const isDateDone = (dVal !== "" && dVal !== "TAP TO SELECT");

    if (isTrolleysDone && isTraysDone && isDateDone) {
        // Unlock button with full operational bright green theme parameters
        printBtn.style.backgroundColor = "#4cd964";
        printBtn.style.borderColor = "#000000";
        printBtn.style.boxShadow = "0px 0.4vh 0px #000000";
        printBtn.style.pointerEvents = "auto";
        printBtn.style.opacity = "1";
        printBtn.style.filter = "none";
        
        if (printSvg) printSvg.setAttribute('stroke', '#000000');
        if (printText) printText.style.color = '#000000';
    } else {
        // Strict fallback lock to grayed-out inactive parameters
        printBtn.style.backgroundColor = "#CCCCCC";
        printBtn.style.borderColor = "#666666";
        printBtn.style.boxShadow = "0px 0.4vh 0px #666666";
        printBtn.style.pointerEvents = "none";
        printBtn.style.opacity = "0.5";
        printBtn.style.filter = "grayscale(1)";
        
        if (printSvg) printSvg.setAttribute('stroke', '#333333');
        if (printText) printText.style.color = '#333333';
    }
}

/**
 * Automatically calculates a rolling 14-day window from the current system clock,
 * formats the days tabs prominently, doubles date typography visibility numbers, unifies backgrounds,
 * and completely locks out/desaturates Sundays natively.
 */
function renderDispatchCalendarGrid() {
    const gridContainer = document.getElementById('calendar-picker-grid-matrix');
    if (!gridContainer) return;

    const shortDayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    let gridHTML = "";

    // Strictly pre-calculate all 14 sequential days from today
    const calculatedDaysArray = [];
    for (let i = 0; i < 14; i++) {
        const futureDateObj = new Date();
        futureDateObj.setDate(futureDateObj.getDate() + i);
        
        // Extract layout variables natively
        const dayIndex = futureDateObj.getDay(); // 0 = Sunday, 6 = Saturday
        const dayOfWeekStr = shortDayNames[dayIndex];
        const dayOfMonthNum = String(futureDateObj.getDate()).padStart(2, '0');
        const monthNum = String(futureDateObj.getMonth() + 1).padStart(2, '0');
        
        // ZPL Target Output Format: DDD dd/mm (e.g. FRI 25/09)
        const targetPrintString = dayOfWeekStr + " " + dayOfMonthNum + "/" + monthNum;
        // Screen Label Format: Short day number (e.g. 25/09)
        const displayDateString = dayOfMonthNum + "/" + monthNum;

        calculatedDaysArray.push({
            dayLabel: dayOfWeekStr,
            dateLabel: displayDateString,
            payloadValue: targetPrintString,
            isSunday: (dayIndex === 0)
        });
    }

    // Map out the unified 2-column x 7-row layout sequence (Left col: This Week, Right col: Next Week)
    for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
        const thisWeekDay = calculatedDaysArray[rowIndex];       
        const nextWeekDay = calculatedDaysArray[rowIndex + 7];   

        // 1. PROCESS LEFT COLUMN CELL (THIS WEEK)
        let leftBtnStyle = "height: 100%; width: 100%; background-color: #e1f5fe; border: 0.3vh solid #000000; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0px 0.3vh 0px #000000; padding: 0.3vh 0; outline: none; pointer-events: auto;";
        let leftDayStyle = "font-size: 2.8vh; font-weight: 900; color: #000000; line-height: 1.1;";
        let leftDateStyle = "font-size: 3.0vh; font-weight: 900; color: #333333; line-height: 1.0; margin-top: 0.4vh;"; 
        let leftOnClick = "onclick=\"handleCalendarDaySelection('" + thisWeekDay.payloadValue + "')\"";

        if (thisWeekDay.isSunday) {
            leftBtnStyle = "height: 100%; width: 100%; background-color: #ECEFF1; border: 0.3vh solid #7A869A; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3vh 0; outline: none; pointer-events: none; opacity: 0.5; filter: grayscale(1);";
            leftDayStyle = "font-size: 2.8vh; font-weight: 900; color: #7A869A; line-height: 1.1;";
            leftDateStyle = "font-size: 3.0vh; font-weight: 900; color: #7A869A; line-height: 1.0; margin-top: 0.4vh;";
            leftOnClick = "";
        }

        // 2. PROCESS RIGHT COLUMN CELL (NEXT WEEK)
        let rightBtnStyle = "height: 100%; width: 100%; background-color: #e1f5fe; border: 0.3vh solid #000000; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0px 0.3vh 0px #000000; padding: 0.3vh 0; outline: none; pointer-events: auto;";
        let rightDayStyle = "font-size: 2.8vh; font-weight: 900; color: #000000; line-height: 1.1;";
        let rightDateStyle = "font-size: 3.0vh; font-weight: 900; color: #333333; line-height: 1.0; margin-top: 0.4vh;"; 
        let rightOnClick = "onclick=\"handleCalendarDaySelection('" + nextWeekDay.payloadValue + "')\"";

        if (nextWeekDay.isSunday) {
            rightBtnStyle = "height: 100%; width: 100%; background-color: #ECEFF1; border: 0.3vh solid #7A869A; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.3vh 0; outline: none; pointer-events: none; opacity: 0.5; filter: grayscale(1);";
            rightDayStyle = "font-size: 2.8vh; font-weight: 900; color: #7A869A; line-height: 1.1;";
            rightDateStyle = "font-size: 3.0vh; font-weight: 900; color: #7A869A; line-height: 1.0; margin-top: 0.4vh;";
            rightOnClick = "";
        }

        // Construct vertical columns side-by-side using secure string additions
        gridHTML += "<button type=\"button\" " + leftOnClick + " style=\"" + leftBtnStyle + "\">" +
                        "<span style=\"" + leftDayStyle + "\">" + thisWeekDay.dayLabel + "</span>" +
                        "<span style=\"" + leftDateStyle + "\">" + thisWeekDay.dateLabel + "</span>" +
                    "</button>";

        gridHTML += "<button type=\"button\" " + rightOnClick + " style=\"" + rightBtnStyle + "\">" +
                    "<span style=\"" + rightDayStyle + "\">" + nextWeekDay.dayLabel + "</span>" +
                    "<span style=\"" + rightDateStyle + "\">" + nextWeekDay.dateLabel + "</span>" +
                    "</button>";
    }

    gridContainer.innerHTML = gridHTML;
}

/**
 * Capture click event from calendar days, map the value onto the form, 
 * and evaluate print availability state rules immediately.
 */
function handleCalendarDaySelection(datePayloadString) {
    console.log("🗓️ Calendar Day Selection Committed: [" + datePayloadString + "]");
    
    const dateInput = document.getElementById('dispatch-input-date');
    if (dateInput) {
        dateInput.value = datePayloadString;
        
        // Trigger verification engine checks to instantly evaluate if PRINT can unlock
        updateDispatchPrintButtonState();
    }
    
    dismissDispatchCalendarOverlay();
}

/**
 * Unhides the central calendar grid structural viewport container
 */
function launchDispatchCalendarOverlay() {
    renderDispatchCalendarGrid(); // Refresh rolling date tracks dynamically from device clock
    
    const calendarModal = document.getElementById('dispatch-calendar-modal');
    if (calendarModal) {
        calendarModal.classList.remove('modal-hide');
        calendarModal.style.setProperty('display', 'flex', 'important');
    }
}

/**
 * Hides the calendar grid structural container panel completely
 */
function dismissDispatchCalendarOverlay() {
    const calendarModal = document.getElementById('dispatch-calendar-modal');
    if (calendarModal) {
        calendarModal.style.setProperty('display', 'none', 'important');
        calendarModal.classList.add('modal-hide');
    }
    
    // Smoothly clear focus background parameters back to neutral gray state
    clearAllDispatchCollectionFocus();
}

/**
 * Production Dashboard & Label Printing Kiosk - Core Application Controller
 * Pure Vanilla JavaScript implementation for low-power Linux / Raspberry Pi devices.
 */

// ==========================================================================
// 1. CORE APPLICATION STATE & SYSTEM TRACKERS
// ==========================================================================

// Active screen state matching sitemap: "1", "1A", "2", "2A", "3", "3A", "4", "5", "6", "7"
let currentActiveScreen = "1";

// Workspace color mode: STANDARD_GREEN, ADMIN_PURPLE, PLAIN_MODE, DISPATCH_MODE
let currentActiveWorkspaceMode = "STANDARD_GREEN";

// System calendar tracking parameters
let currentYear = new Date().getFullYear();
let shortDatePeriod = 1;
let monthActiveTargetYearInt = null;
let isKioskShiftActive = false;

const fullMonthNamesMap = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

// Color cycle for 4-year rolling matrix rows
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// Operational mode flags
let isDemoModeActive = false;
let isAdminMultiplesModeActive = false;
let multiplesCountTarget = 1;
let lastExecutedPrintPayload = null;

// Administrative access settings
let adminSystemPassword = "DCPdrum1";
let pendingAdminOptionKey = null;

// Base runtime configuration matching config.json structure
let kioskConfig = {
    isFourthYearReleased: true,
    showPrintConfirmation: true,
    securityPin: "1234",
    shortDatePeriod: 1,
    isDemoModeActive: false
};

// Dispatch logistics tracking state
let activeDispatchStep = "trolleys";
let currentDispatchTrolleysValue = "";
let currentDispatchTraysValue = "";
let currentDispatchDateValue = "";

// Screen 7 List Editor State
let activeEditorFileKey = "";
let activeFocusedInputId = null;
let activeFocusedFieldKey = "line1";
let currentListSchemaDataArray = [];

// Secret administrative recovery tap tracker
let secretPinkSquareTapCount = 0;
let secretPinkSquareTimeoutId = null;

// ==========================================================================
// 2. NETWORK & HARDWARE COMMUNICATION LAYER
// ==========================================================================

/**
 * Resolves the API base URL dynamically.
 * Works seamlessly whether hosted on the Raspberry Pi port 8080, an IP address,
 * or through a local development proxy.
 */
function getApiBaseUrl() {
    if (window.location.port === "8080" || window.location.port === "3000") {
        return "";
    }
    return window.location.origin.includes("localhost") ? "http://localhost:8080" : "";
}

/**
 * Polls the CUPS printer hardware queue status via the backend daemon.
 * Updates LED indicators in the right sidebar.
 */
function pollPrinterHardwareStatus() {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/printers/status`)
        .then(res => res.json())
        .then(statusMap => {
            const colorMapping = ['pink', 'green', 'yellow', 'blue', 'plain', 'dispatch'];
            const statusRows = document.querySelectorAll('.status-row');

            colorMapping.forEach((color, index) => {
                if (statusRows[index]) {
                    const ledDot = statusRows[index].querySelector('.led-dot');
                    if (ledDot) {
                        if (statusMap[color]) {
                            ledDot.classList.remove('led-offline');
                            ledDot.classList.add('led-online');
                        } else {
                            ledDot.classList.remove('led-online');
                            ledDot.classList.add('led-offline');
                        }
                    }
                }
            });
        })
        .catch(() => {
            // Server offline: leave indicators in their current state
        });
}

/**
 * Loads configuration state from config.json.
 */
function loadKioskConfigurationState() {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/config.json`)
        .then(response => {
            if (!response.ok) throw new Error("Config file missing or server unreachable.");
            return response.json();
        })
        .then(parsedConfig => {
            kioskConfig = { ...kioskConfig, ...parsedConfig };
            shortDatePeriod = kioskConfig.shortDatePeriod !== undefined ? kioskConfig.shortDatePeriod : 1;
            isDemoModeActive = kioskConfig.isDemoModeActive !== undefined ? kioskConfig.isDemoModeActive : false;

            const demoCheckbox = document.getElementById('admin-toggle-demo');
            if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;

            generateDynamicGrid();
            loadHomeMatrixCategories();
        })
        .catch(e => {
            console.warn("Configuration fetch failed, using runtime defaults:", e);
            isDemoModeActive = kioskConfig.isDemoModeActive;
            const demoCheckbox = document.getElementById('admin-toggle-demo');
            if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;

            generateDynamicGrid();
            loadHomeMatrixCategories();
        });
}

/**
 * Persists runtime configuration to the Python backend on disk.
 */
function saveKioskConfigurationState() {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kioskConfig)
    })
    .catch(error => {
        console.error("Failed to push configuration changes to storage:", error);
        showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO SAVE CONFIGURATION TO DISK' }, 4000);
    });
}

/**
 * Dispatches physical print payloads to the CUPS spooler sequentially.
 */
async function executePhysicalPrintSpooler(payload, totalRuns) {
    if (!payload) return;

    const mainWrapper = document.getElementById('main-app-wrapper');
    if (mainWrapper) mainWrapper.classList.remove('printing-active-state');

    if (isDemoModeActive) {
        let displayYearText = payload.year;
        if (payload.q === 'EFB_LABEL' || payload.q === 'BLANK_DISPATCH' || payload.color === 'plain') {
            displayYearText = '';
        }

        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: displayYearText, 
            hexColor: payload.finalHex 
        }, 3000);
        return;
    }

    const baseUrl = getApiBaseUrl();

    try {
        if (payload.color === 'dispatch' && payload.q === 'ACTIVE_DISPATCH') {
            const totalTrolleysCount = parseInt(payload.year) || 1;

            for (let currentNumber = 1; currentNumber <= totalTrolleysCount; currentNumber++) {
                const structuralPostPayload = {
                    color: payload.color,
                    cwrd1: payload.cwrd1,
                    cwrd2: payload.cwrd2,
                    q: payload.q,
                    year: currentNumber.toString(),
                    m1: payload.m1,
                    m2: payload.m2,
                    m3: payload.m3,
                    total_trolleys: totalTrolleysCount.toString()
                };

                const response = await fetch(`${baseUrl}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(structuralPostPayload)
                });

                if (!response.ok) throw new Error(`HTTP loop error status: ${response.status}`);
            }
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

            for (let run = 0; run < totalRuns; run++) {
                const response = await fetch(`${baseUrl}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(structuralPostPayload)
                });

                if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
            }
        }

        let displayYearText = payload.year;
        if (payload.q === 'EFB_LABEL' || payload.q === 'BLANK_DISPATCH' || payload.color === 'plain') {
            displayYearText = '';
        } else if (payload.color === 'dispatch' && payload.q === 'ACTIVE_DISPATCH') {
            displayYearText = `BATCH RUN OF ${payload.year}`;
        }

        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${payload.cwrd1} ${payload.cwrd2}`.trim(), 
            periodText: payload.finalPeriod, 
            yearText: displayYearText, 
            hexColor: payload.finalHex 
        }, 3000);

    } catch (error) {
        console.error('Print spooling error:', error);
        if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
        showUserAlert('SYSTEM_ALERT', { message: 'PRINTER ROUTER CONNECTION OFFLINE' }, 5000);
    }
}

/**
 * Triggers hardware verification sweep on all CUPS printer queues.
 */
function triggerAdminPrinterResetAction() {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/printers/reset`)
        .then(res => {
            if (!res.ok) throw new Error("Server rejected verification sweep.");
            return res.json();
        })
        .then(() => {
            pollPrinterHardwareStatus();
        })
        .catch(err => {
            console.error("Printer reset failed:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'HARDWARE VERIFICATION SWEEP FAILED' }, 4000);
        });
}

// ==========================================================================
// 3. CENTRAL STATE ENGINE CONTROLLER (SCREEN ROUTER)
// ==========================================================================

/**
 * Transitions layout and visible containers based on target screen index.
 */
function switchKioskScreenLayout(targetScreenName) {
    currentActiveScreen = targetScreenName;

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
    const dispatchBlankBtn = document.getElementById('sidebar-dispatch-blank-wrapper');
    const plainEfbBtn = document.getElementById('sidebar-plain-efb-wrapper') || document.getElementById('sidebar-dispatch-efb-wrapper');

    // Hide all view containers
    const allContainers = [homeTrack, workspaceView, monthView, adminView, editorWorkspace, dispatchView];
    allContainers.forEach(container => {
        if (container) {
            container.classList.add('screen-hide');
            container.style.removeProperty('display');
        }
    });

    // Reset baseline sidebar element visibility
    if (sidebarContainer) sidebarContainer.classList.remove('screen-hide');
    if (homeDeck) homeDeck.style.setProperty('display', 'none', 'important');
    if (screen2Deck) screen2Deck.classList.add('screen-hide');
    if (monthsActionWrapper) monthsActionWrapper.style.setProperty('display', 'none', 'important');
    if (sidebarCloseBtn) sidebarCloseBtn.style.setProperty('display', 'none', 'important');
    if (multiprintBtn) multiprintBtn.style.setProperty('display', 'none', 'important');
    if (dispatchBlankBtn) dispatchBlankBtn.style.setProperty('display', 'none', 'important');
    if (plainEfbBtn) plainEfbBtn.style.setProperty('display', 'none', 'important');

    // Resolve workspace mode & background color
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

    // Activate target screen containers
    switch (targetScreenName) {
        case "1": // Home Screen (Standard Single Category Selection)
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (homeDeck) homeDeck.style.setProperty('display', 'flex', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "1A": // Category Selection Screen (Admin Multi-Print)
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = true;
            break;

        case "2": // Quarter-Year Selection Screen (Standard Single-Print Matrix)
            if (workspaceView) {
                workspaceView.classList.remove('screen-hide');
                workspaceView.style.setProperty('display', 'flex', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
            isAdminMultiplesModeActive = false;
            break;

        case "2A": // Quarter-Year Selection Screen (Admin Multi-Print Matrix)
            if (workspaceView) {
                workspaceView.classList.remove('screen-hide');
                workspaceView.style.setProperty('display', 'flex', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (monthsActionWrapper) monthsActionWrapper.style.removeProperty('display');
            isAdminMultiplesModeActive = true;
            break;

        case "3": // Month Selection Screen (Standard Single-Print View)
            if (monthView) {
                monthView.classList.remove('screen-hide');
                monthView.style.setProperty('display', 'flex', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = false;
            break;

        case "3A": // Month Selection Screen (Admin Multi-Print View)
            if (monthView) {
                monthView.classList.remove('screen-hide');
                monthView.style.setProperty('display', 'flex', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            isAdminMultiplesModeActive = true;
            break;

        case "4": // Plain Labels Selection Workspace
            if (homeTrack) homeTrack.classList.remove('screen-hide');
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (plainEfbBtn) plainEfbBtn.style.setProperty('display', 'block', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "5": // Dispatch Labels Grid Workspace
            if (dispatchView) {
                dispatchView.classList.remove('screen-hide');
                dispatchView.style.setProperty('display', 'flex', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (dispatchBlankBtn) dispatchBlankBtn.style.setProperty('display', 'block', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "6": // Administrative Control Dashboard
            if (adminView) {
                adminView.classList.remove('screen-hide');
                adminView.style.setProperty('display', 'grid', 'important');
            }
            if (screen2Deck) screen2Deck.classList.remove('screen-hide');
            if (sidebarCloseBtn) sidebarCloseBtn.style.setProperty('display', 'block', 'important');
            if (multiprintBtn) multiprintBtn.style.setProperty('display', 'block', 'important');
            isAdminMultiplesModeActive = false;
            break;

        case "7": // Fullscreen Three-Pane List Editing Suite
            if (editorWorkspace) {
                editorWorkspace.classList.remove('screen-hide');
                editorWorkspace.style.setProperty('display', 'block', 'important');
            }
            if (sidebarContainer) sidebarContainer.classList.add('screen-hide');
            isAdminMultiplesModeActive = false;
            break;
    }
}

/**
 * Universal Navigation Sidebar Action Manager.
 */
function sidebarAction(action) {
    if (action === 'PLAIN_MODE') {
        loadPlainLabelsMatrix();
        switchKioskScreenLayout("4");
        return;
    }
    
    if (action === 'DISPATCH_MODE') {
        loadDispatchLabelsMatrix();
        switchKioskScreenLayout("5");
        return;
    }

    if (action === 'BACK') {
        switch (currentActiveScreen) {
            case "1A":
                switchKioskScreenLayout("6");
                break;

            case "2": {
                const slot1 = document.getElementById('cat-word1');
                const slot2 = document.getElementById('cat-word2');
                if (slot1) slot1.textContent = '';
                if (slot2) slot2.textContent = '';
                switchKioskScreenLayout("1");
                break;
            }

            case "2A":
                switchKioskScreenLayout("1A");
                break;

            case "3":
                switchKioskScreenLayout("2");
                break;

            case "3A":
                switchKioskScreenLayout("2A");
                break;

            case "4":
                loadHomeMatrixCategories();
                switchKioskScreenLayout("1");
                break;

            case "5":
            case "6":
                switchKioskScreenLayout("1");
                break;

            default:
                switchKioskScreenLayout("1");
                break;
        }
        return;
    }

    if (action === 'MONTHS') {
        const systemYear = new Date().getFullYear();
        monthActiveTargetYearInt = monthActiveTargetYearInt || systemYear;

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

// ==========================================================================
// 4. CATEGORY & PLAIN LABELS MATRIX LOADERS (SCREENS 1 & 4)
// ==========================================================================

/**
 * Loads category database array and dynamically renders the 35-button matrix grid.
 */
function loadHomeMatrixCategories() {
    const homeGrid = document.getElementById('home-category-grid');
    if (!homeGrid) return;

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/list?name=category`)
        .then(res => {
            if (!res.ok) throw new Error("Category database missing or unreachable.");
            return res.json();
        })
        .then(categoryDataArray => {
            let matrixHTML = '';

            for (let index = 0; index < 35; index++) {
                const slotItem = categoryDataArray[index] || {};
                const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
                const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
                
                let displayLabelSummary = `${line1Text} ${line2Text}`.trim();
                let graphicFile = (slotItem.image_file || "blank.jpg").toString().trim().toLowerCase();

                let inlineHomeBgOverride = "";
                if (displayLabelSummary === "") {
                    graphicFile = "categoryblank.png";
                    inlineHomeBgOverride = "background-color: #EFE6BA !important;";
                }

                matrixHTML += `
                    <button class="home-cat-btn" style="${inlineHomeBgOverride}" onclick="handleHomeCategoryMatrixClick(this)">
                        <span class="btn-text">${displayLabelSummary}</span>
                        <img src="label-graphics/${graphicFile}" class="btn-icon" alt="Icon">
                    </button>`;
            }

            homeGrid.innerHTML = matrixHTML;
        })
        .catch(err => {
            console.error("Failed to load categories:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO LOAD CATEGORIES FROM DISK' }, 4000);
        });
}

/**
 * Consolidates toiletries, christmas, and misc lists for Screen 4 (Plain Labels).
 */
function loadPlainLabelsMatrix() {
    const baseUrl = getApiBaseUrl();
    Promise.all([
        fetch(`${baseUrl}/api/list?name=toiletries`).then(res => res.json()),
        fetch(`${baseUrl}/api/list?name=christmas`).then(res => res.json()),
        fetch(`${baseUrl}/api/list?name=misc`).then(res => res.json())
    ])
    .then(([toiletriesArray, christmasArray, miscArray]) => {
        const consolidatedPlainItems = [];

        for (let i = 0; i < 14; i++) {
            consolidatedPlainItems.push(toiletriesArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }
        for (let i = 0; i < 14; i++) {
            consolidatedPlainItems.push(christmasArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }
        for (let i = 0; i < 7; i++) {
            consolidatedPlainItems.push(miscArray[i] || { text1: "", text2: "", image_file: "blank.jpg" });
        }

        renderPlainLabelsMatrixContainer(consolidatedPlainItems);
    })
    .catch(error => {
        console.error("Plain Labels data loading error:", error);
        showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO CONSOLIDATE PLAIN DATA LISTS' }, 4000);
    });
}

/**
 * Renders consolidated plain items matrix directly onto the home selection grid.
 */
function renderPlainLabelsMatrixContainer(consolidatedItemsArray) {
    const homeGrid = document.getElementById('home-category-grid');
    if (!homeGrid) return;

    let plainMatrixHTML = '';

    consolidatedItemsArray.forEach(slotItem => {
        const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
        const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
        const displayLabelSummary = `${line1Text} ${line2Text}`.trim();
        
        let graphicFile = "categoryblank.png";
        if (displayLabelSummary !== "") {
            const rawFile = (slotItem.image_file || "categoryblank.png").toString().trim().toLowerCase();
            if (rawFile !== "" && rawFile !== "categoryblank.jpg") {
                graphicFile = rawFile;
            }
        }

        const inlinePlainBgColor = (displayLabelSummary !== "") ? "#FFFFFF" : "#F4F4F4";

        plainMatrixHTML += `
            <button class="home-cat-btn" 
                    style="background-color: ${inlinePlainBgColor} !important; box-shadow: 0px 0.5vh 0px rgba(0,0,0,1) !important;" 
                    onclick="handlePlainMatrixCellClick(this)">
                <span class="btn-text" style="font-size: 2.2vh !important; line-height: 1.0 !important;">${displayLabelSummary}</span>
                <img src="label-graphics/${graphicFile}" class="btn-icon" alt="Icon">
            </button>`;
    });

    homeGrid.innerHTML = plainMatrixHTML;
}

/**
 * Click handler for Plain Mode cells.
 */
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
        cwrd1: slot1 ? slot1.textContent : '',
        cwrd2: slot2 ? slot2.textContent : '',
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

/**
 * Click handler for standard Home category cells.
 */
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

    if (isAdminMultiplesModeActive) {
        switchKioskScreenLayout("2A");
    } else {
        switchKioskScreenLayout("2");
    }
}

// ==========================================================================
// 5. ROLLING EXPIRATION DATE MATRIX (SCREENS 2 & 2A)
// ==========================================================================

/**
 * Builds the rolling 4-year expiration grid with expired / short-date calculations.
 */
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
            const zplPrintMonths = [];

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

/**
 * Handles click on quarter or full year card in Screen 2/2A.
 */
function handleCardClick(year, period, zplMonths) { 
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    const activeWord1 = slot1 ? slot1.textContent.trim() : '';
    const activeWord2 = slot2 ? slot2.textContent.trim() : '';

    const currentEvt = window.event || null;
    const activeBtn = currentEvt ? (currentEvt.currentTarget || currentEvt.target) : null;
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
    if (Array.isArray(zplMonths) && zplMonths.length === 3) {
        month1 = zplMonths[0];
        month2 = zplMonths[1];
        month3 = zplMonths[2];
    } else if (Array.isArray(zplMonths) && zplMonths.length > 0) {
        month1 = zplMonths[0];
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
    
    lastExecutedPrintPayload = { 
        ...printPayload, 
        finalHex: targetHexColor, 
        finalPeriod: displayQuarterText 
    };

    if (isAdminMultiplesModeActive) {
        triggerMultiplesQuantityOverlay();
    } else {
        executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);
    }
}

/**
 * Advances year rollover for testing and simulation.
 */
function triggerManualRollOver() {
    currentYear += 1;
    generateDynamicGrid();
}

// ==========================================================================
// 6. MONTH SELECTION MATRIX (SCREENS 3 & 3A)
// ==========================================================================

/**
 * Resolves 4-year industrial color scheme mapping.
 */
function resolveYearThemeHexColor(targetYear) {
    const remainder = targetYear % 4;
    if (remainder === 2) return '#ffcdd2'; // Pink
    if (remainder === 3) return '#a5d6a7'; // Green
    if (remainder === 0) return '#fff59d'; // Yellow
    return '#81d4fa';                      // Blue
}

/**
 * Toggles between Current Year and Next Year scopes on the Months layout.
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
 * Validates calendar cells against expiration and short-date rules.
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
        cellButton.style.backgroundColor = themeColor;
        
        if (isExpired || isShortDate) {
            cellButton.classList.add('month-inactive');
        }
    }
}

/**
 * Handles click on individual month button.
 */
function handleMonthGridCellClick(monthIndexInt) {
    const word1El = document.getElementById('month-cat-word1');
    const word2El = document.getElementById('month-cat-word2');
    const word1 = word1El ? word1El.textContent.trim() : '';
    const word2 = word2El ? word2El.textContent.trim() : '';
    const monthName = fullMonthNamesMap[monthIndexInt];
    
    let targetColorTrackingString = "green";
    const yearColorHex = resolveYearThemeHexColor(monthActiveTargetYearInt);
    
    const targetRemainder = monthActiveTargetYearInt % 4;
    if (targetRemainder === 2) targetColorTrackingString = 'pink';
    else if (targetRemainder === 3) targetColorTrackingString = 'green';
    else if (targetRemainder === 0) targetColorTrackingString = 'yellow';
    else if (targetRemainder === 1) targetColorTrackingString = 'blue';

    lastExecutedPrintPayload = {
        color: targetColorTrackingString,
        cwrd1: word1,
        cwrd2: word2,
        q: "MM",
        year: monthActiveTargetYearInt,
        m1: monthName,
        m2: " ",
        m3: " ",
        finalHex: yearColorHex,
        finalPeriod: monthName
    };

    if (isAdminMultiplesModeActive) {
        triggerMultiplesQuantityOverlay();
    } else {
        executePhysicalPrintSpooler(lastExecutedPrintPayload, 1);
    }
}

// ==========================================================================
// 7. DISPATCH LOGISTICS & SCOREBOARD ENGINE (SCREEN 5)
// ==========================================================================

/**
 * Loads dispatch addresses from database and populates the 6x7 button grid.
 */
function loadDispatchLabelsMatrix() {
    const dispatchGrid = document.getElementById('dispatch-labels-grid');
    if (!dispatchGrid) return;

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/list?name=dispatch`)
        .then(res => {
            if (!res.ok) throw new Error("Dispatch database missing or unreachable.");
            return res.json();
        })
        .then(dispatchDataArray => {
            let matrixHTML = '';

            for (let index = 0; index < 42; index++) {
                const slotItem = dispatchDataArray[index] || {};
                const line1Text = (slotItem.text1 || "").toString().trim().toUpperCase();
                const line2Text = (slotItem.text2 || "").toString().trim().toUpperCase();
                const hiddenPostcode = (slotItem.postcode || "").toString().trim().toUpperCase();

                if (line1Text !== "" || line2Text !== "") {
                    matrixHTML += `
                        <button class="dispatch-cat-btn" data-index="${index}" data-postcode="${hiddenPostcode}" onclick="handleDispatchMatrixCellClick(this)">
                            <div class="btn-text">${line1Text}<br>${line2Text}</div>
                        </button>`;
                } else {
                    matrixHTML += `
                        <button class="dispatch-cat-btn dispatch-inactive">
                            <div class="btn-text"></div>
                        </button>`;
                }
            }

            dispatchGrid.innerHTML = matrixHTML;
        })
        .catch(err => {
            console.error("Failed to load dispatch data:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO LOAD DISPATCH DATA FROM DISK' }, 4000);
        });
}

/**
 * Shared helper to initialize the dispatch scoreboard overlay.
 */
function setupDispatchScoreboard(line1, line2, postcode) {
    currentActiveWorkspaceMode = "DISPATCH_MODE";
    activeDispatchStep = "trolleys";

    currentDispatchTrolleysValue = "";
    currentDispatchTraysValue = "";
    currentDispatchDateValue = "";

    lastExecutedPrintPayload = {
        color: "dispatch",
        cwrd1: line1,
        cwrd2: line2,
        m1: postcode,
        q: "ACTIVE_DISPATCH"
    };

    const sbLine1 = document.getElementById('scoreboard-text-line1');
    const sbLine2 = document.getElementById('scoreboard-text-line2');
    const sbDispTrolleys = document.getElementById('scoreboard-display-trolleys');
    const sbDispTrays = document.getElementById('scoreboard-display-trays');
    const sbDispDay = document.getElementById('scoreboard-display-day');
    const sbStatusText = document.getElementById('scoreboard-status-confirmation-row');

    if (sbLine1) sbLine1.textContent = line1.toUpperCase();
    if (sbLine2) sbLine2.textContent = line2.toUpperCase();
    if (sbDispTrolleys) sbDispTrolleys.textContent = "—";
    if (sbDispTrays) sbDispTrays.textContent = "—";
    if (sbDispDay) sbDispDay.textContent = "—";
    if (sbStatusText) sbStatusText.textContent = "";

    const scoreboardModal = document.getElementById('dispatch-data-collection-modal');
    if (scoreboardModal) {
        scoreboardModal.classList.remove('modal-hide');
        scoreboardModal.style.setProperty('display', 'flex', 'important');
    }

    triggerUniversalKeypadStep();
}

/**
 * Handles click on destination button on Screen 5.
 */
function handleDispatchMatrixCellClick(buttonElement) {
    if (!buttonElement) return;

    const innerTextDiv = buttonElement.querySelector('.btn-text');
    let btnLine1 = "";
    let btnLine2 = "";
    
    if (innerTextDiv) {
        const textLines = innerTextDiv.innerHTML.split('<br>');
        btnLine1 = (textLines[0] || "").trim().toUpperCase();
        btnLine2 = (textLines[1] || "").trim().toUpperCase();
    }
    
    const btnPostcode = (buttonElement.getAttribute('data-postcode') || "").trim().toUpperCase();
    setupDispatchScoreboard(btnLine1, btnLine2, btnPostcode);
}

/**
 * External or programmatic trigger for dispatch collection overlay.
 */
function launchDispatchDataCollectionOverlay(item) {
    if (!item) return;
    setupDispatchScoreboard(item.text1 || "", item.text2 || "", item.image_file || item.postcode || "");
}

/**
 * Prepares and displays the numeric keypad for Trolley and Tray quantities.
 */
function triggerUniversalKeypadStep() {
    const keypadTitle = document.getElementById('multiples-modal-title');
    const keypadSubmitText = document.getElementById('multiples-modal-submit-text');
    const ctxLine1 = document.getElementById('keypad-context-line1');
    const ctxLine2 = document.getElementById('keypad-context-line2');
    const countBadge = document.getElementById('admin-multiples-count-badge');

    multiplesCountTarget = "";
    if (countBadge) countBadge.value = "";

    if (lastExecutedPrintPayload) {
        if (ctxLine1) ctxLine1.textContent = (lastExecutedPrintPayload.cwrd1 || "").toUpperCase();
        if (ctxLine2) ctxLine2.textContent = (lastExecutedPrintPayload.cwrd2 || "").toUpperCase();
    }

    if (activeDispatchStep === "trolleys") {
        if (keypadTitle) keypadTitle.textContent = "How many trolleys?";
        if (keypadSubmitText) keypadSubmitText.textContent = "ENTER";
    } else if (activeDispatchStep === "trays") {
        if (keypadTitle) keypadTitle.textContent = "How many trays?";
        if (keypadSubmitText) keypadSubmitText.textContent = "ENTER";
    }

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.classList.remove('modal-hide');
        multiplesModal.style.setProperty('display', 'flex', 'important');
    }
}

/**
 * Dismisses all dispatch workflow overlays and resets state.
 */
function dismissDispatchCollectionOverlay() {
    const scoreboardModal = document.getElementById('dispatch-data-collection-modal');
    if (scoreboardModal) {
        scoreboardModal.style.setProperty('display', 'none', 'important');
        scoreboardModal.classList.add('modal-hide');
    }

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }
    
    currentActiveWorkspaceMode = "";
}

/**
 * Handles Blank Dispatch button click on Screen 5 sidebar.
 */
function handleBlankDispatchLabelsClick() {
    lastExecutedPrintPayload = {
        color: "dispatch",
        cwrd1: "BLANK DISPATCH STOCK",
        cwrd2: "",
        q: "BLANK_DISPATCH",
        year: " ",
        m1: "blankDispatchLabel.zpl",
        m2: " ",
        m3: " ",
        finalHex: "#e1f5fe",
        finalPeriod: "MANUAL FILL"
    };

    triggerMultiplesQuantityOverlay();
}

/**
 * Handles EFB Emergency Food Box button click on Screen 4 ('Plain Labels') sidebar.
 * Directly launches universal numeric keypad for EFB label quantity.
 */
function handleEfbButtonClick() {
    lastExecutedPrintPayload = {
        color: "plain",
        cwrd1: "EFB Labels",
        cwrd2: "",
        q: "EFB_LABEL",
        year: "",
        m1: "efb-label.zpl",
        m2: "fb-logo90.png",
        m3: " ",
        finalHex: "#b58451",
        finalPeriod: ""
    };

    triggerEfbNumericKeypad("EFB Labels");
}

/**
 * Dismisses the EFB label selection overlay if invoked.
 */
function dismissEfbLabelSelectModal() {
    const efbModal = document.getElementById('efb-label-select-modal');
    if (efbModal) {
        efbModal.style.setProperty('display', 'none', 'important');
        efbModal.classList.add('modal-hide');
    }
}

/**
 * Opens the universal numeric keypad configured for EFB label quantity.
 */
function triggerEfbNumericKeypad(labelTitle) {
    const keypadTitle = document.getElementById('multiples-modal-title');
    const keypadSubmitText = document.getElementById('multiples-modal-submit-text');
    const ctxLine1 = document.getElementById('keypad-context-line1');
    const ctxLine2 = document.getElementById('keypad-context-line2');
    const countBadge = document.getElementById('admin-multiples-count-badge');

    multiplesCountTarget = "";
    if (countBadge) countBadge.value = "";

    if (ctxLine1) {
        ctxLine1.textContent = labelTitle || "EFB Labels";
        ctxLine1.style.display = "block";
    }
    if (ctxLine2) {
        ctxLine2.textContent = "";
        ctxLine2.style.display = "none";
    }
    if (keypadTitle) keypadTitle.textContent = "How many labels?";
    if (keypadSubmitText) keypadSubmitText.textContent = "PRINT";

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.classList.remove('modal-hide');
        multiplesModal.style.setProperty('display', 'flex', 'important');
    }
}

/**
 * Builds rolling 14-day calendar grid with weekend lockouts and dd/mm date format.
 */
function renderDispatchCalendarGrid() {
    const calendarGrid = document.getElementById('dispatch-calendar-days-grid');
    if (!calendarGrid) return;

    let gridHTML = '';
    const calculatedDaysArray = [];
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);

        const dayOfWeekNum = d.getDay();
        const dayOfWeekStr = dayNames[dayOfWeekNum];
        
        const dateNum = d.getDate();
        const monthNum = d.getMonth() + 1;
        
        const paddedDate = dateNum < 10 ? "0" + dateNum : dateNum;
        const paddedMonth = monthNum < 10 ? "0" + monthNum : monthNum;

        const displayDateString = paddedDate + "/" + paddedMonth;
        const targetPrintString = dayOfWeekStr + " " + displayDateString;
        const isWeekendSlot = (dayOfWeekNum === 0 || dayOfWeekNum === 6);

        calculatedDaysArray.push({
            dayLabel: dayOfWeekStr,
            dateLabel: displayDateString,
            payloadValue: targetPrintString,
            isSunday: isWeekendSlot
        });
    }

    for (let rowIndex = 0; rowIndex < 7; rowIndex++) {
        const thisWeekDay = calculatedDaysArray[rowIndex];       
        const nextWeekDay = calculatedDaysArray[rowIndex + 7];   

        let leftBtnStyle = "height: 7.5vh; width: 100%; background-color: #e1f5fe; border: 0.3vh solid #000000; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0px 0.3vh 0px #000000; outline: none; pointer-events: auto;";
        let leftDayStyle = "font-size: 2.4vh; font-weight: 900; color: #000000; line-height: 1.1; letter-spacing: 0.5px;";
        let leftDateStyle = "font-size: 1.8vh; font-weight: 700; color: #333333; line-height: 1.0; margin-top: 0.3vh;"; 
        let leftOnClick = `onclick="handleCalendarDaySelection('${thisWeekDay.payloadValue}')"`;

        if (thisWeekDay.isSunday) {
            leftBtnStyle = "height: 7.5vh; width: 100%; background-color: #ECEFF1; border: 0.3vh solid #7A869A; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; outline: none; pointer-events: none; opacity: 0.4; filter: grayscale(1);";
            leftDayStyle = "font-size: 2.4vh; font-weight: 900; color: #7A869A; line-height: 1.1;";
            leftDateStyle = "font-size: 1.8vh; font-weight: 700; color: #7A869A; line-height: 1.0; margin-top: 0.3vh;";
            leftOnClick = "";
        }

        let rightBtnStyle = "height: 7.5vh; width: 100%; background-color: #e1f5fe; border: 0.3vh solid #000000; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0px 0.3vh 0px #000000; outline: none; pointer-events: auto;";
        let rightDayStyle = "font-size: 2.4vh; font-weight: 900; color: #000000; line-height: 1.1; letter-spacing: 0.5px;";
        let rightDateStyle = "font-size: 1.8vh; font-weight: 700; color: #333333; line-height: 1.0; margin-top: 0.3vh;"; 
        let rightOnClick = `onclick="handleCalendarDaySelection('${nextWeekDay.payloadValue}')"`;

        if (nextWeekDay.isSunday) {
            rightBtnStyle = "height: 7.5vh; width: 100%; background-color: #ECEFF1; border: 0.3vh solid #7A869A; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; outline: none; pointer-events: none; opacity: 0.4; filter: grayscale(1);";
            rightDayStyle = "font-size: 2.4vh; font-weight: 900; color: #7A869A; line-height: 1.1;";
            rightDateStyle = "font-size: 1.8vh; font-weight: 700; color: #7A869A; line-height: 1.0; margin-top: 0.3vh;";
            rightOnClick = "";
        }

        gridHTML += `<button type="button" ${leftOnClick} style="${leftBtnStyle}">
                        <span style="${leftDayStyle}">${thisWeekDay.dayLabel}</span>
                        <span style="${leftDateStyle}">${thisWeekDay.dateLabel}</span>
                    </button>`;

        gridHTML += `<button type="button" ${rightOnClick} style="${rightBtnStyle}">
                        <span style="${rightDayStyle}">${nextWeekDay.dayLabel}</span>
                        <span style="${rightDateStyle}">${nextWeekDay.dateLabel}</span>
                    </button>`;
    }

    calendarGrid.innerHTML = gridHTML;
}

/**
 * Handles day selection from the dispatch calendar grid.
 */
function handleCalendarDaySelection(dateString) {
    if (!dateString) return;

    const parts = dateString.split(" ");
    const shortDay = parts[0] ? parts[0].toUpperCase() : "";
    const dateAndMonth = parts[1] || "";

    const dayNameMap = {
        "MON": "MONDAY",
        "TUE": "TUESDAY",
        "WED": "WEDNESDAY",
        "THU": "THURSDAY",
        "FRI": "FRIDAY",
        "SAT": "SATURDAY",
        "SUN": "SUNDAY"
    };

    const fullDayName = dayNameMap[shortDay] || shortDay;
    currentDispatchDateValue = `${fullDayName} ${dateAndMonth}`;

    const sbDispDay = document.getElementById('scoreboard-display-day');
    if (sbDispDay) sbDispDay.textContent = dateString;

    const dateModal = document.getElementById('dispatch-calendar-modal');
    if (dateModal) {
        dateModal.style.setProperty('display', 'none', 'important');
        dateModal.classList.add('modal-hide');
    }

    if (lastExecutedPrintPayload) {
        lastExecutedPrintPayload.year = currentDispatchTrolleysValue;
        lastExecutedPrintPayload.total_trolleys = currentDispatchTrolleysValue;
        lastExecutedPrintPayload.m2 = currentDispatchTraysValue;
        lastExecutedPrintPayload.m3 = currentDispatchDateValue;
    }

    const totalLabelsToPrint = parseInt(currentDispatchTrolleysValue) || 1;
    executePhysicalPrintSpooler(lastExecutedPrintPayload, totalLabelsToPrint);

    const sbStatusText = document.getElementById('scoreboard-status-confirmation-row');
    if (sbStatusText) {
        sbStatusText.textContent = "PRINTING";
        sbStatusText.style.color = "#4A8B5B";
    }

    setTimeout(() => {
        const scoreboardModal = document.getElementById('dispatch-data-collection-modal');
        if (scoreboardModal) {
            scoreboardModal.style.setProperty('display', 'none', 'important');
            scoreboardModal.classList.add('modal-hide');
        }

        currentActiveWorkspaceMode = "";
        switchKioskScreenLayout("1");
    }, 3000);
}

function launchDispatchCalendarOverlay() {
    renderDispatchCalendarGrid();
    const calendarModal = document.getElementById('dispatch-calendar-modal');
    if (calendarModal) {
        calendarModal.classList.remove('modal-hide');
        calendarModal.style.setProperty('display', 'flex', 'important');
    }
}

function dismissDispatchCalendarOverlay() {
    const calendarModal = document.getElementById('dispatch-calendar-modal');
    if (calendarModal) {
        calendarModal.style.setProperty('display', 'none', 'important');
        calendarModal.classList.add('modal-hide');
    }
}

function handleCalendarManualCancelAction() {
    const sbDispTrolleys = document.getElementById('scoreboard-display-trolleys');
    const sbDispTrays = document.getElementById('scoreboard-display-trays');
    const sbDispDay = document.getElementById('scoreboard-display-day');
    const sbStatusText = document.getElementById('scoreboard-status-confirmation-row');

    if (sbDispTrolleys) sbDispTrolleys.textContent = "—";
    if (sbDispTrays) sbDispTrays.textContent = "—";
    if (sbDispDay) sbDispDay.textContent = "—";
    if (sbStatusText) sbStatusText.textContent = "";

    currentDispatchTrolleysValue = "";
    currentDispatchTraysValue = "";
    currentDispatchDateValue = "";

    dismissDispatchCalendarOverlay();
    dismissDispatchCollectionOverlay();
}

// ==========================================================================
// 8. ADMINISTRATIVE & GATEKEEPER SECURITY (SCREEN 6)
// ==========================================================================

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

function pressPinPadKey(digitString) {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    const errorSlot = document.getElementById('gatekeeper-pin-error');
    if (!pinInput) return;
    
    if (errorSlot) errorSlot.style.display = 'none';

    if (pinInput.value.length < 4) {
        pinInput.value += digitString;
    }

    if (pinInput.value.length === 4) {
        setTimeout(verifyGatekeeperPinEntry, 200);
    }
}

function clearPinPadEntry() {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    if (pinInput) pinInput.value = '';
}

// Alias for clearPinPadEntry matching inline onclick="clearPinDisplay()" in HTML
function clearPinDisplay() {
    clearPinPadEntry();
}

// Backspace digit on gatekeeper PIN modal
function backspacePinDigit() {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    if (pinInput && pinInput.value.length > 0) {
        pinInput.value = pinInput.value.slice(0, -1);
    }
}

function dismissPinPadSecurity() {
    const securityModal = document.getElementById('gatekeeper-pin-modal');
    if (securityModal) {
        securityModal.style.setProperty('display', 'none', 'important');
        securityModal.classList.add('modal-hide');
    }
}

function verifyGatekeeperPinEntry() {
    const pinInput = document.getElementById('gatekeeper-pin-input');
    const errorSlot = document.getElementById('gatekeeper-pin-error');
    if (!pinInput) return;

    if (pinInput.value === kioskConfig.securityPin) {
        dismissPinPadSecurity();
        switchKioskScreenLayout("6");
        
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

    if (optionKey === 'DEFINE_SHORTDATE') {
        launchShortDateConfigPanel();
        return;
    }

    if (optionKey === 'RESET_PASSWORD') {
        launchAdminPinResetPanel();
        return;
    }

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

    executeValidatedAdminAction(optionKey);
}

function executeValidatedAdminAction(actionKey) {
    if (actionKey === 'CLOSE_PROGRAM') {
        setTimeout(() => { 
            window.open('', '_self', ''); 
            window.close(); 
            window.location.href = 'about:blank'; 
        }, 500);
        return;
    }
    
    if (actionKey === 'TOGGLE_DEMO') {
        isDemoModeActive = !isDemoModeActive;
        kioskConfig.isDemoModeActive = isDemoModeActive;
        
        const demoCheckbox = document.getElementById('admin-toggle-demo');
        if (demoCheckbox) demoCheckbox.checked = isDemoModeActive;
        
        saveKioskConfigurationState();
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

    if (actionKey === 'MULTIPLES') {
        isAdminMultiplesModeActive = true;
        switchKioskScreenLayout("1A");
        loadHomeMatrixCategories();
        return;
    }
}

// Short Date configuration dialogue
function launchShortDateConfigPanel() {
    const modal = document.getElementById('admin-shortdate-modal');
    if (modal) {
        modal.classList.remove('modal-hide');
        modal.style.setProperty('display', 'flex', 'important');
    }
}

function dismissShortDateConfigPanel() {
    const modal = document.getElementById('admin-shortdate-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.add('modal-hide');
    }
}

function submitShortDateConfigAdjustment(selectedTargetValueInt) {
    shortDatePeriod = selectedTargetValueInt;
    kioskConfig.shortDatePeriod = selectedTargetValueInt;
    
    saveKioskConfigurationState();
    generateDynamicGrid();
    dismissShortDateConfigPanel();
}

// PIN modification panel
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

function dismissAdminPinResetPanel() {
    const modal = document.getElementById('admin-pin-reset-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        modal.classList.add('modal-hide');
    }
}

function pressResetPinPadKey(digitString) {
    const displayField = document.getElementById('admin-new-pin-display');
    const errorSlot = document.getElementById('admin-pin-reset-error-msg');
    if (!displayField) return;
    
    if (errorSlot) errorSlot.style.display = "none";
    if (displayField.value.length < 4) {
        displayField.value += digitString;
    }
}

function clearResetPinPadEntry() {
    const displayField = document.getElementById('admin-new-pin-display');
    if (displayField) displayField.value = "";
}

function submitAdminPinResetAdjustment() {
    const displayField = document.getElementById('admin-new-pin-display');
    const errorSlot = document.getElementById('admin-pin-reset-error-msg');
    if (!displayField || !errorSlot) return;

    const targetNewPin = displayField.value;

    if (targetNewPin.length !== 4) {
        errorSlot.textContent = "Rejected: PIN must be 4 digits!";
        errorSlot.style.display = "block";
        return;
    }

    kioskConfig.securityPin = targetNewPin;
    saveKioskConfigurationState();
    dismissAdminPinResetPanel();
}

// Password Challenge Keyboard
function pressKioskKey(keyCharacter) {
    const inputField = document.getElementById('admin-password-input');
    if (!inputField) return;
    const targetChar = isKioskShiftActive ? keyCharacter.toUpperCase() : keyCharacter.toLowerCase();
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

    const authModal = document.getElementById('admin-auth-modal');
    if (authModal) authModal.style.setProperty('display', 'none', 'important');
    
    executeValidatedAdminAction(pendingAdminOptionKey);
    pendingAdminOptionKey = null; 
}

function cancelAdminPasswordVerification() {
    const authModal = document.getElementById('admin-auth-modal');
    if (authModal) { 
        authModal.style.setProperty('display', 'none', 'important'); 
        authModal.classList.add('modal-hide'); 
    }
    pendingAdminOptionKey = null;
}

// Secret pink square tap sequence for hardware reset sweep
function handleSecretPinkSquareTap() {
    if (secretPinkSquareTimeoutId) {
        clearTimeout(secretPinkSquareTimeoutId);
    }
    
    secretPinkSquareTimeoutId = setTimeout(() => {
        secretPinkSquareTapCount = 0;
        secretPinkSquareTimeoutId = null;
    }, 5000);

    secretPinkSquareTapCount++;

    if (secretPinkSquareTapCount === 3) {
        secretPinkSquareTapCount = 0;
        clearTimeout(secretPinkSquareTimeoutId);
        secretPinkSquareTimeoutId = null;
        triggerAdminPrinterResetAction();
    }
}

// ==========================================================================
// 9. UNIVERSAL NUMERICAL KEYPAD (MULTIPLES OVERLAY)
// ==========================================================================

function triggerMultiplesQuantityOverlay() {
    const keypadTitle = document.getElementById('multiples-modal-title');
    const keypadSubmitText = document.getElementById('multiples-modal-submit-text');
    const ctxLine1 = document.getElementById('keypad-context-line1');
    const ctxLine2 = document.getElementById('keypad-context-line2');
    const countBadge = document.getElementById('admin-multiples-count-badge');

    multiplesCountTarget = ""; 
    if (countBadge) countBadge.value = "";

    if (keypadTitle) keypadTitle.textContent = "How many labels?";
    if (keypadSubmitText) keypadSubmitText.textContent = "PRINT";

    if (lastExecutedPrintPayload) {
        if (ctxLine1) {
            ctxLine1.textContent = (lastExecutedPrintPayload.cwrd1 || "").toUpperCase();
            ctxLine1.style.display = lastExecutedPrintPayload.cwrd1 ? "block" : "none";
        }
        if (ctxLine2) {
            ctxLine2.textContent = (lastExecutedPrintPayload.cwrd2 || "").toUpperCase();
            ctxLine2.style.display = lastExecutedPrintPayload.cwrd2 ? "block" : "none";
        }
    } else {
        if (ctxLine1) {
            ctxLine1.textContent = "SET PRINT";
            ctxLine1.style.display = "block";
        }
        if (ctxLine2) {
            ctxLine2.textContent = "QUANTITY";
            ctxLine2.style.display = "block";
        }
    }

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.classList.remove('modal-hide');
        multiplesModal.style.setProperty('display', 'flex', 'important');
    }
}

function pressMultiplesKey(digitString) {
    const currentInputString = (multiplesCountTarget || "").toString();

    if (currentInputString === "" && digitString === "0") return;

    if (currentInputString.length < 3) {
        multiplesCountTarget = currentInputString + digitString;
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) countBadge.value = multiplesCountTarget;
    }
}

function backspaceMultiplesKey() {
    const currentInputString = (multiplesCountTarget || "").toString();
    if (currentInputString.length > 0) {
        multiplesCountTarget = currentInputString.slice(0, -1);
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) countBadge.value = multiplesCountTarget;
    }
}

function clearMultiplesKey() {
    multiplesCountTarget = "";
    const countBadge = document.getElementById('admin-multiples-count-badge');
    if (countBadge) countBadge.value = "";
}

function dismissMultiplesQuantityOverlay() {
    if (lastExecutedPrintPayload && (lastExecutedPrintPayload.q === 'EFB_LABEL' || lastExecutedPrintPayload.q === 'BLANK_DISPATCH')) {
        const multiplesModal = document.getElementById('admin-multiples-modal');
        if (multiplesModal) {
            multiplesModal.style.setProperty('display', 'none', 'important');
            multiplesModal.classList.add('modal-hide');
        }
        return;
    }

    if (currentActiveWorkspaceMode === "DISPATCH_MODE") {
        dismissDispatchCollectionOverlay();
        return;
    }

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }
}

function confirmMultiplesQuantityRun() {
    const collectedValue = (multiplesCountTarget || "").toString().trim();
    if (!collectedValue || parseInt(collectedValue) <= 0) {
        const countBadge = document.getElementById('admin-multiples-count-badge');
        if (countBadge) {
            countBadge.style.borderColor = '#C64B4B';
            setTimeout(() => {
                countBadge.style.borderColor = '#000000';
            }, 400);
        }
        return;
    }

    const finalNumericValue = collectedValue;

    if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'EFB_LABEL') {
        const runCount = parseInt(finalNumericValue) || 1;
        executePhysicalPrintSpooler(lastExecutedPrintPayload, runCount);

        const multiplesModal = document.getElementById('admin-multiples-modal');
        if (multiplesModal) {
            multiplesModal.style.setProperty('display', 'none', 'important');
            multiplesModal.classList.add('modal-hide');
        }
        return;
    }

    if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'ACTIVE_DISPATCH') {
        if (activeDispatchStep === "trolleys") {
            currentDispatchTrolleysValue = finalNumericValue;
            const sbTrolleys = document.getElementById('scoreboard-display-trolleys');
            if (sbTrolleys) sbTrolleys.textContent = currentDispatchTrolleysValue;
            
            activeDispatchStep = "trays";
            triggerUniversalKeypadStep();
            return;
            
        } else if (activeDispatchStep === "trays") {
            currentDispatchTraysValue = finalNumericValue;
            const sbTrays = document.getElementById('scoreboard-display-trays');
            if (sbTrays) sbTrays.textContent = currentDispatchTraysValue;
            
            const multiplesModal = document.getElementById('admin-multiples-modal');
            if (multiplesModal) {
                multiplesModal.style.setProperty('display', 'none', 'important');
                multiplesModal.classList.add('modal-hide');
            }

            launchDispatchCalendarOverlay();
            return;
        }
    }

    if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
        executePhysicalPrintSpooler(lastExecutedPrintPayload, parseInt(finalNumericValue) || 1);
        dismissDispatchCollectionOverlay();
        return;
    }

    if (lastExecutedPrintPayload) {
        const runCount = parseInt(finalNumericValue) || 1;
        executePhysicalPrintSpooler(lastExecutedPrintPayload, runCount);
    }

    const multiplesModal = document.getElementById('admin-multiples-modal');
    if (multiplesModal) {
        multiplesModal.style.setProperty('display', 'none', 'important');
        multiplesModal.classList.add('modal-hide');
    }
}

// Alternate numeric pad handlers
function pressQtyPadKey(digitString) {
    const qtyDisplay = document.getElementById('admin-qty-display');
    if (!qtyDisplay) return;
    
    if (qtyDisplay.value === "" && digitString === "0") return;
    if (qtyDisplay.value.length < 2) qtyDisplay.value += digitString;
    
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

// ==========================================================================
// 10. THREE-PANE LIST EDITOR SUITE (SCREEN 7)
// ==========================================================================

function launchListEditorWorkspace(listFileKey) {
    activeEditorFileKey = listFileKey;
    activeFocusedInputId = null;
    activeFocusedFieldKey = "line1";
    currentListSchemaDataArray = [];
    
    const line1Input = document.getElementById('editor-input-line1');
    const line2Input = document.getElementById('editor-input-line2');
    const imageInput = document.getElementById('editor-input-image');
    const badgeInput = document.getElementById('editor-active-index-badge');

    if (line1Input) line1Input.value = "";
    if (line2Input) line2Input.value = "";
    if (imageInput) imageInput.value = "";
    if (badgeInput) badgeInput.value = "1";
    
    const visualHeaderTitles = {
        'category': 'CATEGORY LABELS LIST',
        'toiletries': 'TOILETRIES LABELS LIST',
        'christmas': 'CHRISTMAS LABELS LIST',
        'misc': 'MISCELLANEOUS LABELS LIST',
        'dispatch': 'DISPATCH LABELS LIST'
    };
    const titleBanner = document.getElementById('list-editor-title-banner');
    if (titleBanner) {
        titleBanner.textContent = visualHeaderTitles[listFileKey] || "LABELS LIST";
    }

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

    const maxBoundaryCaps = { 'category': 35, 'toiletries': 14, 'christmas': 14, 'misc': 7, 'dispatch': 48 };
    const currentTargetListCap = maxBoundaryCaps[listFileKey] || 35;

    const unifiedSurfaceCard = document.getElementById('unified-card-surface-block');
    const targetLabelHexFillColor = (listFileKey === 'category') ? "#FFF4C2" : "#FFFFFF";
    
    if (unifiedSurfaceCard) {
        unifiedSurfaceCard.style.backgroundColor = targetLabelHexFillColor;
    }

    const targetLabelElements = [
        'editor-input-line1', 
        'editor-input-line2', 
        'editor-input-image', 
        'editor-preview-pane-container-layer'
    ];

    targetLabelElements.forEach(elementId => {
        const itemEl = document.getElementById(elementId);
        if (itemEl) itemEl.style.backgroundColor = "transparent";
    });

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/list?name=${listFileKey}`)
        .then(res => res.json())
        .then(serverPayloadArray => {
            for (let i = 0; i < currentTargetListCap; i++) {
                const item = serverPayloadArray[i] || {};
                
                let text3Value = item.image_file !== undefined ? item.image_file : "";
                if (listFileKey === 'dispatch' && item.postcode !== undefined) {
                    text3Value = item.postcode;
                }

                currentListSchemaDataArray.push({
                    text1: (item.text1 || "").toString().trim().toUpperCase(),
                    text2: (item.text2 || "").toString().trim().toUpperCase(),
                    image_file: text3Value.toString().trim()
                });
            }
            
            rebuildPlaylistVisualStreamContainer();
            switchKioskScreenLayout("7");
            setEditorInputFocus(0);
        })
        .catch(err => {
            console.error("Failed to load list data:", err);
            showUserAlert('SYSTEM_ALERT', { message: 'UNABLE TO ACCESS LIVE NETWORK TARGET STORAGE' }, 4000);
        });
}

function setEditorInputFocus(targetSlotIndex) {
    if (targetSlotIndex < 0 || targetSlotIndex >= currentListSchemaDataArray.length) return;

    const historicElements = document.querySelectorAll('.playlist-stream-row-btn');
    historicElements.forEach(el => {
        el.style.backgroundColor = "#FFFFFF";
        el.style.borderColor = "#7851A9";
    });

    activeFocusedInputId = targetSlotIndex;
    
    const badge = document.getElementById('editor-active-index-badge');
    if (badge) badge.value = targetSlotIndex + 1;

    const targetObjectData = currentListSchemaDataArray[targetSlotIndex];
    
    const l1 = document.getElementById('editor-input-line1');
    const l2 = document.getElementById('editor-input-line2');
    const img = document.getElementById('editor-input-image');

    if (l1) l1.value = targetObjectData.text1;
    if (l2) l2.value = targetObjectData.text2;
    if (img) img.value = targetObjectData.image_file;

    const activeRowElement = document.getElementById(`playlist-row-cell-id-${targetSlotIndex}`);
    if (activeRowElement) {
        activeRowElement.style.backgroundColor = "#a5d6a7";
        activeRowElement.style.borderColor = "#000000";
        activeRowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setEditorFieldFocus(activeFocusedFieldKey || 'line1');
    refreshLiveWorkspaceCanvasPreviews();
}

function setEditorFieldFocus(fieldKey) {
    activeFocusedFieldKey = fieldKey;
    
    const textEntryFields = ['line1', 'line2', 'image'];
    textEntryFields.forEach(key => {
        const fieldEl = document.getElementById(`editor-input-${key}`);
        if (fieldEl) {
            fieldEl.style.backgroundColor = "transparent";
            fieldEl.style.borderColor = "rgba(0, 0, 0, 0.2)";
        }
    });

    const activeInputTarget = document.getElementById(`editor-input-${fieldKey}`);
    if (activeInputTarget) {
        activeInputTarget.style.backgroundColor = "#a5d6a7";
        activeInputTarget.style.borderColor = "#000000";
    }
}

function pressEditorKey(keyChar) {
    if (activeFocusedInputId === null || !activeFocusedFieldKey) return;
    
    const targetObject = currentListSchemaDataArray[activeFocusedInputId];
    let currentValue = "";
    
    let characterLimit = (activeEditorFileKey === 'category') ? 11 : 13;
    
    if (activeFocusedFieldKey === 'line1') {
        currentValue = targetObject.text1;
    } else if (activeFocusedFieldKey === 'line2') {
        currentValue = targetObject.text2;
    } else if (activeFocusedFieldKey === 'image') {
        currentValue = targetObject.image_file;
        characterLimit = 40;
    }
    
    const processedChar = (activeFocusedFieldKey === 'image') ? keyChar : keyChar.toUpperCase();
    
    if (currentValue.length < characterLimit) {
        const updatedValue = currentValue + processedChar;
        
        if (activeFocusedFieldKey === 'line1') targetObject.text1 = updatedValue;
        else if (activeFocusedFieldKey === 'line2') targetObject.text2 = updatedValue;
        else if (activeFocusedFieldKey === 'image') targetObject.image_file = updatedValue;
        
        const fieldEl = document.getElementById(`editor-input-${activeFocusedFieldKey}`);
        if (fieldEl) fieldEl.value = updatedValue;
        
        synchronizePlaylistTextLineLabel(activeFocusedInputId);
        refreshLiveWorkspaceCanvasPreviews();
    }
}

function backspaceEditorKey() {
    if (activeFocusedInputId === null || !activeFocusedFieldKey) return;
    
    const targetObject = currentListSchemaDataArray[activeFocusedInputId];
    let currentValue = "";
    
    if (activeFocusedFieldKey === 'line1') currentValue = targetObject.text1;
    else if (activeFocusedFieldKey === 'line2') currentValue = targetObject.text2;
    else if (activeFocusedFieldKey === 'image') currentValue = targetObject.image_file;
    
    if (currentValue.length > 0) {
        const updatedValue = currentValue.slice(0, -1);
        
        if (activeFocusedFieldKey === 'line1') targetObject.text1 = updatedValue;
        else if (activeFocusedFieldKey === 'line2') targetObject.text2 = updatedValue;
        else if (activeFocusedFieldKey === 'image') targetObject.image_file = updatedValue;
        
        const fieldEl = document.getElementById(`editor-input-${activeFocusedFieldKey}`);
        if (fieldEl) fieldEl.value = updatedValue;
        
        synchronizePlaylistTextLineLabel(activeFocusedInputId);
        refreshLiveWorkspaceCanvasPreviews();
    }
}

function refreshLiveWorkspaceCanvasPreviews() {
    if (activeFocusedInputId === null) return;
    
    const currentObject = currentListSchemaDataArray[activeFocusedInputId];
    const frame1 = document.getElementById('editor-preview-graphic-frame-1');
    const frame2 = document.getElementById('editor-preview-graphic-frame-2');
    
    if (!frame1) return;
    
    frame1.style.border = "none";
    frame1.style.backgroundColor = "transparent";
    
    if (activeEditorFileKey === 'dispatch') {
        frame1.src = "label-graphics/dispatch-van.png";
        if (frame2) frame2.style.display = "none";
        frame1.onerror = () => { frame1.src = "label-graphics/blank.jpg"; };
        return;
    }
    
    const rawFilename = (currentObject.image_file || "").toString().trim();

    if (rawFilename === "" || rawFilename.toUpperCase() === "BLANK.JPG") {
        frame1.src = "label-graphics/blank.jpg";
        if (frame2) frame2.style.display = "none";
    } else {
        frame1.src = `label-graphics/${rawFilename.toLowerCase()}`;
        frame1.onerror = () => { frame1.src = "label-graphics/blank.jpg"; };
        if (frame2) frame2.style.display = "none";
    }
}

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
        }
    }
}

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

function synchronizePlaylistTextLineLabel(index) {
    const textLabelNode = document.getElementById(`playlist-text-label-node-${index}`);
    if (!textLabelNode) return;

    const item = currentListSchemaDataArray[index];
    let combinedSummary = `${item.text1} ${item.text2}`.trim();
    if (combinedSummary === "") combinedSummary = "----- EMPTY SLOT -----";

    textLabelNode.textContent = combinedSummary.toUpperCase();
}

function executePlaylistItemShift(directionString) {
    if (activeFocusedInputId === null) return;

    const targetedSourceIndex = activeFocusedInputId;
    const targetedDestinationIndex = (directionString === 'UP') ? targetedSourceIndex - 1 : targetedSourceIndex + 1;

    if (targetedDestinationIndex < 0 || targetedDestinationIndex >= currentListSchemaDataArray.length) {
        return;
    }

    const temporaryHolderObject = currentListSchemaDataArray[targetedSourceIndex];
    currentListSchemaDataArray[targetedSourceIndex] = currentListSchemaDataArray[targetedDestinationIndex];
    currentListSchemaDataArray[targetedDestinationIndex] = temporaryHolderObject;

    rebuildPlaylistVisualStreamContainer();
    setEditorInputFocus(targetedDestinationIndex);
}

function executePlaylistItemInsert() {
    if (activeFocusedInputId === null) return;

    const targetInsertIndex = activeFocusedInputId;
    const finalSlotIndex = currentListSchemaDataArray.length - 1;
    const lastItemInList = currentListSchemaDataArray[finalSlotIndex];

    const isLastSlotEmpty = (lastItemInList.text1 === "" && lastItemInList.text2 === "");

    if (!isLastSlotEmpty) {
        showUserAlert('SYSTEM_ALERT', { message: 'List boundary full. Clear end item first.' }, 3000);
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

function saveActiveListEditorDataToDisk() {
    if (!activeEditorFileKey) return;

    const cleanOutputPayload = currentListSchemaDataArray.map(item => {
        if (activeEditorFileKey === 'dispatch') {
            return {
                text1: item.text1,
                text2: item.text2,
                postcode: item.image_file
            };
        } else {
            return {
                text1: item.text1,
                text2: item.text2,
                image_file: item.image_file
            };
        }
    });

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/list/save?name=${activeEditorFileKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanOutputPayload)
    })
    .then(response => {
        if (!response.ok) throw new Error("Disk stream write timeout");
        return response.json();
    })
    .then(() => {
        const oldToast = document.getElementById('kiosk-save-toast-alert');
        if (oldToast) oldToast.remove();

        const toastHtml = `
            <div id="kiosk-save-toast-alert" style="position: fixed; top: 3vh; left: 50vw; transform: translateX(-50%); background-color: #4cd964; color: #000000; font-family: Arial, sans-serif; font-size: 2.6vh; font-weight: 900; padding: 2vh 4vw; border: 3px solid #000000; border-radius: 12px; box-shadow: 0px 8px 20px rgba(0,0,0,0.4); z-index: 9999999999; text-transform: uppercase; letter-spacing: 1px; pointer-events: none; transition: opacity 0.3s ease;">
                CHANGES SAVED
            </div>`;
        document.body.insertAdjacentHTML('beforeend', toastHtml);

        setTimeout(() => {
            const activeToast = document.getElementById('kiosk-save-toast-alert');
            if (activeToast) {
                activeToast.style.opacity = '0';
                setTimeout(() => activeToast.remove(), 300);
            }
        }, 1500);
    })
    .catch(err => {
        console.error("Server write error:", err);
        showUserAlert('SYSTEM_ALERT', { message: 'FAILED TO SAVE LIST DATA' }, 4000);
    });
}

function exitListEditorWorkspace() {
    switchKioskScreenLayout("6");
}

// ==========================================================================
// 11. FEEDBACK & ALERT OVERLAY
// ==========================================================================

function showUserAlert(type, data = {}, duration = 3000) {
    if (type === 'PRINT_CONFIRM' && !kioskConfig.showPrintConfirmation) {
        const mainWrapper = document.getElementById('main-app-wrapper');
        if (mainWrapper) mainWrapper.classList.remove('printing-active-state');
        
        if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'EFB_LABEL') {
            loadPlainLabelsMatrix();
            switchKioskScreenLayout("4");
        } else if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
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
                        ${data.periodText && data.periodText.trim() !== '' ? `<div class="p-title2" style="margin: 5px 0; font-size: 1.3rem; font-weight: bold;">${data.periodText}</div>` : ''}
                        ${data.yearText && data.yearText.trim() !== '' ? `<div id="modal-preview-year">${data.yearText}</div>` : ''}
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
                if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'EFB_LABEL') {
                    loadPlainLabelsMatrix();
                    switchKioskScreenLayout("4");
                    return;
                }

                if (currentActiveWorkspaceMode === 'PLAIN_MODE') return;

                if (lastExecutedPrintPayload && lastExecutedPrintPayload.q === 'BLANK_DISPATCH') {
                    loadDispatchLabelsMatrix();
                    switchKioskScreenLayout("5");
                    return;
                }

                if (isAdminMultiplesModeActive) {
                    switchKioskScreenLayout("1A");
                } else {
                    switchKioskScreenLayout("1");
                }
            }
        }
    }, duration);
}

// ==========================================================================
// 12. INITIALIZATION ON PAGE LOAD
// ==========================================================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Load configuration and initialize matrix grids
    loadKioskConfigurationState();

    // 2. Poll printer hardware status immediately on load, then every 5 seconds
    pollPrinterHardwareStatus();
    setInterval(pollPrinterHardwareStatus, 5000);
});

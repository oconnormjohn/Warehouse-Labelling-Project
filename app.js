// 1. Establish the base starting calendar year dynamically using the PC system clock
let currentYear = new Date().getFullYear();

// Global control variable for superuser release state
let isFourthYearReleased = false; 

// Control variable for Short Date look-ahead buffer (e.g., 1 = current month + 1 future month)
let shortDatePeriod = 1;

// Global configuration state (ready to hook into future admin JSON settings)
let kioskConfig = {
    showPrintConfirmation: true, // Master toggle to completely turn confirmation off/on
    fourthYearHidden: false      // Your existing fourth year toggle variable
};

// Structural row class names matching your layout palette
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// Build the matrix template grid with proper rolling years, matching colours, and monthly expiry structures
function generateDynamicGrid() {
    const gridContainer = document.getElementById('master-grid');
    if (!gridContainer) return;
    
    // Get the current system month (0 = Jan, 1 = Feb, ..., 11 = Dec)
    const systemDate = new Date();
    const systemYear = systemDate.getFullYear();
    const systemMonthIndex = systemDate.getMonth(); 
    
    let gridHTML = '';

    // Fixed tracking arrays
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
        
        if (remainder === 2) colorIndex = 0;      // Pink family
        else if (remainder === 3) colorIndex = 1; // Green family
        else if (remainder === 0) colorIndex = 2; // Yellow family
        else if (remainder === 1) colorIndex = 3; // Blue family
        
        const colorClass = colorCycle[colorIndex];
        
        // Enforce structural restriction on the 4th physical row slot
        const isFourthRow = (i === 3);
        const isRowFourInactive = isFourthRow && !isFourthYearReleased;
        
        const rowStatusClass = isRowFourInactive ? 'inactive-row' : '';

        let rowHTML = `<div class="grid-row ${colorClass} ${rowStatusClass}">`;

        // Generate the 4 Quarter Buttons for this row loop dynamically
        quarterMonthsMap.forEach(qBlock => {
            let disabledMonthsCount = 0;
            let monthsMarkup = '';
            let zplPrintMonths = [];

            qBlock.indices.forEach((mIdx, pos) => {
                const mName = qBlock.months[pos];
                
                let isMonthExpired = false;
                let isMonthShortDate = false;

                // A. Check for historical expiration (Past Months)
                if (targetYear < systemYear) {
                    isMonthExpired = true;
                } else if (targetYear === systemYear) {
                    if (mIdx < systemMonthIndex) {
                        isMonthExpired = true;
                    }
                }

                // B. Check for future "Short Date" exclusion (Current month up to shortDatePeriod limit)
                if (!isMonthExpired) {
                    // Convert target button date to an absolute distance in months from now
                    const yearDiff = targetYear - systemYear;
                    const absoluteMonthOffset = (yearDiff * 12) + mIdx - systemMonthIndex;

                    // If it falls within the current month (0) up to the look-ahead boundary, flag it
                    if (absoluteMonthOffset >= 0 && absoluteMonthOffset <= shortDatePeriod) {
                        isMonthShortDate = true;
                    }
                }

                // C. Render markup and construct payload based on status flags
                if (isMonthExpired) {
                    disabledMonthsCount++;
                    monthsMarkup += `<span class="expired-month">${mName}</span>`;
                    zplPrintMonths.push('x'); // Expired payload placeholder
                } else if (isMonthShortDate) {
                    disabledMonthsCount++;
                    monthsMarkup += `<span class="short-date-month">${mName}</span>`;
                    zplPrintMonths.push('x'); // Short date payload placeholder (prevents template print)
                } else {
                    monthsMarkup += `<span>${mName}</span>`;
                    zplPrintMonths.push(mName); // Valid active month name
                }
            });

            // Button components are completely inactive if forced by row 4 rules OR if all 3 constituent months are blocked
            const isButtonFullyDisabled = (disabledMonthsCount === 3);
            const isButtonDisabled = isRowFourInactive || isButtonFullyDisabled;

            const buttonStatusClass = isButtonFullyDisabled ? 'btn-expired-out' : '';
            
            // Join array as a single-quoted string literal to guarantee absolute safety inside onclick wrapper
            const payloadArrayString = zplPrintMonths.map(m => `'${m}'`).join(',');
            const clickPayload = isButtonDisabled ? '' : `onclick="handleCardClick('${targetYear}', '${qBlock.qName}', [${payloadArrayString}])"`;

            rowHTML += `
            <div class="card-btn ${buttonStatusClass}" ${clickPayload}>
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> ${qBlock.qName.charAt(1)}</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text">${monthsMarkup}</div>
            </div>`;
        });

        // Append the final 5th Year Card block column safely to complete the row segment
        const clickYearPayload = isRowFourInactive ? '' : `onclick="handleCardClick('${targetYear}', 'Full Year', ['All'])"`;
        rowHTML += `
            <div class="card-btn year-card" ${clickYearPayload}>${targetYear}</div>
        </div>`;

        gridHTML += rowHTML;
    }
    
    gridContainer.innerHTML = gridHTML;
}

// Direct click handler function linked to the static HTML button
function triggerManualRollOver() {
    currentYear += 1;
    generateDynamicGrid();
}

// Initialize the dynamically built interface once DOM structures are loaded
window.addEventListener('DOMContentLoaded', () => {
    // A. Build the multi-year calendar grid instantly
    generateDynamicGrid();

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
                
                // Pull out the raw string label (e.g. "BEANS" or "COOK-IN-SAUCE")
                const rawCategoryText = textElement ? textElement.textContent.trim() : '';

                // Split text cleanly by spaces or hyphens to look for multi-word configurations
                const wordsArray = rawCategoryText.split(/[\s-]+/);

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
                    // Force Screen 1 to completely collapse, overriding any CSS grid !important tags
                    homeGrid.style.setProperty('display', 'none', 'important');
                    homeDeck.style.setProperty('display', 'none', 'important');
    
                    // Force Screen 2 to render beautifully using your flex settings
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
 */
function handleCardClick(year, period, zplMonths) { 
    // A. Gather active text labels from Screen 2 heading slots
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    const activeWord1 = slot1 ? slot1.textContent.trim() : '';
    const activeWord2 = slot2 ? slot2.textContent.trim() : '';

    // B. FIXED: Track target color by matching row configuration indexes safely
    const currentEvt = window.event || arguments.callee.caller.arguments[0];
    const activeBtn = currentEvt ? currentEvt.currentTarget || currentEvt.target : null;
    const parentRow = activeBtn ? activeBtn.closest('.grid-row') : null;
    let detectedColor = 'green'; // Safe fallback queue default

    if (parentRow) {
        // Scrape whatever row identifier class name is active on the element
        const matchClasses = Array.from(parentRow.classList);
        if (matchClasses.includes('row-2026')) detectedColor = 'pink';
        else if (matchClasses.includes('row-2027')) detectedColor = 'green';
        else if (matchClasses.includes('row-2028')) detectedColor = 'yellow';
        else if (matchClasses.includes('row-2029')) detectedColor = 'blue';
    }

    // C. Extract individual month variables safely out of the array payload
    let month1 = ' ';
    let month2 = ' ';
    let month3 = ' ';

    if (zplMonths && zplMonths.length === 3) {
        month1 = zplMonths[0];
        month2 = zplMonths[1];
        month3 = zplMonths[2];
    }

    // D. Package everything into a clean JSON data token profile
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

    // E. Execute asynchronous network transmission to local Python daemon
    fetch('http://localhost:8080', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(printPayload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP network error code status: ${response.status}`);
        }
        return response.json();
    })
    
    .then(data => {
        console.log('🎉 Print job successfully pushed to CUPS spooler:', data);
        
        // 1. Resolve row background color maps using exact system values
        let targetHexColor = '#ffcdd2'; // default pink fallback
        if (printPayload.color === 'green') targetHexColor = '#a5d6a7';
        else if (printPayload.color === 'yellow') targetHexColor = '#fff59d';
        else if (printPayload.color === 'blue') targetHexColor = '#81d4fa';

        // 2. Clear out the middle period line completely if printing a Full Year card
        const finalPeriodText = printPayload.q === 'FY' ? '' : `Qtr ${printPayload.q}`;
        
        // 3. Fire the updated universal overlay view processor
        showUserAlert('PRINT_CONFIRM', { 
            categoryName: `${printPayload.cwrd1} ${printPayload.cwrd2}`.trim(), 
            periodText: finalPeriodText, // Becomes empty string on Full Year, perfectly centering the label
            yearText: printPayload.year, 
            hexColor: targetHexColor 
        }, 3000);
    })

    .catch(error => {
        console.error('❌ Direct printing error tracking log failure:', error);
        
        // Use the universal component fallback to show an elegant error message
        showUserAlert('SYSTEM_ALERT', { message: 'PRINTER ROUTER CONNECTION OFFLINE' }, 5000);
    }); // <-- Closes the .catch block
} // <-- Closes the handleCardClick function. MAKE SURE THERE IS ONLY ONE HERE.

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
        }
    } else if (action === 'SETTINGS') {
        // Hides Screen 1 elements and maps the full screen Admin View layer cleanly
        const homeGrid = document.getElementById('home-category-grid');
        const homeDeck = document.getElementById('deck-home-actions');
        const adminView = document.getElementById('admin-settings-view');

        if (homeGrid && homeDeck && adminView) {
            homeGrid.style.setProperty('display', 'none', 'important');
            homeDeck.style.setProperty('display', 'none', 'important');
            
            adminView.classList.remove('screen-hide');
            adminView.style.setProperty('display', 'block', 'important');
        }
    } else if (action === 'MONTHS') {
        alert('SYSTEM COMMAND:\nSwitching to Monthly Breakdown View');
    }
}

/**
 * Universal Inform User Component
 * Handles print previews and general system alerts using a 3-line centralized layout
 * 
 * @param {string} type - Either 'PRINT_CONFIRM' or 'SYSTEM_ALERT'
 * @param {Object} data - Contains categoryName, periodText (Quarter/Month), yearText, hexColor
 * @param {number} duration - Modal display lifespan in milliseconds
 */
function showUserAlert(type, data = {}, duration = 3000) {
    // 1. Core print filter evaluation: Respect the admin switch settings
    if (type === 'PRINT_CONFIRM') {
        if (!kioskConfig.showPrintConfirmation) {
            sidebarAction('BACK');
            return;
        }
    }

    // 2. Clear out lingering stale overlay objects to prevent screen stacking
    const oldModal = document.getElementById('kiosk-universal-overlay');
    if (oldModal) oldModal.remove();

    // 3. Assemble structural container markup based on intent
    let modalHtml = '';
    
    if (type === 'PRINT_CONFIRM') {
        // Fallback checks to prevent null pointers
        const labelCategory = data.categoryName || '';
        const labelPeriod   = data.periodText || ''; // Holds "Qtr 1", "Jan", or "" for Full Year
        const labelYear     = data.yearText || '';

        modalHtml = `
            <div class="modal-overlay" id="kiosk-universal-overlay">
                <div class="modal-content">
                    <div class="preview-label" style="background-color: ${data.hexColor || '#ffffff'}">
                        <!-- Line 1: Category Name -->
                        <div class="p-title1">${labelCategory}</div>
                        
                        <!-- Line 2: Period (Quarter or Month). If empty, collapses cleanly to preserve layout margins -->
                        <div class="p-title2" style="margin: 5px 0; font-size: 1.3rem; font-weight: bold; min-height: 1.5rem;">${labelPeriod}</div>
                        
                        <!-- Line 3: Year Tracking Display -->
                        <div id="modal-preview-year">${labelYear}</div>
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

    // 4. Inject element onto active view canvas
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Minimize baseline layout visibility noise during print phase
    if (type === 'PRINT_CONFIRM') {
        const monthsBox = document.querySelector('.p-months-box');
        if (monthsBox) monthsBox.style.setProperty('display', 'none', 'important');
    }

    // 5. Managed lifespan decay pipeline execution
    setTimeout(() => {
        const activeModal = document.getElementById('kiosk-universal-overlay');
        if (activeModal) {
            activeModal.remove();
            if (type === 'PRINT_CONFIRM') {
                sidebarAction('BACK');
            }
        }
    }, duration);
}
function handleAdminMenuSelection(optionKey) {
    console.log(`🔒 Admin option clicked: [${optionKey}] - Awaiting password verification...`);
    
    if (optionKey === 'EXIT') {
        const adminView = document.getElementById('admin-settings-view');
        const homeGrid = document.getElementById('home-category-grid');
        const homeDeck = document.getElementById('deck-home-actions');
        
        if (adminView && homeGrid && homeDeck) {
            // Hide the admin layout view completely
            adminView.style.setProperty('display', 'none', 'important');
            adminView.classList.add('screen-hide');
            
            // Restore the main grid canvas elements beautifully
            homeGrid.style.setProperty('display', 'grid', 'important');
            homeDeck.style.setProperty('display', 'flex', 'important');
        }
        return;
    }
}

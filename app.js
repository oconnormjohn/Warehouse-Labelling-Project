/**
 * Food Bank Kiosk - Automated Calendar & Fixed Colour Mapping
 * Integrated Screen-Flipping View Engine
 */

// 1. Establish the base starting calendar year dynamically using the PC system clock
let currentYear = new Date().getFullYear();

// 2. Define the static colour rotation loop index sequence
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// Build the matrix template grid with proper rolling years and matching colours
function generateDynamicGrid() {
    const gridContainer = document.getElementById('master-grid');
    if (!gridContainer) return;
    
    let gridHTML = '';

    for (let i = 0; i < 4; i++) {
        const targetYear = currentYear + i;
        const remainder = targetYear % 4;
        let colorIndex;
        
        if (remainder === 2) colorIndex = 0;      // Pink family
        else if (remainder === 3) colorIndex = 1; // Green family
        else if (remainder === 0) colorIndex = 2; // Yellow family
        else if (remainder === 1) colorIndex = 3; // Blue family
        
        const colorClass = colorCycle[colorIndex];

        gridHTML += `
        <div class="grid-row ${colorClass}">
            <div class="card-btn" onclick="handleCardClick('${targetYear}', 'Q1')">
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> 1</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text"><span>Jan</span><span>Feb</span><span>Mar</span></div>
            </div>
            <div class="card-btn" onclick="handleCardClick('${targetYear}', 'Q2')">
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> 2</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text"><span>Apr</span><span>May</span><span>Jun</span></div>
            </div>
            <div class="card-btn" onclick="handleCardClick('${targetYear}', 'Q3')">
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> 3</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text"><span>Jul</span><span>Aug</span><span>Sep</span></div>
            </div>
            <div class="card-btn" onclick="handleCardClick('${targetYear}', 'Q4')">
                <div class="q-text"><div class="q-prefix">Q<span class="small-tr">tr</span> 4</div><div class="year-subtext">${targetYear}</div></div>
                <div class="months-text"><span>Oct</span><span>Nov</span><span>Dec</span></div>
            </div>
            <div class="card-btn year-card" onclick="handleCardClick('${targetYear}', 'Full Year')">${targetYear}</div>
        </div>`;
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
 * Core Touch Event Processors & Layout Resets
 */
function handleCardClick(year, period) {
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    const activeWord1 = slot1 ? slot1.textContent : '';
    const activeWord2 = slot2 ? slot2.textContent : '';
    const absoluteCategoryString = activeWord2 ? `${activeWord1} ${activeWord2}` : activeWord1;
    
    alert(`PRINTING LABEL:\n${absoluteCategoryString}\n${period} ${year}`);
}

// --- REPLACED SIDEBARACTION FUNCTION AT THE BASE OF APP.JS ---

function sidebarAction(action) {
    if (action === 'BACK') {
        const homeGrid = document.getElementById('home-category-grid');
        const workspaceView = document.getElementById('workspace-view');
        const homeDeck = document.getElementById('deck-home-actions');
        const screen2Deck = document.getElementById('deck-screen2-nav');

        if (homeGrid && workspaceView && homeDeck && screen2Deck) {
            // Hide Screen 2 tracks completely
            workspaceView.style.setProperty('display', 'none', 'important');
            workspaceView.classList.add('screen-hide');
            screen2Deck.classList.add('screen-hide');
            
            // Restore Screen 1 matrix tracks beautifully to full grid layout dimensions
            homeGrid.style.setProperty('display', 'grid', 'important');
            homeDeck.style.setProperty('display', 'flex', 'important');
        }
    } else if (action === 'MONTHS') {
        alert('SYSTEM COMMAND:\nSwitching to Monthly Breakdown View');
    }
}

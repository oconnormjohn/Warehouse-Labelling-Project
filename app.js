/**
 * Food Bank Kiosk - Automated Calendar & Fixed Colour Mapping
 * Chrome-safe simulation engine.
 */

// 1. Establish the base starting calendar year dynamically using the PC system clock
let currentYear = new Date().getFullYear();

// 2. Define the static colour rotation loop index sequence
const colorCycle = ['row-2026', 'row-2027', 'row-2028', 'row-2029'];

// A test array of categories containing mixed lengths and two-word structures
const testCategories = [
    { word1: "VEGETABLES", word2: "" },
    { word1: "CEREALS", word2: "" },
    { word1: "HOUSEHOLD", word2: "CLEANING" },
    { word1: "PASTA", word2: "" },
    { word1: "FEMININE", word2: "HYGIENE" },
    { word1: "TINNED", word2: "MEAT" },
    { word1: "BABY", word2: "FOOD" }
];

let currentTestIndex = 0;

function runCategorySimulation() {
    const currentData = testCategories[currentTestIndex];
    const slot1 = document.getElementById('cat-word1');
    const slot2 = document.getElementById('cat-word2');
    
    if (slot1 && slot2) {
        slot1.textContent = currentData.word1;
        slot2.textContent = currentData.word2;
    }
    currentTestIndex = (currentTestIndex + 1) % testCategories.length;
}

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
    generateDynamicGrid();
    setInterval(runCategorySimulation, 3500);
});

/**
 * Core Touch Event Processors
 */
function handleCardClick(year, period) {
    const activeWord1 = document.getElementById('cat-word1').textContent;
    const activeWord2 = document.getElementById('cat-word2').textContent;
    const absoluteCategoryString = activeWord2 ? `${activeWord1} ${activeWord2}` : activeWord1;
    
    alert(`PRINTING LABEL:\n${absoluteCategoryString}\n${period} ${year}`);
}

function sidebarAction(action) {
    if (action === 'BACK') {
        alert('NAVIGATION:\nReturning to Screen 1 (Category Selection)');
    } else if (action === 'MONTHS') {
        alert('SYSTEM COMMAND:\nSwitching to Monthly Breakdown View');
    }
}

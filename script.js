const YEAR_COLOURS = ["pink", "green", "yellow", "blue"];
const BASE_YEAR = 2026;

const PRINTER_BY_COLOUR = {
  pink: "Pink printer",
  green: "Green printer",
  yellow: "Yellow printer",
  blue: "Blue printer"
};

function getYearColour(year) {
  const offset = year - BASE_YEAR;
  const index = ((offset % 4) + 4) % 4;
  return YEAR_COLOURS[index];
}

function createYearButtons() {
  const yearButtonsDiv = document.getElementById("yearButtons");

  for (let year = 2026; year <= 2033; year++) {
    const colour = getYearColour(year);

    const button = document.createElement("button");
    button.textContent = `${year} ${colour}`;
    button.style.backgroundColor = colour;

    button.addEventListener("click", function () {
      document.getElementById("selectedYear").textContent = year;
      document.getElementById("selectedColour").textContent = colour;
      document.getElementById("selectedPrinter").textContent = PRINTER_BY_COLOUR[colour];

      console.log(`Year ${year} selected`);
      console.log(`Colour: ${colour}`);
      console.log(`Printer: ${PRINTER_BY_COLOUR[colour]}`);
    });

    yearButtonsDiv.appendChild(button);
  }
}

createYearButtons();
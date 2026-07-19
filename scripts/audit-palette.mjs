const palette = {
  current: { fill: "#009e73", text: "#00664c" },
  transferable: { fill: "#0072b2", text: "#005987" },
  bridge: { fill: "#d55e00", text: "#8f3f00" },
  gap: { fill: "#882255", text: "#701a46" },
};

function rgb(hex) { return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255); }
function linear(value) { return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }
function luminance(hex) { const [r, g, b] = rgb(hex).map(linear); return .2126 * r + .7152 * g + .0722 * b; }
function contrast(a, b) { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + .05) / (dark + .05); }
function simulate(hex, matrix) { const source = rgb(hex); return matrix.map((row) => row.reduce((sum, coefficient, index) => sum + coefficient * source[index], 0)); }
function distance(a, b) { return Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0)) * 255; }

const simulations = {
  protanopia: [[.152286, 1.052583, -.204868], [.114503, .786281, .099216], [-.003882, -.048116, 1.051998]],
  deuteranopia: [[.367322, .860646, -.227968], [.280085, .672501, .047413], [-.01182, .04294, .968881]],
};

for (const [name, colors] of Object.entries(palette)) {
  const ratio = contrast(colors.text, "#ffffff");
  if (ratio < 4.5) throw new Error(`${name} text contrast is ${ratio.toFixed(2)}:1; expected at least 4.5:1.`);
}

for (const [simulationName, matrix] of Object.entries(simulations)) {
  const entries = Object.entries(palette);
  for (let left = 0; left < entries.length; left += 1) for (let right = left + 1; right < entries.length; right += 1) {
    const separation = distance(simulate(entries[left][1].fill, matrix), simulate(entries[right][1].fill, matrix));
    if (separation < 34) throw new Error(`${entries[left][0]} and ${entries[right][0]} are only ${separation.toFixed(1)} units apart under ${simulationName}.`);
  }
}

console.log("Palette audit passed: text contrast and protanopia/deuteranopia fill separation meet the repository thresholds.");

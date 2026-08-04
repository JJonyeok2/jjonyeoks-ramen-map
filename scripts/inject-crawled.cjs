const fs = require('fs');

const shops = JSON.parse(fs.readFileSync('crawled_filtered.json', 'utf8'));
let buildScript = fs.readFileSync('scripts/build-100-ramen.js', 'utf-8');

buildScript = buildScript.replace(/\r\n/g, '\n');
const targetPoint = buildScript.indexOf("\n];\n\nfunction generateAiProfile");

if (targetPoint !== -1) {
  const newShopsStr = shops.map(s => `  ${JSON.stringify(s)}`).join(",\n");
  buildScript = buildScript.slice(0, targetPoint) + ",\n\n  // --- Kakao Local API Real Data Expansion ---\n" + newShopsStr + buildScript.slice(targetPoint);
  fs.writeFileSync('scripts/build-100-ramen.js', buildScript, 'utf-8');
  console.log(`Successfully injected ${shops.length} real shops into build-100-ramen.js`);
} else {
  console.log("Could not find the insertion point.");
}

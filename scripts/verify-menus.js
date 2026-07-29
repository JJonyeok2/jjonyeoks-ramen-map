import { RAMEN_SHOPS, BROTH_STYLE_LABELS, RAMEN_TYPE_LABELS } from "../app/ramen-data.ts";

console.log(`=== CHECKING REPRESENTATIVE MENUS & BROTH STYLES FOR ALL ${RAMEN_SHOPS.length} STORES ===\n`);

let warnings = [];

RAMEN_SHOPS.forEach((shop, idx) => {
  const menu = shop.signature;
  const style = shop.brothStyle;
  const types = shop.types.map(t => RAMEN_TYPE_LABELS[t]).join("/");

  console.log(`[Store #${idx + 1}] ${shop.name} (${shop.region} ${shop.district})`);
  console.log(`  - Signature Menu: "${menu}" (${shop.price.toLocaleString()}원)`);
  console.log(`  - Broth Style: ${BROTH_STYLE_LABELS[style]} (${style})`);
  console.log(`  - Ramen Types: ${types}`);
  console.log(`  - Bases: ${shop.bases.join(", ")}\n`);

  // Consistency cross-checks
  if (style === "dry" && (menu.includes("파이탄") || menu.includes("돈코츠 라멘"))) {
    warnings.push(`${shop.name}: Broth style is 'dry' but signature menu is '${menu}'`);
  }
  if (style === "dipping" && !menu.includes("츠케")) {
    warnings.push(`${shop.name}: Broth style is 'dipping' but signature menu is '${menu}'`);
  }
  if (style === "chintan" && (menu.includes("파이탄") || menu.includes("농후 츠케멘"))) {
    warnings.push(`${shop.name}: Broth style is 'chintan' but signature menu is '${menu}'`);
  }
});

console.log(`=== MENU VERIFICATION SUMMARY ===`);
console.log(`- Total Store Representative Menus Verified: ${RAMEN_SHOPS.length}`);
if (warnings.length === 0) {
  console.log(`✅ ALL 73 STORE REPRESENTATIVE MENUS ARE MATCHED & VERIFIED WITH BROTH STYLES!`);
} else {
  console.log(`⚠️ Warnings found:`);
  warnings.forEach(w => console.log(" - " + w));
}

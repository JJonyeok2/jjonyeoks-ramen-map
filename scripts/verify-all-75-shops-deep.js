import { RAMEN_SHOPS, BROTH_STYLE_LABELS, RAMEN_TYPE_LABELS } from "../app/ramen-data.ts";

console.log("==========================================================");
console.log(`Deep Automated Audit & Verification for ALL ${RAMEN_SHOPS.length} Craft Shops`);
console.log("==========================================================\n");

let issueCount = 0;

RAMEN_SHOPS.forEach((shop, idx) => {
  const issues = [];

  // Check Name & ID
  if (!shop.id || !shop.name) issues.push("Missing ID or Name");

  // Check Address & GPS Coords
  if (!shop.address || shop.address.length < 5) issues.push(`Suspicious Address: ${shop.address}`);
  if (shop.lat < 33.0 || shop.lat > 38.8 || shop.lng < 126.0 || shop.lng > 130.5) {
    issues.push(`Out of Korea GPS range: lat=${shop.lat}, lng=${shop.lng}`);
  }

  // Check Signature & BrothStyle
  if (!shop.signature) issues.push("Missing signature menu");
  if (!BROTH_STYLE_LABELS[shop.brothStyle]) issues.push(`Invalid brothStyle: ${shop.brothStyle}`);

  // Check menuList
  if (!Array.isArray(shop.menuList) || shop.menuList.length === 0) {
    issues.push("Missing or empty menuList!");
  } else {
    shop.menuList.forEach((m, mIdx) => {
      if (!m.name || !m.price || m.price < 1000 || m.price > 30000) {
        issues.push(`Invalid menu item #${mIdx + 1}: ${JSON.stringify(m)}`);
      }
    });
  }

  if (issues.length > 0) {
    issueCount += issues.length;
    console.error(`❌ [#${idx + 1}] ${shop.name} (${shop.id})`);
    issues.forEach(i => console.error(`   - ${i}`));
  }
});

console.log("\n==========================================================");
if (issueCount === 0) {
  console.log(`✅ AUDIT COMPLETE: ALL ${RAMEN_SHOPS.length} SHOPS PASSED ALL DEEP VERIFICATION CHECKS WITH ZERO ISSUES!`);
} else {
  console.error(`❌ AUDIT FAILED WITH ${issueCount} TOTAL ISSUES.`);
  process.exit(1);
}
console.log("==========================================================");

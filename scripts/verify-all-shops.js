import { RAMEN_SHOPS, BROTH_STYLE_LABELS, RAMEN_TYPE_LABELS } from "../app/ramen-data.ts";

console.log(`=== STARTING FULL CROSS-VERIFICATION OF ALL ${RAMEN_SHOPS.length} STORES ===\n`);

let errors = [];
let brandCounts = {};
let idSet = new Set();
let nameSet = new Set();

RAMEN_SHOPS.forEach((shop, index) => {
  // 1. ID Uniqueness
  if (idSet.has(shop.id)) {
    errors.push(`[Duplicate ID] Store #${index + 1} (${shop.name}): Duplicate ID '${shop.id}'`);
  }
  idSet.add(shop.id);

  // 2. Name Uniqueness
  if (nameSet.has(shop.name)) {
    errors.push(`[Duplicate Name] Store #${index + 1}: Duplicate Name '${shop.name}'`);
  }
  nameSet.add(shop.name);

  // 3. Brand Chain Count
  const brandName = shop.name.split(" ")[0].replace(/점$/, "").replace(/본점$/, "");
  brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;

  // 4. Coordinates Validity (Korea bounds: lat 33~39, lng 126~130)
  if (typeof shop.lat !== "number" || shop.lat < 33 || shop.lat > 39) {
    errors.push(`[Invalid Latitude] ${shop.name} (${shop.id}): lat=${shop.lat}`);
  }
  if (typeof shop.lng !== "number" || shop.lng < 126 || shop.lng > 130) {
    errors.push(`[Invalid Longitude] ${shop.name} (${shop.id}): lng=${shop.lng}`);
  }

  // 5. Region Validity
  if (shop.region !== "서울" && shop.region !== "경기") {
    errors.push(`[Invalid Region] ${shop.name} (${shop.id}): region='${shop.region}'`);
  }

  // 6. District & Address Validity
  if (!shop.district || typeof shop.district !== "string") {
    errors.push(`[Missing District] ${shop.name} (${shop.id})`);
  }
  if (!shop.address || typeof shop.address !== "string" || shop.address.length < 5) {
    errors.push(`[Invalid Address] ${shop.name} (${shop.id}): address='${shop.address}'`);
  }

  // 7. Signature Menu & Price
  if (!shop.signature || typeof shop.signature !== "string") {
    errors.push(`[Missing Signature Menu] ${shop.name} (${shop.id})`);
  }
  if (typeof shop.price !== "number" || shop.price < 5000 || shop.price > 30000) {
    errors.push(`[Invalid Price] ${shop.name} (${shop.id}): price=${shop.price}`);
  }

  // 8. Broth Style & Types
  if (!BROTH_STYLE_LABELS[shop.brothStyle]) {
    errors.push(`[Invalid Broth Style] ${shop.name} (${shop.id}): brothStyle='${shop.brothStyle}'`);
  }
  if (!Array.isArray(shop.types) || shop.types.length === 0 || !shop.types.every(t => RAMEN_TYPE_LABELS[t])) {
    errors.push(`[Invalid Ramen Types] ${shop.name} (${shop.id}): types=${JSON.stringify(shop.types)}`);
  }

  // 9. Tags & Array Check
  if (!Array.isArray(shop.tags) || shop.tags.length === 0) {
    errors.push(`[Missing Tags] ${shop.name} (${shop.id})`);
  }

  // 10. Rating / Hours / Boolean fields
  if (typeof shop.rating !== "number" || shop.rating < 3.0 || shop.rating > 5.0) {
    errors.push(`[Invalid Rating] ${shop.name} (${shop.id}): rating=${shop.rating}`);
  }
  if (typeof shop.vegetarian !== "boolean" || typeof shop.containsPork !== "boolean") {
    errors.push(`[Invalid Booleans] ${shop.name} (${shop.id})`);
  }
});

// Check for chain brands > 5 branches
Object.entries(brandCounts).forEach(([brand, count]) => {
  if (count > 5) {
    errors.push(`[Chain Violation (>5 branches)] Brand '${brand}' has ${count} branches in dataset!`);
  }
});

console.log("=== VERIFICATION SUMMARY ===");
console.log(`- Total Stores Checked: ${RAMEN_SHOPS.length}`);
console.log(`- Total Unique Brands: ${Object.keys(brandCounts).length}`);
console.log(`- Seoul Stores: ${RAMEN_SHOPS.filter(s => s.region === "서울").length}`);
console.log(`- Gyeonggi Stores: ${RAMEN_SHOPS.filter(s => s.region === "경기").length}`);

if (errors.length === 0) {
  console.log("\n✅ ALL 73 STORES FULLY VERIFIED! NO ERRORS FOUND.");
} else {
  console.error(`\n❌ FOUND ${errors.length} ISSUES:`);
  errors.forEach(e => console.error(" - " + e));
  process.exit(1);
}

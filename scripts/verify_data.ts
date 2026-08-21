import { RAMEN_SHOPS } from '../app/ramen-data.js';

let missingAddress = 0;
let missingHours = 0;
let missingClosed = 0;

const incompleteShops = [];

for (const shop of RAMEN_SHOPS) {
  const hasAddr = !!shop.address && shop.address.trim() !== "";
  const hasHours = !!shop.hours && shop.hours.trim() !== "";
  const hasClosed = !!shop.closed && shop.closed.trim() !== "";

  if (!hasAddr) missingAddress++;
  if (!hasHours) missingHours++;
  if (!hasClosed) missingClosed++;

  if (!hasAddr || !hasHours || !hasClosed) {
    incompleteShops.push({
      name: shop.name,
      address: hasAddr ? "O" : "X",
      hours: hasHours ? "O" : "X",
      closed: hasClosed ? "O" : "X",
    });
  }
}

console.log(`전체 상점 수: ${RAMEN_SHOPS.length}곳`);
console.log(`- 주소(address) 누락: ${missingAddress}곳`);
console.log(`- 영업시간(hours) 누락: ${missingHours}곳`);
console.log(`- 휴무일(closed) 누락: ${missingClosed}곳`);

if (incompleteShops.length > 0) {
  console.log(`\n데이터가 일부 누락된 매장 목록 (총 ${incompleteShops.length}곳):`);
  incompleteShops.slice(0, 10).forEach(s => {
    console.log(`  - ${s.name}: 주소(${s.address}), 영업시간(${s.hours}), 휴무일(${s.closed})`);
  });
  if (incompleteShops.length > 10) {
    console.log(`  ... (외 ${incompleteShops.length - 10}곳)`);
  }
} else {
  console.log("\n✅ 모든 매장(477곳)에 주소, 영업시간, 휴무일 정보가 완벽하게 채워져 있습니다!");
}

import fs from 'fs';

const data = fs.readFileSync('./app/ramen-data.ts', 'utf8');

// Use a simple regex to count how many blocks have address, hours, closed
const totalRegex = /id:\s*["']/g;
const addressRegex = /address:\s*["']/g;
const hoursRegex = /hours:\s*["']/g;
const closedRegex = /closed:\s*["']/g;

const totalCount = (data.match(totalRegex) || []).length;
const addressCount = (data.match(addressRegex) || []).length;
const hoursCount = (data.match(hoursRegex) || []).length;
const closedCount = (data.match(closedRegex) || []).length;

console.log(`총 상점 수 (id 기준): ${totalCount}`);
console.log(`주소(address)가 있는 상점 수: ${addressCount}`);
console.log(`영업시간(hours)이 있는 상점 수: ${hoursCount}`);
console.log(`휴무일(closed)이 있는 상점 수: ${closedCount}`);

// Find ones that are missing 'hours' or 'closed' if any (we can use tsx for parsing actual objects)

import fs from 'fs';
import { RAMEN_SHOPS } from '../app/ramen-data';

const names = RAMEN_SHOPS.map((shop, index) => `${index + 1}. ${shop.name}`);

const content = `# 전체 라멘집 목록 (총 ${RAMEN_SHOPS.length}곳)\n\n` + names.join('\n');

fs.writeFileSync('C:\\Users\\jacob\\.gemini\\antigravity\\brain\\782f9d64-64ac-420d-af11-36397fcb9e85\\ramen_shops_list.md', content, 'utf8');
console.log(`Extracted ${RAMEN_SHOPS.length} names to artifact.`);

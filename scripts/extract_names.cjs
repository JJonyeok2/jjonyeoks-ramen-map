const fs = require('fs');

const data = fs.readFileSync('./app/ramen-data.ts', 'utf8');

// The objects look like: { id: "1", name: "상호명", ... }
const nameRegex = /name:\s*["']([^"']+)["']/g;
const names = [];
let match;
while ((match = nameRegex.exec(data)) !== null) {
    names.push(match[1]);
}

const content = `# 전체 라멘집 목록 (총 ${names.length}곳)\n\n` + names.map((name, i) => `${i + 1}. ${name}`).join('\n');

fs.writeFileSync('C:\\Users\\jacob\\.gemini\\antigravity\\brain\\782f9d64-64ac-420d-af11-36397fcb9e85\\ramen_shops_list.md', content, 'utf8');
console.log(`Extracted ${names.length} names to artifact.`);

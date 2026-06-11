const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.js'),
  path.join(__dirname, 'dist', 'apps', 'api', 'main.js'),
  path.join(__dirname, 'dist', 'apps', 'api', 'src', 'main.js'),
];

console.log('Starting Southin PeoplePay API...');
console.log('Looking for compiled API entry point...');

for (const candidate of candidates) {
  console.log(`Checking: ${candidate}`);

  if (fs.existsSync(candidate)) {
    console.log(`Found API entry point: ${candidate}`);
    require(candidate);
    return;
  }
}

console.error('Could not find compiled API entry point.');
console.error('Checked paths:');
for (const candidate of candidates) {
  console.error(`- ${candidate}`);
}

console.error('Dist folder listing:');

function listDir(dir, prefix = '') {
  if (!fs.existsSync(dir)) {
    console.error(`${prefix}${dir} does not exist`);
    return;
  }

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    console.error(`${prefix}${fullPath}`);

    if (stat.isDirectory()) {
      listDir(fullPath, `${prefix}  `);
    }
  }
}

listDir(path.join(__dirname, 'dist'));

process.exit(1);
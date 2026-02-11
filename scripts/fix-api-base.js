#!/usr/bin/env node
/**
 * Fix API_BASE/api/ usages to use API_BASE_URL instead
 * This resolves the localhost fallback issue in API calls
 */

const fs = require('fs');
const path = require('path');

const clientFolders = ['clientxyz', 'clientabc', 'dev'];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file uses ${API_BASE}/api/
  if (content.includes('${API_BASE}/api/')) {
    console.log(`Fixing: ${filePath}`);
    
    // Replace ${API_BASE}/api/ with ${API_BASE_URL}/
    const newContent = content.replace(/\$\{API_BASE\}\/api\//g, '${API_BASE_URL}/');
    
    // Check if API_BASE_URL is imported
    if (newContent.includes('${API_BASE_URL}/') && !newContent.match(/import\s+{[^}]*API_BASE_URL[^}]*}\s+from/)) {
      // Add API_BASE_URL to the import
      const importMatch = newContent.match(/(import\s+{\s*API_BASE\s*}\s+from\s+["']\.\.\/config["'];?)/);
      if (importMatch) {
        const oldImport = importMatch[1];
        const newImport = oldImport.replace('{ API_BASE }', '{ API_BASE, API_BASE_URL }');
        const finalContent = newContent.replace(oldImport, newImport);
        fs.writeFileSync(filePath, finalContent, 'utf8');
        modified = true;
      } else {
        // Just replace the pattern anyway
        fs.writeFileSync(filePath, newContent, 'utf8');
        modified = true;
      }
    } else {
      fs.writeFileSync(filePath, newContent, 'utf8');
      modified = true;
    }
  }

  return modified;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== 'build') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      callback(filePath);
    }
  });
}

let fixedCount = 0;

clientFolders.forEach(client => {
  const frontendPath = path.join(__dirname, '..', client, 'frontend', 'src');
  if (fs.existsSync(frontendPath)) {
    console.log(`\nScanning ${client}/frontend/src...`);
    walkDir(frontendPath, (filePath) => {
      if (fixFile(filePath)) {
        fixedCount++;
      }
    });
  }
});

console.log(`\n✓ Fixed ${fixedCount} files`);
console.log('\nChanges made:');
console.log('  - Replaced ${API_BASE}/api/ with ${API_BASE_URL}/');
console.log('  - Added API_BASE_URL to imports where needed');

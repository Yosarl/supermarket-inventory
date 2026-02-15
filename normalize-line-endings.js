/**
 * One-time script: convert CRLF to LF in source files so git add doesn't warn.
 * Run: node normalize-line-endings.js
 */
const fs = require('fs');
const path = require('path');

const exts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.yml', '.yaml', '.css', '.html'];
const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!skipDirs.has(name)) walk(full);
    } else if (exts.some((e) => name.endsWith(e))) {
      let s = fs.readFileSync(full, 'utf8');
      if (s.includes('\r\n')) {
        s = s.replace(/\r\n/g, '\n');
        fs.writeFileSync(full, s, 'utf8');
        console.log('LF: ' + full);
      }
    }
  }
}

walk('backend');
walk('frontend');
if (fs.existsSync('.gitattributes')) {
  let s = fs.readFileSync('.gitattributes', 'utf8');
  if (s.includes('\r\n')) {
    s = s.replace(/\r\n/g, '\n');
    fs.writeFileSync('.gitattributes', s, 'utf8');
    console.log('LF: .gitattributes');
  }
}
console.log('Done. Run: git add -A');

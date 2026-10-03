#!/usr/bin/env node
/**
 * Project Dead Code & Unused Asset Scanner
 * Scans for: unused functions, unused imports, empty directories, unreachable code
 */
import fs from 'fs';
import path from 'path';
const PROJECT_ROOT = process.cwd();
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'coverage']);
const EXCLUDE_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']);
const allFiles = [];
const allFunctions = new Map();
const allImports = new Map();
const allExports = new Map();
const functionCalls = new Map();
const emptyDirs = [];
const orphanedDirs = [];
function walk(dir, rel = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;
    const relPath = rel ? `${rel}/${name}` : name;
    const fullPath = path.join(dir, name);
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(name)) continue;
      const children = fs.readdirSync(fullPath);
      if (children.length === 0) emptyDirs.push(relPath);
      walk(fullPath, relPath);
    } else {
      if (EXCLUDE_FILES.has(name)) continue;
      if (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.ts')) {
        allFiles.push({ fullPath, relPath, name });
      }
    }
  }
}
const RE_FUNCTION = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:function|\(.*?\)\s*=>|\w+\s*=>)|(?:export\s+)?(?:async\s+)?function\s+(\w+))/g;
const RE_ARROW_FN = /const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
const RE_IMPORT = /import\s+(?:{\s*([^}]+)\s*}|\*\s+as\s+(\w+)|\w+)\s+from\s+['"]([^'"]+)['"]/g;
const RE_REQUIRE = /(?:const|let|var)\s+{\s*([^}]+)\s*}\s*=\s*require\(['"]([^'"]+)['"]\)/g;
const RE_EXPORT = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)|export\s+{\s*([^}]+)\s*}/g;
const RE_FUNCTION_CALL = /\b(\w+)\s*\(/g;
function parseFile(file) {
  const content = fs.readFileSync(file.fullPath, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    let m;
    RE_FUNCTION.lastIndex = 0;
    while ((m = RE_FUNCTION.exec(line)) !== null) {
      const name = m[1] || m[2] || m[3];
      if (name) addToMap(allFunctions, name, { file: file.relPath, line: lineNum, type: 'function' });
    }
    RE_ARROW_FN.lastIndex = 0;
    while ((m = RE_ARROW_FN.exec(line)) !== null) {
      addToMap(allFunctions, m[1], { file: file.relPath, line: lineNum, type: 'arrow' });
    }
    RE_IMPORT.lastIndex = 0;
    while ((m = RE_IMPORT.exec(line)) !== null) {
      const names = m[1] ? m[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()) : [m[2] || '*'];
      const source = m[3];
      for (const name of names) {
        if (name && name !== '*') {
          addToMap(allImports, name, { file: file.relPath, line: lineNum, source });
        }
      }
    }
    RE_REQUIRE.lastIndex = 0;
    while ((m = RE_REQUIRE.exec(line)) !== null) {
      const names = m[1].split(',').map(s => s.trim());
      const source = m[2];
      for (const name of names) {
        addToMap(allImports, name, { file: file.relPath, line: lineNum, source });
      }
    }
    RE_EXPORT.lastIndex = 0;
    while ((m = RE_EXPORT.exec(line)) !== null) {
      if (m[1]) {
        addToMap(allExports, m[1], { file: file.relPath, line: lineNum, type: 'named' });
      } else if (m[2]) {
        const names = m[2].split(',').map(s => s.trim().split(/\s+as\s+/).pop());
        for (const name of names) {
          addToMap(allExports, name, { file: file.relPath, line: lineNum, type: 'group' });
        }
      }
    }
    RE_FUNCTION_CALL.lastIndex = 0;
    while ((m = RE_FUNCTION_CALL.exec(line)) !== null) {
      const name = m[1];
      if (!['if', 'while', 'for', 'switch', 'catch', 'return', 'await', 'new', 'typeof', 'instanceof', 'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'Set', 'Map', 'Buffer', 'process', 'require', 'import', 'export', 'from', 'default', 'async', 'function', 'const', 'let', 'var', 'class', 'extends', 'super', 'this', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'in', 'of'].includes(name)) {
        addToMap(functionCalls, name, { file: file.relPath, line: lineNum });
      }
    }
  }
}
function addToMap(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}
function checkDirReferences() {
  const dirsToCheck = ['uploads', 'quarantine', 'Encoding', 'txtinput', 'logs'];
  const referenced = new Set();
  for (const file of allFiles) {
    const content = fs.readFileSync(file.fullPath, 'utf8');
    for (const dir of dirsToCheck) {
      if (content.includes(dir)) referenced.add(dir);
    }
  }
  for (const dir of dirsToCheck) {
    if (!referenced.has(dir)) orphanedDirs.push(dir);
  }
}
function analyze() {
  const unusedFunctions = [];
  const unusedImports = [];
  for (const [name, defs] of allFunctions) {
    const calls = functionCalls.get(name) || [];
    const isExported = allExports.has(name);
    if (calls.length === 0 && !isExported) {
      unusedFunctions.push({ name, defs, reason: 'never called' });
    }
  }
  for (const [name, imports] of allImports) {
    const funcDefs = allFunctions.get(name);
    const calls = functionCalls.get(name);
    const isReExported = allExports.has(name);
    if (!funcDefs && !calls && !isReExported) {
      unusedImports.push({ name, imports });
    }
  }
  return { unusedFunctions, unusedImports, emptyDirs, orphanedDirs };
}
function printReport(report) {
  console.log('\n' + '═'.repeat(60));
  console.log('  DEAD CODE & UNUSED ASSET SCANNER');
  console.log('═'.repeat(60));
  console.log(`\n📁 Scanned ${allFiles.length} files`);
  if (report.emptyDirs.length) {
    console.log(`\n📂 EMPTY DIRECTORIES (${report.emptyDirs.length}):`);
    for (const d of report.emptyDirs) console.log(`   ❌ ${d}`);
  }
  if (report.orphanedDirs.length) {
    console.log(`\n🏚️  ORPHANED/UNREFERENCED DIRS (${report.orphanedDirs.length}):`);
    for (const d of report.orphanedDirs) console.log(`   ⚠️  ${d} — created in code but never referenced`);
  }
  if (report.unusedFunctions.length) {
    console.log(`\n🔴 UNUSED FUNCTIONS (${report.unusedFunctions.length}):`);
    for (const { name, defs, reason } of report.unusedFunctions) {
      for (const d of defs) {
        console.log(`   ❌ ${name}() — ${d.file}:${d.line} (${reason})`);
      }
    }
  }
  if (report.unusedImports.length) {
    console.log(`\n🟡 UNUSED IMPORTS (${report.unusedImports.length}):`);
    for (const { name, imports } of report.unusedImports) {
      for (const imp of imports) {
        console.log(`   ⚠️  ${name} from "${imp.source}" — ${imp.file}:${imp.line}`);
      }
    }
  }
  const totalIssues = report.unusedFunctions.length + report.unusedImports.length + report.emptyDirs.length + report.orphanedDirs.length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  TOTAL ISSUES: ${totalIssues}`);
  console.log(`${'═'.repeat(60)}\n`);
}
console.log('🔍 Scanning project...');
walk(PROJECT_ROOT);
for (const file of allFiles) parseFile(file);
checkDirReferences();
const report = analyze();
printReport(report);
export { allFunctions, allImports, allExports, functionCalls, report };
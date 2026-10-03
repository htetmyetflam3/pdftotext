import fs from 'fs';
import path from 'path';
function stripComments(code) {
const lines = code.split('\n');
const hoisted = [];
const newLines = [];
for (const raw of lines) {
if (/^\s*\/\/\s*import\s/.test(raw)) {
const importMatch = raw.match(/^\s*\/\/\s*(import\s+.*?from\s+['"][^'"]+['"]);?\s*(?:\/\/.*)?$/);
if (importMatch) {
hoisted.push(importMatch[1] + ';');
continue;
}
}
if (/^\s*\/\/\s*export\s/.test(raw)) {
const exportMatch = raw.match(/^\s*\/\/\s*(export\s+.*?);?\s*(?:\/\/.*)?$/);
if (exportMatch) {
hoisted.push(exportMatch[1] + ';');
continue;
}
}
const noBlock = raw.replace(/\/\*[\s\S]*?\*\//g, "");
if (noBlock !== raw) {
if (noBlock.trim()) newLines.push(noBlock);
continue;
}
const noLine = raw.replace(/(^|\s)\/\/.*$/gm, "$1");
if (noLine.trim()) newLines.push(noLine);
}
const body = newLines.join('\n').replace(/\n\s*\n\s*\n/g, "\n\n");
if (hoisted.length) {
const unique = [...new Set(hoisted)];
return unique.join('\n') + '\n\n' + body;
}
return body;
}
function walk(dir) {
const entries = fs.readdirSync(dir, { withFileTypes: true });
for (const e of entries) {
const full = path.join(dir, e.name);
if (e.isDirectory()) {
walk(full);
} else if (e.name.endsWith(".js")) {
const code = fs.readFileSync(full, "utf8");
const cleaned = stripComments(code);
fs.writeFileSync(full, cleaned);
}
}
}
const root = process.argv[2];
if (!root) {
console.error("ERROR: missing directory");
process.exit(1);
}
walk(root);
console.log("DONE");
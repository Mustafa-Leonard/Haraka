const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '../src/generated/client');
const destination = path.resolve(__dirname, '../dist/generated/client');

fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, { recursive: true });

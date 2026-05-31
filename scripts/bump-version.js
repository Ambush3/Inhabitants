#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '../src/changelog.ts');

function getCurrentMonth() {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function bumpMinorVersion(version) {
  const parts = version.split('.');
  if (parts.length === 1) {
    return `${parts[0]}.1`;
  }
  const major = parts[0];
  const minor = parseInt(parts[1], 10) + 1;
  return `${major}.${minor}`;
}

function run() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    console.error(`Could not find changelog at ${CHANGELOG_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  const versionMatch = raw.match(/version:\s*'([\d.]+)'/);
  if (!versionMatch) {
    console.error('Could not find a version string in changelog.ts');
    process.exit(1);
  }

  const currentVersion = versionMatch[1];
  const newVersion = bumpMinorVersion(currentVersion);
  const newDate = getCurrentMonth();

  const newEntry = `  {
    version: '${newVersion}',
    date: '${newDate}',
    changes: [
      // Add your changes here
    ],
  },\n`;

  const exportIndex = raw.indexOf('export const changelog = [');
  if (exportIndex === -1) {
    console.error('Could not find "export const changelog = [" in changelog.ts');
    process.exit(1);
  }

  const insertAt = raw.indexOf('[', exportIndex) + 2;
  const updated = raw.slice(0, insertAt) + '\n' + newEntry + raw.slice(insertAt);

  fs.writeFileSync(CHANGELOG_PATH, updated, 'utf8');

  console.log(`✓ Bumped version ${currentVersion} → ${newVersion}`);
  console.log(`✓ Added new entry for ${newDate} to changelog.ts`);
  console.log(`  Open src/changelog.ts and fill in the changes array.`);
}

run();

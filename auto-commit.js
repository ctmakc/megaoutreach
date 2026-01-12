#!/usr/bin/env node

// Auto commit and push script
// Run with: node auto-commit.js
// Or add to package.json scripts

const { execSync } = require('child_process');

function autoCommit() {
  try {
    // Check if there are changes
    const status = execSync('git status -s', { encoding: 'utf-8' });

    if (status.trim()) {
      console.log('📝 Changes detected, committing...');

      // Add all changes
      execSync('git add -A');

      // Commit with timestamp
      const timestamp = new Date().toISOString().replace('T', ' ').substr(0, 19);
      execSync(`git commit -m "auto: ${timestamp}"`);

      // Push to remote
      execSync('git push origin main');

      console.log(`✅ Pushed at ${timestamp}`);
    } else {
      console.log('✨ No changes to commit');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run immediately
autoCommit();

// Run every hour (3600000ms)
setInterval(autoCommit, 3600000);

console.log('🚀 Auto-commit running... Will commit every hour');

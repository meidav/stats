#!/usr/bin/env node
/**
 * Patches the Xcode project (project.pbxproj) with version and build from app.json.
 * Run after `expo prebuild` so the General tab in Xcode shows the correct Version and Build.
 * Usage: node scripts/patch-ios-version.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');
const iosDir = path.join(root, 'ios');

if (!fs.existsSync(iosDir)) {
  console.warn('Warning: ios folder not found. Run "npx expo prebuild --platform ios" first.');
  process.exit(0);
}

const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const version = app.expo?.version || '1.0.0';
const build = String(app.expo?.ios?.buildNumber ?? '1');

const xcodeprojDir = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcodeproj'));
if (!xcodeprojDir) {
  console.warn('Warning: No .xcodeproj found in ios/');
  process.exit(0);
}

const pbxprojPath = path.join(iosDir, xcodeprojDir, 'project.pbxproj');
if (!fs.existsSync(pbxprojPath)) {
  console.warn('Warning: project.pbxproj not found');
  process.exit(0);
}

let content = fs.readFileSync(pbxprojPath, 'utf8');

content = content.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
content = content.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);

fs.writeFileSync(pbxprojPath, content);

const infoPlistPath = path.join(iosDir, 'PlayTracker', 'Info.plist');
if (fs.existsSync(infoPlistPath)) {
  let plist = fs.readFileSync(infoPlistPath, 'utf8');
  plist = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${version}$2`,
  );
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/,
    `$1${build}$2`,
  );
  fs.writeFileSync(infoPlistPath, plist);
}

console.log(`Patched ios: Version ${version}, Build ${build}`);
console.log('Re-open the project in Xcode if it was already open.');

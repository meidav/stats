// app.json stays the source of truth for version, icons, and IDs so that
// scripts/patch-ios-version.js keeps working. This file only derives the
// native sign-in configuration that has to be computed rather than hardcoded.

const appJson = require('./app.json');

const base = appJson.expo;
const iosClientId = base.extra?.googleIosClientId || '';

// The Google iOS SDK returns to the app through the reversed client ID URL scheme.
function reversedClientId(clientId) {
  if (!clientId) return '';
  return `com.googleusercontent.apps.${clientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
}

const iosUrlScheme = reversedClientId(iosClientId);

const plugins = [...(base.plugins || [])].filter(
  (plugin) => plugin !== '@react-native-google-signin/google-signin',
);

// Without the URL scheme the Google plugin fails prebuild, so it only goes in
// once an iOS OAuth client exists. The login screen hides the button until then.
if (iosUrlScheme) {
  plugins.push(['@react-native-google-signin/google-signin', { iosUrlScheme }]);
}

plugins.push('expo-apple-authentication');

module.exports = () => ({
  ...base,
  ios: {
    ...base.ios,
    usesAppleSignIn: true,
  },
  plugins,
});

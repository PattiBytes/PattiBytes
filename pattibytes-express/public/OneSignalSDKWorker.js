// Redirect: all push handling is now in /sw.js which imports OneSignalSDK.sw.js
// This file must exist for backward compatibility with already-subscribed browsers
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

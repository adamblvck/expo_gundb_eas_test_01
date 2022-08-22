# Expo GunDB EAS TEST

snippets: https://github.com/amark/gun/wiki/Snippets

## Patching `webivew-crypto`

npm install patch-package
yarn patch-package webview-crypto --use-yarn

## To Test

Create a few tabs to check and test a few stress tests of the application.

1. Account creation - online
   - Test creation of 600+ random items while online
   - Login on another device, and check if these are loaded, and check how long it loads to load them all.

2. Account creation - offline
   - Create 600+ random items while offline
   - Close device, and app
   - Re-open app, check consistency of apps
   - Go online, on device, and wait
   - Login on another device, check if items are loaded, and check how long it loads to load them all


3. Encrypt titles and contents on 600+ items + retrieve, check performance

4. Backup of data (export as CSV or JSON format, and allowing for re-importing)

5. Encryption of images using EAS, testing with files sizes up to 2Mbytes (on both iOS and Android)



--> Example of linking together blogpost information
--> https://stackoverflow.com/questions/56044288/private-write-and-public-read-in-gundb
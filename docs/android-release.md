# GoHMoTech Android release guide

GoHMoTech Android releases use the permanent application identity
**com.gohmotech.owner**. Do not change that ID to solve an installation or
signing problem.

An APK can update an installed copy only when all of these are true:

1. Both APKs use com.gohmotech.owner.
2. The new APK is signed with the same compatible signing identity as the
   installed APK.
3. The new APK has a higher versionCode.

The APK filename does not affect update compatibility.

## Before adopting or changing the production key

First obtain the APK currently installed by the client, or the keystore used to
sign it. Compare its signing certificate with the proposed release key. A new
keystore cannot update an app signed with a different key. Do not uninstall the
client app to work around a certificate mismatch because uninstalling removes
its application data.

If the installed app is a debug build, it was normally signed with the
developer machine's debug key. A production-key APK cannot update it directly.
Plan that one-time migration with the client before distributing production
builds.

## Create the permanent key only when no compatible key already exists

Store the key outside the repository in a secure, backed-up location. Run this
command locally and answer the password prompts; do not put passwords on the
command line:

    keytool -genkeypair -v -keystore "C:\secure\gohmotech-release.jks" -alias gohmotech -keyalg RSA -keysize 4096 -validity 10000

This key is permanent for this Android application. Back it up securely and do
not generate a replacement for each release.

## Configure local signing

Copy the example file:

    Copy-Item android\signing.properties.example android\signing.properties

Fill in android/signing.properties locally:

    GOHMOTECH_KEYSTORE_PATH=C:/secure/gohmotech-release.jks
    GOHMOTECH_KEYSTORE_PASSWORD=<local value>
    GOHMOTECH_KEY_ALIAS=gohmotech
    GOHMOTECH_KEY_PASSWORD=<local value>

The path may be absolute or relative to android/. The same four names may
instead be stored in the developer's private Gradle properties file at
$HOME/.gradle/gradle.properties. Gradle properties take precedence over
android/signing.properties.

Never commit the keystore, signing.properties, passwords, or other signing
secrets. The repository ignores .jks, .keystore, .p12, and the local signing
properties file.

## Version each release

Before every distributed build, edit android/app/build.gradle:

    versionCode 16
    versionName "1.6"

Every distributed APK must use a versionCode greater than every previously
distributed build. versionName is the user-visible release label.

## Build

    npm run test:unit -- --run
    npm run build
    npm run lint
    npx cap sync android

    Push-Location android
    .\gradlew.bat assembleDebug
    .\gradlew.bat assembleRelease
    Pop-Location

Debug builds continue to use normal Android debug signing. Release builds never
fall back to that key: assembleRelease fails if any signing value or the
keystore file is unavailable.

The signed release APK is generated as:

    android/app/build/outputs/apk/release/GoHMoTech-<versionName>-release.apk

Never distribute the debug APK as a production release.

## Verify before delivery

Use Android SDK tools to inspect the old and new APKs:

    apkanalyzer manifest application-id old.apk
    apkanalyzer manifest application-id android\app\build\outputs\apk\release\GoHMoTech-1.6-release.apk
    apkanalyzer manifest version-code old.apk
    apkanalyzer manifest version-code android\app\build\outputs\apk\release\GoHMoTech-1.6-release.apk
    apksigner verify --print-certs old.apk
    apksigner verify --print-certs android\app\build\outputs\apk\release\GoHMoTech-1.6-release.apk

Confirm the same application ID and compatible signing certificate, plus a
higher version code on the new APK. Then test a manual installation over the
previous production version without uninstalling it. Android should offer an
update and retain application data.

Do not implement silent installation or bypass Android/Play Protect warnings.

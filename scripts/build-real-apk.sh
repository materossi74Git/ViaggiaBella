#!/bin/bash
set -e

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "=== STEP 1: Installazione Android Platform 36 e Build Tools ==="
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-36" "build-tools;35.0.0"

echo "sdk.dir=/opt/android-sdk" > android/local.properties

echo "=== STEP 2: Compilazione Web e Sync Capacitor ==="
npm run build
npx cap sync android

echo "=== STEP 3: Compilazione Gradle dell'APK Nativo (assembleDebug) ==="
cd android
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon -Dorg.gradle.jvmargs="-Xmx1536m -XX:MaxMetaspaceSize=384m"
cd ..

echo "=== STEP 4: Copia dell'APK nella cartella pubblica ==="
mkdir -p public
cp android/app/build/outputs/apk/debug/app-debug.apk public/viaggiabella.apk

ls -lh public/viaggiabella.apk
echo "=== SUCCESSO: APK COMPILATO E PUBBLICATO! ==="

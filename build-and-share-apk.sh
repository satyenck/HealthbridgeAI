#!/bin/bash

# HealthbridgeAI - Build APK for Direct Distribution
# This script builds a release APK that you can share directly with doctors

set -e  # Exit on error

echo "========================================="
echo "HealthbridgeAI APK Builder"
echo "========================================="
echo ""

cd "$(dirname "$0")/frontend"

# Step 1: Check if keystore exists
KEYSTORE_FILE="android/app/healthbridge-release.keystore"
KEYSTORE_PROPS="android/keystore.properties"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  No release keystore found. Creating one..."
    echo ""
    echo "You'll be asked to create a password. Remember this password!"
    echo "Press Enter to continue..."
    read

    cd android/app
    keytool -genkeypair -v \
        -storetype PKCS12 \
        -keystore healthbridge-release.keystore \
        -alias healthbridge-key \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=HealthbridgeAI, OU=Development, O=HealthbridgeAI, L=Mumbai, ST=Maharashtra, C=IN"

    cd ../..

    echo ""
    echo "✅ Keystore created successfully!"
    echo ""
fi

# Step 2: Create keystore.properties if it doesn't exist
if [ ! -f "$KEYSTORE_PROPS" ]; then
    echo "Creating keystore.properties..."

    # Prompt for password
    echo ""
    echo "Enter the keystore password you just created:"
    read -s KEYSTORE_PASSWORD

    cat > android/keystore.properties <<EOF
storeFile=app/healthbridge-release.keystore
storePassword=$KEYSTORE_PASSWORD
keyAlias=healthbridge-key
keyPassword=$KEYSTORE_PASSWORD
EOF

    echo "✅ keystore.properties created"
    echo ""
fi

# Step 3: Update version name
VERSION=$(date +%Y.%m.%d)
echo "Building version: $VERSION"
echo ""

# Step 4: Clean previous builds
echo "Step 1/3: Cleaning previous builds..."
cd android
./gradlew clean > /dev/null 2>&1

# Step 5: Build release APK
echo "Step 2/3: Building release APK (this will take 5-10 minutes)..."
./gradlew assembleRelease

# Step 6: Copy APK to Desktop
echo "Step 3/3: Copying APK to Desktop..."
cd ..
APK_SOURCE="android/app/build/outputs/apk/release/app-release.apk"
APK_DEST="$HOME/Desktop/HealthbridgeAI-$VERSION.apk"

if [ -f "$APK_SOURCE" ]; then
    cp "$APK_SOURCE" "$APK_DEST"

    # Get file size
    SIZE=$(du -h "$APK_DEST" | cut -f1)

    echo ""
    echo "========================================="
    echo "✅ BUILD SUCCESSFUL!"
    echo "========================================="
    echo ""
    echo "APK Location: $APK_DEST"
    echo "APK Size: $SIZE"
    echo ""
    echo "📱 HOW TO SHARE WITH YOUR DOCTOR FRIEND:"
    echo ""
    echo "METHOD 1: Google Drive (Easiest)"
    echo "  1. Upload the APK to Google Drive"
    echo "  2. Right-click → Share → Get link"
    echo "  3. Send the link to your doctor"
    echo ""
    echo "METHOD 2: WhatsApp/Email"
    echo "  1. Attach the APK file"
    echo "  2. Send to your doctor"
    echo ""
    echo "METHOD 3: AirDrop (if nearby)"
    echo "  1. Use AirDrop to send the APK file"
    echo ""
    echo "📋 INSTALLATION INSTRUCTIONS FOR DOCTOR:"
    echo ""
    echo "1. Download the APK file on Android phone"
    echo "2. Open the file (Chrome will show security warning)"
    echo "3. Tap 'Settings' → Enable 'Install unknown apps' for Chrome"
    echo "4. Go back and tap 'Install'"
    echo "5. Open HealthbridgeAI app"
    echo ""
    echo "🔐 LOGIN CREDENTIALS:"
    echo "   Phone: +919876543210"
    echo "   (Use phone number verification)"
    echo ""
    echo "========================================="

    # Open Desktop in Finder
    open "$HOME/Desktop"
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi

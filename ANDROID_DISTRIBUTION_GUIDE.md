# Android App Distribution Guide - HealthbridgeAI

## Overview
This guide will help you build the Android APK and distribute it to doctors for testing.

---

## Prerequisites

Before building the APK, you must:

1. ✅ **Deploy backend to AWS** (follow `AWS_DEPLOYMENT_GUIDE.md`)
2. ✅ **Get your production API URL** (e.g., `https://api.healthbridgeai.com`)
3. ✅ **Test backend is working** (visit `/health` endpoint)
4. ✅ **Have Android Studio installed** (or React Native CLI setup)
5. ✅ **Have Java JDK 17+ installed**

---

## Phase 1: Update API Configuration

### 1.1 Update Production API URL

Edit `/frontend/src/config/api.ts`:

```typescript
import { Platform } from 'react-native';

const getDevBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';  // Android emulator
  }
  return 'http://localhost:8000';  // iOS simulator/web
};

export const API_CONFIG = {
  BASE_URL: __DEV__
    ? getDevBaseUrl()
    : 'https://api.healthbridgeai.com',  // ⚠️ CHANGE THIS TO YOUR PRODUCTION URL
  TIMEOUT: 90000,
};
```

**Important:** Replace `https://api.healthbridgeai.com` with your actual AWS backend URL!

### 1.2 Verify API Endpoints

Make sure all endpoints in `/frontend/src/config/api.ts` are correct:

```typescript
export const API_ENDPOINTS = {
  // AUTH
  PHONE_SEND_CODE: '/api/auth/phone/send-code',
  PHONE_VERIFY: '/api/auth/phone/verify',
  PHONE_DIRECT_LOGIN: '/api/auth/phone/direct-login',

  // PROFILE
  PROFILE: '/api/profile',
  // ... etc
};
```

---

## Phase 2: Prepare for Release Build

### 2.1 Update App Version

Edit `/frontend/android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.healthbridgeai"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1       // Increment this for each release
        versionName "1.0.0" // Update this for version display
    }
}
```

### 2.2 Update App Name (Optional)

Edit `/frontend/android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">HealthbridgeAI</string>
</resources>
```

### 2.3 Generate Signing Key

**⚠️ Only do this ONCE - save the keystore file safely!**

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/app

# Generate release keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore healthbridge-release.keystore \
  -alias healthbridge-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be asked:
# - Enter keystore password: [CREATE STRONG PASSWORD - SAVE IT!]
# - Re-enter new password: [SAME PASSWORD]
# - What is your first and last name? Your Name
# - What is the name of your organizational unit? HealthbridgeAI
# - What is the name of your organization? HealthbridgeAI
# - What is the name of your City or Locality? Your City
# - What is the name of your State or Province? Your State
# - What is the two-letter country code? US
# - Is CN=... correct? yes
# - Enter key password (RETURN if same as keystore): [PRESS ENTER]
```

**💾 CRITICAL: Save these safely:**
- `healthbridge-release.keystore` file
- Keystore password
- Alias: `healthbridge-key`

### 2.4 Configure Gradle Signing

Edit `/frontend/android/app/build.gradle`:

Add this ABOVE the `android {` block:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Then INSIDE the `android {` block, add:

```gradle
android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 2.5 Create Keystore Properties File

Create `/frontend/android/keystore.properties`:

```bash
nano /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/keystore.properties
```

**Add this (replace with your actual password):**

```properties
storeFile=app/healthbridge-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=healthbridge-key
keyPassword=YOUR_KEYSTORE_PASSWORD
```

**⚠️ NEVER commit this file to git!** Add to `.gitignore`:

```bash
echo "keystore.properties" >> /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/.gitignore
echo "*.keystore" >> /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/.gitignore
```

---

## Phase 3: Build Release APK

### 3.1 Clean Previous Builds

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android

# Clean
./gradlew clean
```

### 3.2 Build Release APK

```bash
# Build release APK
./gradlew assembleRelease

# This will take 5-10 minutes...
```

### 3.3 Locate APK File

**APK location:**
```
/Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/app/build/outputs/apk/release/app-release.apk
```

### 3.4 Rename APK (Optional)

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android/app/build/outputs/apk/release

# Rename with version
cp app-release.apk ~/Desktop/HealthbridgeAI-v1.0.0.apk

# Check file size
ls -lh ~/Desktop/HealthbridgeAI-v1.0.0.apk
```

**Expected size:** 40-80 MB (depending on dependencies)

---

## Phase 4: Test the APK

### 4.1 Install on Your Device

**Method 1: USB Cable**

```bash
# Connect phone via USB
# Enable "USB Debugging" on phone (Developer Options)

# Install APK
adb install ~/Desktop/HealthbridgeAI-v1.0.0.apk

# Or reinstall (if already installed)
adb install -r ~/Desktop/HealthbridgeAI-v1.0.0.apk
```

**Method 2: Transfer File**

1. Copy APK to phone (via USB, Google Drive, etc.)
2. On phone: Open file manager → Find APK → Tap to install
3. Allow "Install from Unknown Sources" if prompted

### 4.2 Test Checklist

Before distributing to doctors, test:

- [ ] App opens without crashing
- [ ] Login with phone number works
- [ ] Can view dashboard/home screen
- [ ] Can create new encounter/consultation
- [ ] Voice recording works
- [ ] Media upload works
- [ ] Profile screen loads
- [ ] Logout works
- [ ] Data persists after logout/login
- [ ] App connects to production backend
- [ ] SSL/HTTPS works (no certificate errors)

---

## Phase 5: Distribution Methods

### Option A: Google Drive (Recommended for Testing)

**Best for:** 2-10 testers

1. **Upload to Google Drive:**
   ```bash
   # Upload HealthbridgeAI-v1.0.0.apk to Google Drive
   ```

2. **Get shareable link:**
   - Right-click APK → Share → Anyone with link

3. **Share instructions with doctors:**

   ```
   HealthbridgeAI Android App - Installation Instructions

   1. Click this link on your Android phone:
      [GOOGLE DRIVE LINK]

   2. Download the APK file

   3. Open the downloaded file

   4. If prompted, enable "Install from Unknown Sources"
      Settings → Security → Unknown Sources → Enable

   5. Tap "Install"

   6. Open the app and login with your phone number

   Login credentials:
   - Phone: [PROVIDE PHONE NUMBER]
   - Password: Not required (direct login)

   Support:
   - Email: [YOUR EMAIL]
   - Phone: [YOUR PHONE]
   ```

### Option B: Email Distribution

**Best for:** 1-5 testers

1. Email APK as attachment (or use file sharing link if > 25MB)
2. Include installation instructions (same as above)

### Option C: Firebase App Distribution (Recommended for 10+ Testers)

**Best for:** Professional beta testing

1. **Create Firebase Project:**
   - Go to https://firebase.google.com
   - Create new project: "HealthbridgeAI"

2. **Add Android App:**
   - Package name: `com.healthbridgeai`

3. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

4. **Upload APK:**
   ```bash
   firebase appdistribution:distribute \
     ~/Desktop/HealthbridgeAI-v1.0.0.apk \
     --app YOUR_FIREBASE_APP_ID \
     --groups "doctors" \
     --release-notes "Initial beta release for testing"
   ```

5. **Invite testers:**
   - Add doctor emails in Firebase Console
   - They receive email with download link
   - They install Firebase App Distribution app
   - Download and install your APK

### Option D: TestFlight Alternative (Diawi)

**Best for:** Quick, professional sharing

1. **Upload to Diawi:**
   - Go to https://www.diawi.com
   - Upload APK
   - Get QR code + link

2. **Share link with doctors**
   - They scan QR code or open link
   - Download and install

---

## Phase 6: Create Test Accounts

### 6.1 Create Doctor Accounts

On your AWS backend, create test doctor accounts:

```bash
# SSH into EC2
ssh -i ~/Downloads/healthbridge-key.pem ubuntu@YOUR_EC2_IP

# Access PostgreSQL
cd /var/www/healthbridge/backend
source venv/bin/activate
python

# In Python:
from app.database import get_db
from app.models_v2 import User, DoctorProfile, UserRole
from sqlalchemy.orm import Session

# Get database session
db = next(get_db())

# Create doctor user
doctor = User(
    phone_number="+15551234567",  # Change to real phone
    role=UserRole.DOCTOR,
    is_active=True
)
db.add(doctor)
db.commit()
db.refresh(doctor)

# Create doctor profile
profile = DoctorProfile(
    user_id=doctor.user_id,
    first_name="Dr. John",
    last_name="Smith",
    email="john.smith@example.com",
    phone="+15551234567",
    address="123 Medical St",
    specialty="General Medicine"
)
db.add(profile)
db.commit()

print(f"Doctor created with phone: {doctor.phone_number}")
print(f"User ID: {doctor.user_id}")

db.close()
exit()
```

Repeat for each doctor tester.

---

## Phase 7: Monitoring & Support

### 7.1 Collect Feedback

Create a Google Form with questions:
- Did the app install successfully?
- Did login work?
- Which features did you test?
- Did you encounter any crashes?
- What would you improve?
- Overall rating (1-5 stars)

### 7.2 Monitor Backend Logs

```bash
# SSH to EC2
ssh -i ~/Downloads/healthbridge-key.pem ubuntu@YOUR_EC2_IP

# Watch application logs
sudo journalctl -u healthbridge -f

# Watch Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Watch Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 7.3 Track Issues

Create a simple tracking sheet:

| Doctor Name | Phone | Installed? | Login Works? | Issues | Status |
|-------------|-------|------------|--------------|--------|--------|
| Dr. Smith   | +1... | Yes        | Yes          | None   | ✅     |
| Dr. Johnson | +1... | Yes        | No           | Error  | 🔧     |

---

## Phase 8: Updates & Iterations

### 8.1 Release Update Process

When you need to release an update:

1. **Update version:**
   ```gradle
   versionCode 2        // Increment
   versionName "1.0.1"  // Update
   ```

2. **Make code changes**

3. **Build new APK:**
   ```bash
   cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

4. **Rename with new version:**
   ```bash
   cp app/build/outputs/apk/release/app-release.apk \
      ~/Desktop/HealthbridgeAI-v1.0.1.apk
   ```

5. **Redistribute** using same method

### 8.2 Notify Testers

Send update email:

```
Subject: HealthbridgeAI App Update - Version 1.0.1

Hi Doctors,

We've released an update to the HealthbridgeAI app.

What's New:
- Fixed login issue
- Improved voice recording quality
- Added patient search feature

Please download and install:
[LINK TO APK]

You may need to uninstall the old version first.

Thanks for your feedback!
```

---

## Troubleshooting

### APK won't install on phone

**Solution:**
1. Enable "Install from Unknown Sources"
2. Uninstall previous version
3. Clear Download cache
4. Try different file transfer method

### Build fails

**Solution:**
```bash
# Clean everything
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android
./gradlew clean
rm -rf ~/.gradle/caches

# Rebuild
./gradlew assembleRelease
```

### "App keeps crashing"

**Solution:**
1. Check API URL is correct
2. Check backend is running
3. Check SSL certificate is valid
4. View Android logs:
   ```bash
   adb logcat | grep -i healthbridge
   ```

### "Can't login"

**Solution:**
1. Verify doctor account exists in database
2. Check phone number format (+15551234567)
3. Check backend logs for errors
4. Test API endpoint directly:
   ```bash
   curl -X POST https://api.healthbridgeai.com/api/auth/phone/direct-login \
     -H "Content-Type: application/json" \
     -d '{"phone_number":"+15551234567"}'
   ```

---

## Production Release (Play Store)

When ready for public release:

1. **Create Google Play Console account** ($25 one-time fee)
2. **Create app listing**
3. **Upload AAB** (Android App Bundle):
   ```bash
   ./gradlew bundleRelease
   # Upload: app/build/outputs/bundle/release/app-release.aab
   ```
4. **Complete store listing:**
   - App description
   - Screenshots
   - Privacy policy
   - Content rating
5. **Submit for review**
6. **Wait 2-7 days** for approval

---

## Quick Reference

### Build Commands

```bash
# Development APK
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend
npx react-native run-android

# Release APK
cd android
./gradlew clean
./gradlew assembleRelease

# APK location
# android/app/build/outputs/apk/release/app-release.apk
```

### Installation Commands

```bash
# Install via ADB
adb install path/to/app-release.apk

# Reinstall (overwrite)
adb install -r path/to/app-release.apk

# Uninstall
adb uninstall com.healthbridgeai
```

### Keystore Info

```bash
# View keystore details
keytool -list -v \
  -keystore android/app/healthbridge-release.keystore \
  -alias healthbridge-key
```

---

## Cost Estimate

**Testing Phase (2-10 doctors):**
- APK Distribution: Free (Google Drive)
- Firebase App Distribution: Free tier
- Total: $0

**Play Store Release:**
- Google Play Developer Account: $25 (one-time)
- App maintenance: $0
- Total: $25

---

## Security Notes

- ✅ APK is signed with your keystore
- ✅ HTTPS only (SSL enforced)
- ✅ No hardcoded credentials
- ✅ Direct login requires existing account
- ⚠️ Keep keystore file safe (needed for all updates)
- ⚠️ Never share keystore password publicly

---

**Created:** January 2026
**Version:** 1.0.0

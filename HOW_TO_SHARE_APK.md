# How to Share HealthbridgeAI APK with Your Doctor Friend

## Quick Start (5 Minutes)

### Step 1: Build the APK

Run this command in your terminal:

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI
./build-and-share-apk.sh
```

**What happens:**
- First time: Creates a signing keystore (you'll set a password - remember it!)
- Builds the APK (~5-10 minutes)
- Saves APK to your Desktop as `HealthbridgeAI-2026.02.22.apk`
- Opens Finder showing the APK file

---

## Step 2: Share the APK

### Option A: Google Drive (Easiest) ⭐

1. Go to [drive.google.com](https://drive.google.com)
2. Click "New" → "File upload"
3. Select the APK from your Desktop
4. After upload completes:
   - Right-click the file
   - Click "Share" → "Get link"
   - Set "Anyone with the link" → "Viewer"
   - Click "Copy link"
5. Send the link to your doctor friend via WhatsApp/Email

### Option B: WhatsApp Direct

1. Open WhatsApp Web or app
2. Start chat with your doctor friend
3. Click the attachment icon (📎)
4. Select "Document"
5. Choose the APK file from Desktop
6. Send!

### Option C: Email

1. Compose new email
2. Attach the APK file
3. Send to your doctor friend

---

## Step 3: Installation Instructions (For Your Doctor)

Send these instructions to your doctor friend:

```
📱 HOW TO INSTALL HEALTHBRIDGEAI

1. Download the APK file I sent you

2. Open the downloaded APK file
   (You may see a security warning - this is normal for apps
   installed outside Google Play Store)

3. If prompted:
   - Tap "Settings"
   - Enable "Install unknown apps" or "Allow from this source"
   - Go back to the APK

4. Tap "Install"

5. Wait for installation to complete (~30 seconds)

6. Tap "Open" or find "HealthbridgeAI" in your apps

7. LOGIN CREDENTIALS:
   - Phone: +919876543210
   - Use phone number verification (OTP will be sent)

That's it! You're all set to use HealthbridgeAI.
```

---

## Important Notes

### ✅ Security
- The APK is **safe** - it's your own app
- Android shows warnings for all apps installed outside Play Store
- Your doctor should enable "Install unknown apps" only for the app they're using to install (Chrome, WhatsApp, etc.)

### 💾 Keystore File
The script creates a `healthbridge-release.keystore` file. This is VERY important:
- **KEEP IT SAFE** - You need it to update the app in the future
- **NEVER SHARE IT** - It's like your app's private key
- **BACKUP IT** - Store it securely (not in Git)

If you lose this file, you can't update the app - you'll have to create a new one!

### 🔄 Updating the App
To share an updated version:
1. Make your code changes
2. Run `./build-and-share-apk.sh` again
3. Share the new APK
4. Your doctor uninstalls old version and installs new one

---

## Troubleshooting

### Build Failed?

**Error: "keytool: command not found"**
```bash
# Install Java JDK if not installed
brew install openjdk@17
```

**Error: "Gradle build failed"**
```bash
# Clean and try again
cd frontend/android
./gradlew clean
cd ../..
./build-and-share-apk.sh
```

### Installation Failed on Phone?

**"App not installed"**
- Make sure old version is uninstalled first
- Free up storage space (need ~100MB)
- Restart phone and try again

**"Parse error"**
- APK file may be corrupted during download
- Re-download or use different sharing method

---

## Production Deployment (Later)

For wider distribution to many doctors, consider:

1. **Google Play Store** ($25 one-time fee)
   - Professional distribution
   - Automatic updates
   - Better trust from users

2. **Firebase App Distribution** (Free)
   - Beta testing with groups
   - Automatic notifications for updates
   - Usage analytics

For now, direct APK sharing is perfect for 1-10 test users!

---

## Questions?

- APK too large? It's normal (40-80 MB with all dependencies)
- Need different credentials? Create new doctor account in admin panel
- Want to test first? Install on your own Android device before sharing

Good luck! 🚀

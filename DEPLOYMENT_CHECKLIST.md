# HealthbridgeAI Deployment Checklist

Quick reference for deploying backend to AWS and distributing Android app to doctors.

---

## Pre-Deployment Checklist

- [ ] Have AWS account ready
- [ ] Have domain name (optional but recommended)
- [ ] Have Gemini API key
- [ ] Have test doctor phone numbers ready
- [ ] Android development environment set up

---

## Part 1: Backend Deployment (AWS)

**Time Required:** 2-3 hours
**Reference:** `AWS_DEPLOYMENT_GUIDE.md`

### Step 1: Database (15 min)
- [ ] Create RDS PostgreSQL instance
- [ ] Save database endpoint URL
- [ ] Save master password
- [ ] Configure security group

### Step 2: Server Setup (20 min)
- [ ] Launch EC2 Ubuntu instance
- [ ] Download and save .pem key file
- [ ] Save public IP address
- [ ] Update security groups

### Step 3: Install Software (30 min)
- [ ] SSH into EC2 instance
- [ ] Install Python 3.11, Nginx, Certbot, Git
- [ ] Clone repository
- [ ] Create virtual environment
- [ ] Install Python dependencies

### Step 4: Configuration (20 min)
- [ ] Create `.env` file with production settings
- [ ] Generate SECRET_KEY (use `openssl rand -hex 32`)
- [ ] Add Gemini API key
- [ ] Add RDS database URL
- [ ] Run database migrations (`alembic upgrade head`)

### Step 5: Service Setup (15 min)
- [ ] Create systemd service file
- [ ] Start and enable service
- [ ] Verify service is running (`sudo systemctl status healthbridge`)

### Step 6: Nginx & SSL (30 min)
- [ ] Configure Nginx reverse proxy
- [ ] Setup DNS A record (if using domain)
- [ ] Install SSL certificate with Certbot
- [ ] Test HTTPS access

### Step 7: Verification (10 min)
- [ ] Test API: `curl https://api.yourdomal.com/health`
- [ ] Should return `{"status":"healthy"}`
- [ ] Check logs: `sudo journalctl -u healthbridge -f`

**✅ Backend Deployment Complete!**

---

## Part 2: Android App Build & Distribution

**Time Required:** 1-2 hours
**Reference:** `ANDROID_DISTRIBUTION_GUIDE.md`

### Step 1: Update Configuration (10 min)
- [ ] Update production API URL in `/frontend/src/config/api.ts`
- [ ] Change `BASE_URL` to your AWS backend URL
- [ ] Verify all API endpoints are correct

### Step 2: Prepare Release (30 min)
- [ ] Update version in `android/app/build.gradle`
- [ ] Generate release keystore (ONE TIME ONLY!)
  ```bash
  keytool -genkeypair -v -storetype PKCS12 \
    -keystore android/app/healthbridge-release.keystore \
    -alias healthbridge-key -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Save keystore password securely
- [ ] Create `android/keystore.properties` file
- [ ] Update `android/app/build.gradle` with signing config
- [ ] Add `keystore.properties` to `.gitignore`

### Step 3: Build APK (15 min)
- [ ] Clean: `cd android && ./gradlew clean`
- [ ] Build: `./gradlew assembleRelease`
- [ ] Locate APK: `android/app/build/outputs/apk/release/app-release.apk`
- [ ] Rename: `cp app-release.apk ~/Desktop/HealthbridgeAI-v1.0.0.apk`

### Step 4: Test APK (20 min)
- [ ] Install on your test device
- [ ] Test login with phone number
- [ ] Test creating encounter/consultation
- [ ] Test voice recording
- [ ] Test media upload
- [ ] Test logout and re-login
- [ ] Verify data syncs with backend

### Step 5: Create Doctor Accounts (15 min)
- [ ] SSH into EC2
- [ ] Run Python script to create doctor users
- [ ] Save doctor phone numbers and credentials

### Step 6: Distribute to Doctors (10 min)

**Option A: Google Drive (Easiest)**
- [ ] Upload APK to Google Drive
- [ ] Get shareable link
- [ ] Send link + installation instructions to doctors

**Option B: Firebase App Distribution (Professional)**
- [ ] Create Firebase project
- [ ] Install Firebase CLI
- [ ] Upload APK
- [ ] Invite doctor emails
- [ ] Send download instructions

### Step 7: Support & Monitor (Ongoing)
- [ ] Create feedback Google Form
- [ ] Share with doctors
- [ ] Monitor backend logs
- [ ] Track issues in spreadsheet
- [ ] Respond to doctor questions

**✅ Android Distribution Complete!**

---

## Quick Command Reference

### AWS Backend Commands
```bash
# SSH to server
ssh -i ~/Downloads/healthbridge-key.pem ubuntu@YOUR_EC2_IP

# Check service status
sudo systemctl status healthbridge

# View logs
sudo journalctl -u healthbridge -f

# Restart service
sudo systemctl restart healthbridge

# Test API
curl https://api.yourdomain.com/health
```

### Android Build Commands
```bash
# Build release APK
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend/android
./gradlew clean
./gradlew assembleRelease

# Install on device
adb install ~/Desktop/HealthbridgeAI-v1.0.0.apk
```

---

## Important Files to Save

**AWS:**
- ✅ EC2 .pem key file
- ✅ RDS database password
- ✅ Backend .env file (with SECRET_KEY)

**Android:**
- ✅ `healthbridge-release.keystore` file
- ✅ Keystore password
- ✅ `keystore.properties` file

**⚠️ CRITICAL:** Never lose these files - they're needed for all future updates!

---

## Cost Summary

### AWS Backend
- **Free Tier (12 months):** $0/month
- **After Free Tier:** ~$45/month
- **Production:** ~$120/month

### Android Distribution
- **Testing (Google Drive):** $0
- **Testing (Firebase):** $0
- **Play Store Release:** $25 one-time

---

## Support Contacts

**If deployment fails:**
1. Check AWS Console for errors
2. Review logs: `sudo journalctl -u healthbridge -f`
3. Verify security groups allow traffic
4. Test database connection from EC2

**If APK won't install:**
1. Enable "Unknown Sources" on phone
2. Uninstall previous version
3. Check APK file isn't corrupted
4. Try different transfer method

**If login fails:**
1. Verify backend is running
2. Check API URL in app config
3. Verify doctor account exists
4. Test API endpoint with curl

---

## Timeline Estimate

| Task | Time |
|------|------|
| AWS RDS Setup | 15 min |
| AWS EC2 Setup | 20 min |
| Software Installation | 30 min |
| Backend Configuration | 20 min |
| Service Setup | 15 min |
| Nginx & SSL | 30 min |
| **Backend Total** | **~2.5 hours** |
| | |
| App Configuration | 10 min |
| Keystore Generation | 15 min |
| APK Build | 15 min |
| Testing | 20 min |
| Doctor Account Creation | 15 min |
| Distribution Setup | 10 min |
| **Android Total** | **~1.5 hours** |
| | |
| **Grand Total** | **~4 hours** |

*First time: 4-6 hours (including learning)*
*Subsequent deploys: 1-2 hours*

---

## Next Steps After Testing

Once doctors test successfully:

1. **Gather Feedback**
   - Create survey
   - Schedule calls with doctors
   - Document feature requests

2. **Iterate**
   - Fix reported bugs
   - Add requested features
   - Improve UX based on feedback

3. **Scale Up**
   - Add more doctors
   - Upgrade AWS instances if needed
   - Consider load balancer

4. **Go Public**
   - Submit to Google Play Store
   - Create iOS version
   - Launch marketing

---

**Good luck with your deployment!** 🚀

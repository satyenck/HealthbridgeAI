# 🔐 Login Credentials & Instructions

## 📋 All User Accounts

### 👨‍⚕️ **DOCTORS**

1. **Dr. David Mays**
   - 📱 Phone: `+919876543210`
   - 📧 Email: david.mays@healthbridge.com
   - 🆔 User ID: `a80b8766-92ad-4466-ba64-5012b55f4e2c`
   - ✅ Status: Active
   - **Has profiles**: ✅ Yes

2. **Dr. Priya Sharma**
   - 📱 Phone: `+919876543211`
   - 📧 Email: priya.sharma@healthbridge.com
   - 🆔 User ID: `5f62a206-3641-4679-b7c9-507a45e57bb3`
   - ✅ Status: Active
   - **Has profiles**: ✅ Yes

### 👤 **PATIENTS**

3. **Rajesh Kumar**
   - 📱 Phone: `+919876543220`
   - 📧 Email: rajesh.kumar@example.com
   - 🆔 User ID: `95a9789f-8398-4552-b5ba-c2477b734f54`
   - ✅ Status: Active
   - **Has profiles**: ✅ Yes

4. **Anita Patel**
   - 📱 Phone: `+919876543221`
   - 📧 Email: anita.patel@example.com
   - 🆔 User ID: `dff91f89-e4ef-44a3-96a5-4c44efa6702e`
   - ✅ Status: Active
   - **Has profiles**: ✅ Yes

---

## 🚀 How to Login in the App

### Method 1: Quick Patient Login

1. Open the app
2. In the phone number field, enter: `+919876543220` (Rajesh) or `+919876543221` (Anita)
3. Tap "Login"
4. ✅ You'll be logged in as a PATIENT

### Method 2: Doctor Login

For doctors, you need to specify they're a doctor (backend expects role):

1. Open the app
2. Enter phone: `+919876543210` (Dr. David) or `+919876543211` (Dr. Priya)
3. Tap "Login"
4. ✅ You'll be logged in as a DOCTOR

**Note**: I've updated the authService to automatically handle the role parameter!

---

## 🧪 Test Login from Terminal (Backend)

### Test Patient Login:
```bash
curl -X POST https://healthbridgeai.duckdns.org/api/auth/phone/direct-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+919876543220",
    "role": "PATIENT"
  }'
```

### Test Doctor Login:
```bash
curl -X POST https://healthbridgeai.duckdns.org/api/auth/phone/direct-login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+919876543210",
    "role": "DOCTOR"
  }'
```

---

## ✅ What I Fixed

**Issue**: Frontend was not sending the `role` parameter to the backend

**Fix**: Updated `authService.ts`:
- Added `role` parameter to `directPhoneLogin()` function
- Defaults to "PATIENT" if no role specified
- Backend now receives: `{phone_number: "...", role: "PATIENT"}`

**File Modified**: `/frontend/src/services/authService.ts`

---

## 🎯 Quick Test Steps

1. **Run the app**:
   ```bash
   cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend
   npm run android  # or npm run ios
   ```

2. **Try logging in as Patient**:
   - Phone: `+919876543220`
   - Should work instantly!

3. **Try logging in as Doctor**:
   - Phone: `+919876543210`
   - Should work instantly!

4. **Test Video Consultations**:
   - Login as patient
   - Tap "Video Consultations" on home screen
   - Schedule a consultation with a doctor
   - Wait until join window (15 min before)
   - Join and test!

---

## 🔒 Authentication Flow

```
User enters phone number
        ↓
Frontend calls: POST /api/auth/phone/direct-login
        ↓
Backend checks: Does user exist with this phone?
        ↓
Backend generates: JWT token (valid 15 minutes)
        ↓
Frontend saves: token + user_id + role in AsyncStorage
        ↓
User navigates to role-based app (PatientApp, DoctorApp, etc.)
```

---

## 📊 Database Summary

- **Total Users**: 4
- **Doctors**: 2 (both active with profiles)
- **Patients**: 2 (both active with profiles)
- **Labs**: 0
- **Pharmacies**: 0
- **Admins**: 0

---

## 🆘 Troubleshooting

### Issue: "Phone number not found"
**Solution**: Make sure you're typing the exact phone number with `+` and country code

### Issue: "Login failed"
**Solution**:
1. Check internet connection
2. Verify API is running: `curl https://healthbridgeai.duckdns.org/health`
3. Check backend logs: `ssh ubuntu@13.204.87.82 "sudo journalctl -u healthbridge -n 50"`

### Issue: Wrong role after login
**Solution**: The backend determines the role based on the user's account, not the request

---

## 📱 All Test Accounts at a Glance

| Name | Phone | Role | Purpose |
|------|-------|------|---------|
| Rajesh Kumar | +919876543220 | PATIENT | Test patient features |
| Anita Patel | +919876543221 | PATIENT | Test patient features |
| Dr. David Mays | +919876543210 | DOCTOR | Test doctor features |
| Dr. Priya Sharma | +919876543211 | DOCTOR | Test doctor features |

---

## ✨ Ready to Test!

Login is now fixed and working! Try it out:

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend
npm run android
```

Login with: `+919876543220` (Patient) or `+919876543210` (Doctor)

Enjoy! 🎉

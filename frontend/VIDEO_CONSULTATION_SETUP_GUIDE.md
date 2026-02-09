# Video Consultation Setup Guide

## 📋 Overview
This guide will help you set up the complete video consultation feature for HealthbridgeAI, including:
- Agora RTC configuration
- Backend integration
- Frontend screens
- Testing the complete flow

---

## Step 1: Get Agora Credentials

### 1.1 Create Agora Account
1. Go to https://www.agora.io
2. Click "Sign Up" (top right corner)
3. Create your account with email
4. Verify your email address

### 1.2 Create a Project
1. Log in to Agora Console: https://console.agora.io
2. Click "Project Management" in left sidebar
3. Click "Create" button
4. Fill in project details:
   - **Project Name**: `HealthbridgeAI-VideoConsultations`
   - **Use Case**: Video Calling
   - **Authentication mechanism**: Select "Secured mode: APP ID + Token"
5. Click "Submit"

### 1.3 Get Your Credentials
After creating the project, you'll see:
- **App ID**: A 32-character string (looks like: `a1b2c3d4e5f6g7h8i9j0...`)
- **App Certificate**: Click the eye icon to reveal, or click "Enable" if not yet enabled

**Copy both values - you'll need them next!**

---

## Step 2: Configure Server

### 2.1 Add Credentials to .env File

SSH into your server and add the Agora credentials:

```bash
ssh -i ~/.ssh/aws-keys/healthbridge-key.pem ubuntu@13.204.87.82
sudo nano /var/www/healthbridge/backend/.env
```

Add these lines at the end:

```bash
# Agora Video Consultation
AGORA_APP_ID=your_app_id_here
AGORA_APP_CERTIFICATE=your_certificate_here
```

**Replace `your_app_id_here` and `your_certificate_here` with your actual credentials!**

Save and exit (Ctrl+X, then Y, then Enter)

### 2.2 Restart Backend Service

```bash
sudo systemctl restart healthbridge
sudo systemctl status healthbridge
```

Make sure it shows "active (running)" in green.

---

## Step 3: Update Frontend Navigation

### 3.1 Check your navigation structure

Look at your `App.tsx` or navigation configuration file to see where patient screens are registered.

### 3.2 Add Video Consultation Screens

In your navigation file (likely `App.tsx` or a navigation config), add these screens:

```typescript
import ScheduleVideoConsultationScreen from './src/screens/patient/ScheduleVideoConsultationScreen';
import MyVideoConsultationsScreen from './src/screens/patient/MyVideoConsultationsScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';

// Then in your Stack.Navigator, add:
<Stack.Screen
  name="ScheduleVideoConsultationScreen"
  component={ScheduleVideoConsultationScreen}
  options={{ title: 'Schedule Video Consultation' }}
/>
<Stack.Screen
  name="MyVideoConsultationsScreen"
  component={MyVideoConsultationsScreen}
  options={{ title: 'My Video Consultations' }}
/>
<Stack.Screen
  name="VideoCallScreen"
  component={VideoCallScreen}
  options={{ title: 'Video Call', headerShown: false }}
/>
```

### 3.3 Add Button to Patient Home Screen

In `/src/screens/patient/HomeScreen.tsx`, add a button to access video consultations:

```typescript
<TouchableOpacity
  style={styles.videoButton}
  onPress={() => navigation.navigate('MyVideoConsultationsScreen')}
>
  <Text style={styles.videoButtonIcon}>🎥</Text>
  <Text style={styles.videoButtonText}>Video Consultations</Text>
</TouchableOpacity>
```

Add corresponding styles:

```typescript
videoButton: {
  backgroundColor: '#4CAF50',
  padding: 16,
  borderRadius: 12,
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 8,
},
videoButtonIcon: {
  fontSize: 24,
  marginRight: 12,
},
videoButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '600',
},
```

---

## Step 4: Install Dependencies (If Needed)

The project already has `react-native-agora` installed, but if you need to reinstall:

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend
npm install
```

For iOS (if testing on iOS):
```bash
cd ios && pod install && cd ..
```

---

## Step 5: Test the Complete Flow

### 5.1 Schedule a Video Consultation (Patient)

1. **Run the app**:
   ```bash
   npm run android  # or npm run ios
   ```

2. **Login as a patient**
   - Use phone: `+919876543210` (or your test patient number)

3. **Navigate to Video Consultations**:
   - Tap "Video Consultations" button on home screen
   - Tap "+ Schedule New"

4. **Fill in consultation details**:
   - Select a doctor
   - Choose date (tomorrow or later)
   - Select time (e.g., 10:00 AM)
   - Duration: 30 minutes
   - Add notes: "Test video consultation"
   - Tap "Schedule Consultation"

5. **Verify**:
   - You should see the consultation in "My Video Consultations"
   - Status should show "SCHEDULED"
   - It should display the countdown time

### 5.2 Test Backend API (Optional)

Test the API directly using curl:

```bash
# Get doctor token
DOCTOR_TOKEN=$(curl -s -X POST https://healthbridgeai.duckdns.org/api/auth/phone/direct-login \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919876543210", "role": "DOCTOR"}' \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["access_token"])')

# Get consultations
curl -H "Authorization: Bearer $DOCTOR_TOKEN" \
  https://healthbridgeai.duckdns.org/api/video-consultations/my-consultations | jq .
```

### 5.3 Join Video Call

To test joining a call:

**Important**: You can only join 15 minutes before the scheduled time!

1. **Wait until 15 minutes before scheduled time**
   - The app will show "🎥 Join Call" button when it's time

2. **Join as Patient**:
   - Tap "Join Call" button
   - Allow camera and microphone permissions
   - Wait in call

3. **Join as Doctor** (on another device or browser):
   - Login as doctor with phone: `+919876543210`
   - Go to doctor dashboard
   - Find the scheduled consultation
   - Tap "Join Call"

4. **Test video features**:
   - ✅ Both should see each other's video
   - ✅ Test mute/unmute audio
   - ✅ Test stop/start video
   - ✅ Test flip camera
   - ✅ Test speaker on/off
   - ✅ Check call duration counter
   - ✅ End call (either participant can end)

### 5.4 After Call - Check Summary

1. After ending the call:
   - Status changes to "COMPLETED"
   - Call gets recorded (if recording is set up)
   - Transcription happens automatically
   - AI generates consultation summary

2. **View Summary**:
   - Tap "View Summary" on completed consultation
   - Should show encounter details with AI-generated summary

---

## Step 6: Troubleshooting

### Issue: "Failed to join video call"
**Solution**:
- Check that AGORA_APP_ID and AGORA_APP_CERTIFICATE are correctly set in server `.env`
- Restart backend: `sudo systemctl restart healthbridge`
- Verify Agora project is in "Secured mode"

### Issue: "Cannot join more than 15 minutes before"
**Solution**:
- This is by design for user experience
- Schedule a consultation for a time closer to now for testing
- Or modify `canJoinNow()` function in MyVideoConsultationsScreen.tsx to allow earlier joins for testing

### Issue: Camera/Microphone permissions denied
**Solution**:
- **Android**: Go to Settings → Apps → HealthbridgeAI → Permissions → Enable Camera and Microphone
- **iOS**: Go to Settings → HealthbridgeAI → Enable Camera and Microphone

### Issue: Black screen during video call
**Solution**:
- Check that camera permissions are granted
- Try toggling video on/off
- Switch camera (front/back)
- Restart the app

### Issue: Cannot see remote participant
**Solution**:
- Ensure both participants have joined the call
- Check internet connection on both devices
- Wait a few seconds - sometimes there's a delay in video stream

### Issue: Nginx auth header issue (on server)
**Current Workaround**:
- The backend API works perfectly when accessed directly
- If using web version, you may need to connect directly to backend port 8000
- Or continue troubleshooting Nginx configuration

---

## Step 7: Production Checklist

Before going live:

- [ ] **Agora Account**: Upgrade from free tier if needed
- [ ] **Recording**: Set up Agora Cloud Recording or client-side recording
- [ ] **Transcription**: Integrate Google Speech-to-Text or OpenAI Whisper API
- [ ] **Notifications**: Add push notifications for upcoming consultations
- [ ] **Calendar**: Add calendar integration (Google Calendar, Apple Calendar)
- [ ] **Payment**: Add payment integration if consultations are paid
- [ ] **Data Privacy**: Ensure HIPAA compliance for recordings
- [ ] **Testing**: Test on multiple devices and network conditions
- [ ] **Analytics**: Set up Agora analytics dashboard
- [ ] **Support**: Prepare customer support for video call issues

---

## Architecture Summary

```
Patient App                    Backend API                  Agora Cloud
    |                              |                              |
    |--1. Schedule Consultation--->|                              |
    |<--Returns consultation_id----|                              |
    |                              |                              |
    |--2. Join Call (15 min before)|                              |
    |                              |--3. Generate Token---------->|
    |                              |<--Returns Agora Token--------|
    |<--4. Returns credentials-----|                              |
    |                              |                              |
    |-----5. Connect to Agora RTC----------------------------->|
    |<----6. Video/Audio Stream--------------------------------|
    |                              |                              |
Doctor App                         |                              |
    |--7. Join Same Channel------->|--8. Generate Token---------->|
    |<--Returns credentials--------|<--Returns Agora Token--------|
    |-----9. Connect to Agora RTC----------------------------->|
    |<----10. Video/Audio Stream-------------------------------|
    |                              |                              |
    |--11. End Call--------------->|                              |
    |                              |--12. Update status---------->|
    |                              |--13. Process Recording------>|
    |                              |--14. Transcribe------------->|
    |                              |--15. Generate AI Summary---->|
```

---

## Support

If you encounter issues:
1. Check backend logs: `ssh ubuntu@13.204.87.82 "sudo journalctl -u healthbridge -f"`
2. Check Agora console: https://console.agora.io
3. Review API documentation: https://healthbridgeai.duckdns.org/docs

---

## Next Steps

After basic setup works:
1. Add doctor-specific screens for managing consultations
2. Implement recording upload to S3 or cloud storage
3. Add real-time transcription service
4. Enhance AI summary generation
5. Add consultation history and analytics
6. Implement prescription writing during video calls

Good luck! 🚀

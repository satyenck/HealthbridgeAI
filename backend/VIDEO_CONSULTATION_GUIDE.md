# Video Consultation Feature - Complete Guide

## Overview
The video consultation feature allows patients to schedule and conduct video calls with doctors. The system handles:
- Appointment scheduling
- Video call setup with Agora
- Call recording
- Automatic transcription
- AI-generated summary reports

## Architecture

```
Patient Schedules → Creates Encounter → Generates Agora Channel
                                                ↓
                            Both Get Join Links with Tokens
                                                ↓
                              Video Call (Agora RTC)
                                                ↓
                            Recording + Transcription
                                                ↓
                            AI Summary Report (Gemini)
```

## Database Schema

### VideoConsultation Model
- **consultation_id**: UUID primary key
- **encounter_id**: Links to encounter
- **scheduled_start_time**: When call is scheduled
- **duration_minutes**: Expected call length
- **status**: SCHEDULED → WAITING → IN_PROGRESS → COMPLETED
- **channel_name**: Unique Agora channel
- **recording_url**: Link to recorded video
- **transcription_text**: Call transcription
- **patient_notes**: Why patient requested consultation

## API Endpoints

### 1. Schedule Consultation (Patient)

**POST /api/video-consultations/**

```json
{
  "doctor_id": "uuid-of-doctor",
  "scheduled_start_time": "2026-02-10T10:00:00Z",
  "duration_minutes": 30,
  "patient_notes": "Need to discuss test results"
}
```

**Response:**
```json
{
  "consultation_id": "abc-123",
  "encounter_id": "def-456",
  "scheduled_start_time": "2026-02-10T10:00:00Z",
  "status": "SCHEDULED",
  "channel_name": "vc_abc123def456",
  ...
}
```

### 2. Get My Consultations

**GET /api/video-consultations/my-consultations**

Query Parameters:
- `status_filter`: Filter by status (optional)
- `upcoming_only`: true/false (optional)
- `limit`: Max results (default: 50)

**Response:**
```json
[
  {
    "consultation_id": "abc-123",
    "scheduled_start_time": "2026-02-10T10:00:00Z",
    "duration_minutes": 30,
    "status": "SCHEDULED",
    "doctor_name": "Dr. John Smith",
    ...
  }
]
```

### 3. Get Consultation Details

**GET /api/video-consultations/{consultation_id}**

Returns full consultation details including recording URL, transcription status, etc.

### 4. Join Video Call

**POST /api/video-consultations/{consultation_id}/join**

```json
{
  "user_type": "patient"  // or "doctor"
}
```

**Response:**
```json
{
  "app_id": "agora-app-id",
  "channel_name": "vc_abc123",
  "token": "temporary-agora-token",
  "uid": 12345678,
  "consultation_id": "abc-123",
  "call_url": "/video-call/abc-123"
}
```

**Important:**
- Can join 15 minutes before scheduled time
- Token valid for 1 hour
- Both patient and doctor get same channel_name

### 5. End Video Call

**POST /api/video-consultations/{consultation_id}/end**

Marks consultation as COMPLETED and stops recording.

**Response:**
```json
{
  "message": "Video call ended successfully",
  "consultation_id": "abc-123",
  "duration_seconds": 1847,
  "status": "COMPLETED"
}
```

### 6. Process Recording (Doctor Only)

**POST /api/video-consultations/{consultation_id}/process-recording**

```json
{
  "recording_url": "https://agora-recording-storage.com/abc123.mp4"
}
```

This triggers:
1. Audio transcription
2. AI summary generation
3. Creates SummaryReport for review

### 7. Cancel Consultation

**POST /api/video-consultations/{consultation_id}/cancel**

```json
{
  "cancellation_reason": "Patient not available at scheduled time"
}
```

### 8. Get Statistics (Doctor)

**GET /api/video-consultations/stats/my-stats**

```json
{
  "total_scheduled": 45,
  "total_completed": 38,
  "total_cancelled": 5,
  "total_no_show": 2,
  "upcoming_count": 7,
  "average_duration_minutes": 28.5
}
```

## Status Flow

```
SCHEDULED
   ↓ (Patient/Doctor clicks join 15 min before)
WAITING
   ↓ (Both joined)
IN_PROGRESS
   ↓ (Either clicks end call)
COMPLETED
```

Alternative paths:
- SCHEDULED → CANCELLED (cancelled by patient/doctor)
- WAITING → NO_SHOW (if no one joins within time window)

## Frontend Integration

### Patient Flow

1. **Browse Doctors**
   ```
   GET /api/doctor/search
   ```

2. **Schedule Consultation**
   ```
   POST /api/video-consultations/
   ```

3. **View Upcoming Consultations**
   ```
   GET /api/video-consultations/my-consultations?upcoming_only=true
   ```

4. **Join Call (15 min before)**
   ```
   POST /api/video-consultations/{id}/join
   ```

5. **Initialize Agora Client**
   ```javascript
   import AgoraRTC from "agora-rtc-sdk-ng";

   const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

   await client.join(
     credentials.app_id,
     credentials.channel_name,
     credentials.token,
     credentials.uid
   );

   // Publish local audio/video
   const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
   const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
   await client.publish([localAudioTrack, localVideoTrack]);
   ```

6. **End Call**
   ```
   POST /api/video-consultations/{id}/end
   ```

### Doctor Flow

1. **View Scheduled Consultations**
   ```
   GET /api/video-consultations/my-consultations?status_filter=SCHEDULED
   ```

2. **Join Call**
   Same as patient flow

3. **After Call - Process Recording**
   ```
   POST /api/video-consultations/{id}/process-recording
   ```

4. **Review AI-Generated Summary**
   ```
   GET /api/encounters/{encounter_id}/summary
   ```

5. **Edit & Approve Summary**
   ```
   PUT /api/encounters/{encounter_id}/summary
   ```

## Agora Integration

### Setup

1. **Get Agora Credentials**
   - Sign up at https://www.agora.io
   - Create project
   - Get App ID and App Certificate

2. **Configure in .env**
   ```bash
   AGORA_APP_ID=your-app-id-here
   AGORA_APP_CERTIFICATE=your-certificate-here
   ```

3. **Install Agora SDK (Frontend)**
   ```bash
   npm install agora-rtc-sdk-ng
   ```

### Recording Options

**Option 1: Client-Side Recording** (Simpler)
- Frontend records locally
- Uploads to backend after call
- No Agora cloud recording needed

**Option 2: Agora Cloud Recording** (Production)
- Automatic server-side recording
- Better reliability
- Requires Agora Cloud Recording API
- See: https://docs.agora.io/en/cloud-recording

## Transcription & Summary

### Current Implementation
- Placeholder transcription
- Gemini AI generates summary from transcription
- Creates SummaryReport with PENDING_REVIEW status

### Production Implementation

1. **Audio Transcription**
   - Use Google Speech-to-Text API
   - Or OpenAI Whisper API
   - Process recorded audio file

2. **Summary Generation**
   - Already implemented with Gemini
   - Extracts: symptoms, diagnosis, treatment, next steps

3. **Doctor Review**
   - Doctor reviews and edits AI summary
   - Approves for patient viewing

## Security & HIPAA Compliance

✅ **Audit Logging**: All consultations logged
✅ **Encrypted Channels**: Agora uses TLS encryption
✅ **Time-Limited Tokens**: 1-hour validity
✅ **Recording Encryption**: Store recordings encrypted
✅ **Access Control**: Only patient & assigned doctor can join

## Testing

### 1. Schedule a Consultation

```bash
# Login as patient
TOKEN=$(curl -s -X POST https://healthbridgeai.duckdns.org/api/auth/phone/verify \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+919876543210", "verification_code": "123456"}' \
  | jq -r '.access_token')

# Get a doctor ID
DOCTOR_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  https://healthbridgeai.duckdns.org/api/encounters/available-doctors \
  | jq -r '.[0].doctor_id')

# Schedule consultation for tomorrow at 10 AM
curl -X POST https://healthbridgeai.duckdns.org/api/video-consultations/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"doctor_id\": \"$DOCTOR_ID\",
    \"scheduled_start_time\": \"$(date -u -d '+1 day 10:00' +%Y-%m-%dT%H:%M:%SZ)\",
    \"duration_minutes\": 30,
    \"patient_notes\": \"Need to discuss test results\"
  }"
```

### 2. View Consultations

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://healthbridgeai.duckdns.org/api/video-consultations/my-consultations
```

### 3. Join Call (15 min before scheduled time)

```bash
CONSULTATION_ID="your-consultation-id"

curl -X POST https://healthbridgeai.duckdns.org/api/video-consultations/$CONSULTATION_ID/join \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_type": "patient"}'
```

## Production Checklist

- [ ] Configure Agora credentials
- [ ] Set up Agora Cloud Recording (optional)
- [ ] Implement real audio transcription service
- [ ] Test video calls end-to-end
- [ ] Configure S3/storage for recordings
- [ ] Set up notification system (email/SMS for scheduled calls)
- [ ] Add calendar integration
- [ ] Implement waiting room UI
- [ ] Add call quality monitoring
- [ ] Set up billing/payment (if applicable)

## Troubleshooting

### "Cannot join more than 15 minutes before"
- This is intentional to prevent long waiting times
- Patients can join 15 minutes before scheduled time

### "Doctor has another consultation at this time"
- The system prevents double-booking
- Choose a different time slot

### "Token expired"
- Tokens are valid for 1 hour
- Call the /join endpoint again to get new token

### Recording not available
- Client-side recording: Check if frontend uploaded
- Cloud recording: Verify Agora recording is configured

## Future Enhancements

1. **Waiting Room**: Virtual waiting room before doctor joins
2. **Screen Sharing**: Share medical images/reports during call
3. **Chat**: Text chat alongside video
4. **Recording Controls**: Pause/resume recording
5. **Multiple Participants**: Group consultations
6. **Calendar Sync**: Sync with Google Calendar/Outlook
7. **Reminders**: SMS/Email reminders before consultation
8. **Prescription During Call**: Doctor can write prescriptions during video call

## Support

For issues or questions:
- Check logs: `sudo journalctl -u healthbridge -f`
- Agora documentation: https://docs.agora.io
- Backend API docs: https://healthbridgeai.duckdns.org/docs

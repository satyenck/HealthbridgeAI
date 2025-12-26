# HealthbridgeAI - Complete Setup Guide

This guide will walk you through setting up HealthbridgeAI from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Running the Application](#running-the-application)
5. [Optional Configurations](#optional-configurations)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Python 3.9+**: [Download here](https://www.python.org/downloads/)
- **Node.js 20+**: [Download here](https://nodejs.org/)
- **PostgreSQL 12+**: [Download here](https://www.postgresql.org/download/)
- **Git**: [Download here](https://git-scm.com/)

### Required Accounts

- **OpenAI Account**: [Sign up here](https://platform.openai.com/)
  - You'll need an API key with access to GPT-4o and Whisper models

### Optional Accounts (for full functionality)

- **Google Cloud Console**: For Google OAuth
- **Twilio Account**: For SMS verification

### Development Tools

For iOS development (macOS only):
- **Xcode**: Install from App Store
- **CocoaPods**: Install via `sudo gem install cocoapods`

For Android development:
- **Android Studio**: [Download here](https://developer.android.com/studio)
- **Java Development Kit (JDK) 11+**

## Backend Setup

### Step 1: Clone and Navigate

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### Step 3: Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Setup PostgreSQL Database

```bash
# Create database
createdb healthbridge_db

# Verify database was created
psql -l | grep healthbridge
```

If `createdb` command is not found, use psql:
```bash
psql postgres
CREATE DATABASE healthbridge_db;
\q
```

### Step 5: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` file with your credentials:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/healthbridge_db

# Security - Generate a strong secret key
SECRET_KEY=your-very-secure-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI - REQUIRED
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google OAuth - OPTIONAL (can skip for initial testing)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twilio - OPTIONAL (can skip for initial testing)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# App Settings
APP_NAME=HealthbridgeAI
DEBUG=True
```

### Step 6: Generate Secret Key

To generate a secure SECRET_KEY:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and use it as your SECRET_KEY in the `.env` file.

### Step 7: Initialize Database Tables

The database tables will be created automatically when you first run the application. FastAPI will use SQLAlchemy to create all necessary tables based on the models.

### Step 8: Start Backend Server

```bash
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Step 9: Verify Backend

Visit these URLs in your browser:
- API Root: http://localhost:8000/
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

## Frontend Setup

### Step 1: Navigate to Frontend

Open a new terminal window:

```bash
cd /Users/satyenkansara/Projects/HealthbridgeAI/frontend
```

### Step 2: Install Node Dependencies

```bash
npm install
```

### Step 3: iOS Setup (macOS only)

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

If you encounter CocoaPods issues:
```bash
cd ios
pod deintegrate
rm Podfile.lock
bundle exec pod install
cd ..
```

### Step 4: Configure API Endpoint

The API endpoint is already configured in `src/config/api.ts` to use:
- `http://localhost:8000` for iOS simulator (development)
- Update this for Android emulator or physical devices

For Android emulator, update `src/config/api.ts`:
```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://10.0.2.2:8000'  // Android emulator
    : 'https://your-production-api.com',
  TIMEOUT: 30000,
};
```

For physical devices, use your computer's IP address:
```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://192.168.1.XXX:8000'  // Replace with your IP
    : 'https://your-production-api.com',
  TIMEOUT: 30000,
};
```

To find your IP address:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

## Running the Application

### Start Metro Bundler

In the frontend directory:
```bash
npm start
```

### Run on iOS (macOS only)

In a new terminal:
```bash
npm run ios
```

Or specify a simulator:
```bash
npm run ios -- --simulator="iPhone 15 Pro"
```

### Run on Android

Make sure you have:
1. Android Studio installed
2. An Android emulator running OR a physical device connected

Then run:
```bash
npm run android
```

## Testing the Application

### 1. Test Phone Authentication

Since Twilio is optional, phone authentication works in development mode:

1. On login screen, enter a phone number (e.g., +1234567890)
2. Click "Send Verification Code"
3. Check the backend terminal - you'll see the verification code printed
4. Enter the code in the app
5. Click "Verify & Login"

### 2. Create Profile

1. Fill in profile information
2. Voice input buttons show placeholders (need additional setup)
3. Submit profile

### 3. Create Consultation

1. Click "Need Medical Consultation?"
2. Describe symptoms (e.g., "I have a headache and fever")
3. Click "Generate Consultation Report"
4. View AI-generated analysis

## Optional Configurations

### Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add credentials to backend `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. Install Google Sign-In in frontend:
   ```bash
   cd frontend
   npm install @react-native-google-signin/google-signin
   ```
7. Configure the package following [official docs](https://github.com/react-native-google-signin/google-signin)

### Setup Twilio SMS

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get a phone number
3. Copy Account SID and Auth Token
4. Add to backend `.env`:
   ```
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Setup Voice Recording

1. Install package:
   ```bash
   cd frontend
   npm install react-native-audio-recorder-player
   ```

2. Add iOS permissions in `ios/HealthbridgeAI/Info.plist`:
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>We need access to your microphone to record health symptoms</string>
   ```

3. Add Android permissions in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```

4. Rebuild the app

## Troubleshooting

### Backend Issues

**Error: "could not connect to server"**
- Make sure PostgreSQL is running:
  ```bash
  # macOS
  brew services start postgresql@14

  # Linux
  sudo service postgresql start

  # Windows
  # Start PostgreSQL from Services
  ```

**Error: "database does not exist"**
```bash
createdb healthbridge_db
```

**Error: "MODULE_NOT_FOUND: No module named 'app'"**
```bash
# Make sure you're in the backend directory
cd backend
# And virtual environment is activated
source venv/bin/activate
```

### Frontend Issues

**Metro Bundler Cache Issues**
```bash
npm start -- --reset-cache
```

**iOS Build Fails**
```bash
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
```

**Android Build Fails**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Cannot Connect to Backend**
- Make sure backend is running on port 8000
- Check firewall settings
- For physical devices, ensure both device and computer are on same network
- Update API_CONFIG.BASE_URL with correct IP address

### Common Issues

**"OpenAI API key not found"**
- Make sure `.env` file exists in backend directory
- Check that OPENAI_API_KEY is set correctly
- Restart the backend server after updating .env

**"CORS Error"**
- Backend CORS is configured to allow all origins in development
- For production, update CORS settings in `backend/app/main.py`

**"Phone verification code not working"**
- Without Twilio setup, check backend terminal for the code
- Code is printed in development mode
- Make sure you're entering the exact 6-digit code

## Next Steps

1. Test all features thoroughly
2. Set up Google OAuth for production
3. Set up Twilio for SMS verification
4. Implement voice recording features
5. Add proper error handling and logging
6. Set up monitoring and analytics
7. Prepare for production deployment

## Production Deployment

Before deploying to production:

1. Set `DEBUG=False` in backend `.env`
2. Use a strong, unique `SECRET_KEY`
3. Configure proper CORS origins
4. Set up HTTPS/SSL certificates
5. Use a production-grade database (managed PostgreSQL)
6. Set up environment variables in hosting platform
7. Enable rate limiting
8. Implement proper logging
9. Set up backups
10. Review security best practices

## Support

For issues and questions:
- Check the main README.md
- Review API documentation at http://localhost:8000/docs
- Check backend logs for errors
- Check Metro bundler terminal for frontend errors

## Security Notes

- Never commit `.env` files
- Never share API keys publicly
- Follow HIPAA compliance for real patient data
- Implement proper authentication in production
- Use HTTPS in production
- Regularly update dependencies
- Implement rate limiting
- Add input validation
- Sanitize user inputs

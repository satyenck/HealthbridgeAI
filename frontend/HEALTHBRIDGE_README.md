# HealthbridgeAI Frontend

React Native mobile application for HealthbridgeAI.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. iOS Setup (macOS only):
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

3. Run the app:

   iOS:
   ```bash
   npm run ios
   ```

   Android:
   ```bash
   npm run android
   ```

## Configuration

Update API endpoint in `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://your-api-url:8000',
  TIMEOUT: 30000,
};
```

For local development:
- iOS Simulator: `http://localhost:8000`
- Android Emulator: `http://10.0.2.2:8000`
- Physical Device: Use your computer's IP address

## Project Structure

```
src/
├── config/           # API configuration
├── navigation/       # React Navigation setup
├── screens/          # App screens
│   ├── LoginScreen
│   ├── ProfileCreateScreen
│   ├── HomeScreen
│   ├── NewConsultationScreen
│   └── ConsultationDetailScreen
└── services/         # API services
    ├── apiService
    ├── authService
    ├── profileService
    └── consultationService
```

## Screens

### LoginScreen
- Phone number authentication
- Google OAuth (requires setup)
- SMS verification code

### ProfileCreateScreen
- Create user profile
- Voice input support (requires setup)
- Manual form entry

### HomeScreen
- Welcome message
- Start new consultation
- View consultation history

### NewConsultationScreen
- Describe health symptoms
- Voice input support (requires setup)
- Submit for AI analysis

### ConsultationDetailScreen
- View AI-generated report
- Symptoms analysis
- Potential diagnosis
- Treatment recommendations
- Next steps

## Additional Setup

### Voice Recording

Install the audio recorder package:
```bash
npm install react-native-audio-recorder-player
```

Add permissions:

iOS (ios/HealthbridgeAI/Info.plist):
```xml
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record health symptoms</string>
```

Android (android/app/src/main/AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Google Sign-In

Install the package:
```bash
npm install @react-native-google-signin/google-signin
```

Configure with your Google OAuth credentials.

## Building for Production

iOS:
```bash
cd ios
xcodebuild -workspace HealthbridgeAI.xcworkspace -scheme HealthbridgeAI -configuration Release
```

Android:
```bash
cd android
./gradlew assembleRelease
```

## Troubleshooting

### Metro Bundler Issues
```bash
npm start -- --reset-cache
```

### Pod Install Issues (iOS)
```bash
cd ios
pod deintegrate
pod install
```

### Android Build Issues
```bash
cd android
./gradlew clean
cd ..
```

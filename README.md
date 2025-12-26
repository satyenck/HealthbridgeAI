# HealthbridgeAI

HealthbridgeAI is an AI-powered healthcare consultation application that eliminates the need for manual note-taking by doctors and generates potential diagnosis, treatments, and next steps based on patient symptoms.

## Features

- **User Authentication**: Login with Google OAuth or phone number verification
- **User Profile Management**: Create and manage health profiles with voice or text input
- **AI-Powered Consultations**: Describe symptoms and get AI-generated health insights
- **Consultation History**: View all past consultations chronologically
- **Voice Input**: Support for voice-to-text using OpenAI Whisper API
- **Smart Analysis**: GPT-4o powered analysis providing:
  - Symptom extraction
  - Potential diagnoses
  - Treatment recommendations
  - Next steps guidance

## Technology Stack

### Backend
- **FastAPI** (Python) - Modern, fast web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM for database operations
- **OpenAI API** - GPT-4o for consultation reports, Whisper for voice transcription
- **JWT** - Authentication and authorization
- **Twilio** - Phone number verification (optional)
- **Google OAuth** - Social authentication

### Frontend
- **React Native** - Cross-platform mobile application
- **React Navigation** - Navigation management
- **Axios** - HTTP client
- **AsyncStorage** - Local data persistence

## Project Structure

```
HealthbridgeAI/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   │   ├── auth_router.py
│   │   │   ├── profile_router.py
│   │   │   └── consultation_router.py
│   │   ├── services/         # Business logic
│   │   │   ├── google_auth.py
│   │   │   ├── phone_auth.py
│   │   │   └── openai_service.py
│   │   ├── models.py         # Database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # Database configuration
│   │   ├── auth.py           # Authentication utilities
│   │   ├── config.py         # App configuration
│   │   └── main.py           # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
│
└── frontend/
    ├── src/
    │   ├── config/           # API configuration
    │   ├── navigation/       # Navigation setup
    │   ├── screens/          # UI screens
    │   │   ├── LoginScreen.tsx
    │   │   ├── ProfileCreateScreen.tsx
    │   │   ├── HomeScreen.tsx
    │   │   ├── NewConsultationScreen.tsx
    │   │   └── ConsultationDetailScreen.tsx
    │   └── services/         # API service layer
    │       ├── apiService.ts
    │       ├── authService.ts
    │       ├── profileService.ts
    │       └── consultationService.ts
    ├── App.tsx               # Main app component
    └── package.json          # Node dependencies
```

## Setup Instructions

### Prerequisites

- Python 3.9 or higher
- Node.js 20 or higher
- PostgreSQL 12 or higher
- OpenAI API key
- (Optional) Twilio account for phone verification
- (Optional) Google OAuth credentials

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create PostgreSQL database:
   ```bash
   createdb healthbridge_db
   ```

5. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

6. Edit `.env` file with your credentials:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/healthbridge_db
   SECRET_KEY=your-secret-key-change-this
   OPENAI_API_KEY=your-openai-api-key
   GOOGLE_CLIENT_ID=your-google-client-id (optional)
   GOOGLE_CLIENT_SECRET=your-google-client-secret (optional)
   TWILIO_ACCOUNT_SID=your-twilio-sid (optional)
   TWILIO_AUTH_TOKEN=your-twilio-token (optional)
   TWILIO_PHONE_NUMBER=your-twilio-phone (optional)
   ```

7. Run the application:
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

4. Update API endpoint in `src/config/api.ts` if needed

5. Run the application:

   For iOS:
   ```bash
   npm run ios
   ```

   For Android:
   ```bash
   npm run android
   ```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

**Authentication**
- `POST /api/auth/google` - Login with Google
- `POST /api/auth/phone/send-code` - Send verification code
- `POST /api/auth/phone/verify` - Verify phone and login

**Profile**
- `POST /api/profile` - Create user profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `POST /api/profile/transcribe-voice` - Transcribe voice to text
- `POST /api/profile/parse-voice-profile` - Parse profile from voice

**Consultations**
- `POST /api/consultations` - Create new consultation
- `GET /api/consultations` - Get all consultations
- `GET /api/consultations/{id}` - Get specific consultation
- `POST /api/consultations/transcribe-description` - Transcribe symptom description

## User Workflow

### 1. Account Creation
- User opens the app
- Chooses authentication method (Google or Phone)
- For phone: receives SMS verification code
- Logs in successfully

### 2. Profile Creation
- User creates profile with:
  - First Name
  - Last Name
  - Date of Birth
  - Gender
  - Health Condition (optional)
- Can use voice input or manual entry

### 3. Consultation
- User describes health issue via text or voice
- AI generates a comprehensive report with:
  - Extracted symptoms
  - Potential diagnoses
  - Treatment recommendations
  - Next steps
- Report is saved to consultation history

### 4. History
- View all past consultations
- Access detailed reports anytime

## Important Notes

### Medical Disclaimer

This application is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

### Security Considerations

- Never commit `.env` files to version control
- Use strong, unique SECRET_KEY in production
- Enable HTTPS in production
- Implement rate limiting for API endpoints
- Regularly update dependencies
- Follow HIPAA compliance if handling real patient data

### Voice Input Setup

The current implementation includes placeholders for voice recording. To enable full voice functionality:

1. Install audio recording package:
   ```bash
   npm install react-native-audio-recorder-player
   ```

2. Configure platform-specific permissions:
   - iOS: Add microphone permission to Info.plist
   - Android: Add RECORD_AUDIO permission to AndroidManifest.xml

### Google OAuth Setup

To enable Google authentication:

1. Create a project in Google Cloud Console
2. Enable Google Sign-In API
3. Create OAuth 2.0 credentials
4. Add credentials to backend `.env`
5. Install Google Sign-In package in frontend:
   ```bash
   npm install @react-native-google-signin/google-signin
   ```

## Development

### Running Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm test
```

### Code Formatting

Backend:
```bash
black app/
```

Frontend:
```bash
npm run lint
```

## Deployment

### Backend Deployment

Recommended platforms:
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run
- DigitalOcean App Platform

Remember to:
- Set environment variables
- Configure PostgreSQL database
- Enable HTTPS
- Set DEBUG=False

### Frontend Deployment

Build for production:

iOS:
```bash
npm run ios --configuration Release
```

Android:
```bash
cd android
./gradlew assembleRelease
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on GitHub.

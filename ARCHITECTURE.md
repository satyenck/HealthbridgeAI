# HealthbridgeAI - System Architecture

## Overview

HealthbridgeAI is a full-stack healthcare consultation application built with a modern, scalable architecture.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App Layer                          │
│                       (React Native)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Login   │  │ Profile  │  │   Home   │  │Consult   │       │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Screen  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ REST API (HTTP/HTTPS)
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                      API Gateway Layer                           │
│                         (FastAPI)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │   Auth   │  │ Profile  │  │Consult   │                      │
│  │  Router  │  │  Router  │  │  Router  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Service    │ │   Service    │ │   Service    │
│    Layer     │ │    Layer     │ │    Layer     │
│              │ │              │ │              │
│ Google Auth  │ │  Phone Auth  │ │   OpenAI     │
│              │ │   (Twilio)   │ │  (GPT-4o)    │
│              │ │              │ │  (Whisper)   │
└──────────────┘ └──────────────┘ └──────────────┘
        │
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                              │
│                      (PostgreSQL)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Users   │  │ Profiles │  │Consults  │                      │
│  │  Table   │  │  Table   │  │  Table   │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (React Native)
- **React Native 0.83.0**: Cross-platform mobile development
- **React Navigation 7.x**: Screen navigation
- **Axios**: HTTP client
- **AsyncStorage**: Local storage
- **TypeScript**: Type safety

### Backend (FastAPI)
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation
- **JWT**: Authentication tokens
- **Uvicorn**: ASGI server

### Database
- **PostgreSQL**: Relational database
- **Tables**: Users, UserProfiles, Consultations

### External Services
- **OpenAI GPT-4o**: Consultation report generation
- **OpenAI Whisper**: Voice-to-text transcription
- **Google OAuth**: Social authentication
- **Twilio**: SMS verification

## Data Flow

### 1. User Authentication Flow

```
User → Login Screen → Phone Number Input
                          ↓
            Send Code API (POST /api/auth/phone/send-code)
                          ↓
                    Twilio Service
                          ↓
                    SMS Verification Code
                          ↓
User Enters Code → Verify API (POST /api/auth/phone/verify)
                          ↓
                    Create/Find User in DB
                          ↓
                    Generate JWT Token
                          ↓
                    Return Token to App
                          ↓
                Store Token in AsyncStorage
```

### 2. Profile Creation Flow

```
User → Profile Form → Enter Details (or Voice)
                          ↓
         (Optional) Voice Recording → Base64 Encode
                          ↓
         POST /api/profile/parse-voice-profile
                          ↓
                    Whisper API
                          ↓
                    Extract Profile Data
                          ↓
            POST /api/profile (Create Profile)
                          ↓
                Save to UserProfiles Table
                          ↓
                Return Success to App
```

### 3. Consultation Flow

```
User → Describe Symptoms (Text or Voice)
                          ↓
         (Optional) Voice Recording → Base64 Encode
                          ↓
     POST /api/consultations/transcribe-description
                          ↓
                    Whisper API
                          ↓
                Get Text Description
                          ↓
        POST /api/consultations (Create Consultation)
                          ↓
                Fetch User Health History
                          ↓
                    GPT-4o API
                          ↓
            Generate 4-Section Report:
            - Symptoms
            - Potential Diagnosis
            - Potential Treatment
            - Next Steps
                          ↓
            Save to Consultations Table
                          ↓
            Return Report to App
                          ↓
            Display in ConsultationDetail Screen
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE,
    phone_number VARCHAR UNIQUE,
    auth_provider VARCHAR NOT NULL,
    google_id VARCHAR UNIQUE,
    hashed_password VARCHAR,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### UserProfiles Table
```sql
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR NOT NULL,
    health_condition TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

### Consultations Table
```sql
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    patient_description TEXT NOT NULL,
    symptoms TEXT,
    potential_diagnosis TEXT,
    potential_treatment TEXT,
    next_steps TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/phone/send-code` - Send SMS verification
- `POST /api/auth/phone/verify` - Verify code and login

### Profile Management
- `POST /api/profile` - Create profile
- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update profile
- `POST /api/profile/transcribe-voice` - Voice to text
- `POST /api/profile/parse-voice-profile` - Extract profile from voice

### Consultations
- `POST /api/consultations` - Create consultation
- `GET /api/consultations` - List all consultations
- `GET /api/consultations/{id}` - Get specific consultation
- `POST /api/consultations/transcribe-description` - Voice to text

## Security Architecture

### Authentication & Authorization
- JWT tokens for session management
- Token stored in AsyncStorage (frontend)
- Bearer token authentication
- Token expiry: 30 minutes (configurable)

### Password Security
- Bcrypt hashing for passwords
- Salt rounds: Default bcrypt settings

### API Security
- CORS enabled (configure for production)
- Request validation with Pydantic
- SQL injection prevention via ORM
- Input sanitization

### Data Privacy
- Health data encrypted at rest (database level)
- HTTPS required in production
- No logging of sensitive data
- HIPAA compliance considerations

## Scalability Considerations

### Current Architecture
- Monolithic backend (FastAPI)
- Single database instance
- Synchronous request handling

### Future Scalability
1. **Horizontal Scaling**
   - Load balancer for multiple API instances
   - Database read replicas
   - Redis for session management

2. **Microservices**
   - Separate auth service
   - Separate consultation service
   - API gateway

3. **Caching**
   - Redis for API responses
   - CDN for static assets

4. **Message Queues**
   - Async processing for AI requests
   - Background jobs for notifications

## Performance Optimization

### Backend
- Database indexing on frequently queried fields
- Connection pooling (SQLAlchemy)
- Response compression
- API response pagination

### Frontend
- React Native optimizations
- Image lazy loading
- API response caching
- AsyncStorage for offline capability

## Monitoring & Logging

### Recommended Tools
- **Logging**: Python logging module
- **Monitoring**: Sentry for error tracking
- **Performance**: New Relic or DataDog
- **Analytics**: Mixpanel or Amplitude

## Deployment Architecture

### Development
```
Local Machine
├── Backend: localhost:8000
├── PostgreSQL: localhost:5432
└── Mobile App: Simulator/Emulator
```

### Production
```
Cloud Infrastructure
├── API: Cloud Run / EC2 / App Service
├── Database: Managed PostgreSQL (RDS/Cloud SQL)
├── Load Balancer: Cloud Load Balancer
├── CDN: CloudFlare / CloudFront
└── Mobile Apps: App Store / Play Store
```

## API Request Flow

```
Mobile App Request
      ↓
[Check AsyncStorage for Token]
      ↓
Add Bearer Token to Headers
      ↓
HTTP Request to API
      ↓
[FastAPI Middleware]
      ↓
Verify JWT Token
      ↓
[Route Handler]
      ↓
Business Logic
      ↓
Database Query (if needed)
      ↓
External API Call (if needed)
      ↓
Response Validation (Pydantic)
      ↓
JSON Response
      ↓
Mobile App Receives & Processes
```

## Error Handling

### Backend
- HTTP status codes
- Detailed error messages
- Exception handling middleware
- Logging for debugging

### Frontend
- Try-catch blocks
- User-friendly error messages
- Retry logic for network failures
- Offline state handling

## Future Enhancements

1. **Real-time Features**
   - WebSocket support
   - Live chat with doctors

2. **AI Improvements**
   - Multi-modal AI (image analysis)
   - Personalized health recommendations
   - Predictive health analytics

3. **Integration**
   - EHR system integration
   - Wearable device data
   - Pharmacy integration
   - Telemedicine video calls

4. **Advanced Features**
   - Appointment scheduling
   - Prescription management
   - Health tracking dashboard
   - Family health profiles

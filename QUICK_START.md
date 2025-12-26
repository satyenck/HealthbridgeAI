# HealthbridgeAI - Quick Start Guide

Get up and running with HealthbridgeAI in under 10 minutes!

## Prerequisites Checklist

- [ ] Python 3.9+ installed
- [ ] Node.js 20+ installed
- [ ] PostgreSQL installed and running
- [ ] OpenAI API key (required)

## Backend Setup (5 minutes)

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create database
createdb healthbridge_db

# 5. Setup environment
cp .env.example .env

# 6. Edit .env and add your credentials:
# - DATABASE_URL (update with your PostgreSQL credentials)
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
# - OPENAI_API_KEY (your OpenAI API key)

# 7. Start server
uvicorn app.main:app --reload
```

Backend is now running at http://localhost:8000

## Frontend Setup (5 minutes)

Open a new terminal:

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. iOS Setup (macOS only)
cd ios
bundle install
bundle exec pod install
cd ..

# 4. Start Metro bundler
npm start
```

In another terminal:

```bash
# For iOS
npm run ios

# For Android
npm run android
```

## Test the App

1. **Login**
   - Enter phone: +1234567890
   - Click "Send Code"
   - Check backend terminal for code
   - Enter code and verify

2. **Create Profile**
   - Fill in your details
   - Submit

3. **Create Consultation**
   - Click "Need Medical Consultation?"
   - Describe symptoms: "I have a headache and mild fever"
   - Click "Generate Report"
   - View AI analysis

## Troubleshooting

**Backend won't start?**
```bash
# Check if PostgreSQL is running
psql -l

# Start PostgreSQL
brew services start postgresql@14  # macOS
```

**Frontend won't connect?**
- Ensure backend is running on port 8000
- Check API endpoint in `src/config/api.ts`

**Database error?**
```bash
createdb healthbridge_db
```

## Next Steps

- Read SETUP_GUIDE.md for detailed setup
- Configure Google OAuth (optional)
- Set up Twilio for SMS (optional)
- Add voice recording support (optional)

## Important Files

- `backend/.env` - Backend configuration
- `frontend/src/config/api.ts` - API endpoint
- Backend API docs: http://localhost:8000/docs

## Minimum Required .env Configuration

```env
DATABASE_URL=postgresql://username:password@localhost:5432/healthbridge_db
SECRET_KEY=generate-a-secure-random-key-here
OPENAI_API_KEY=sk-your-openai-api-key
APP_NAME=HealthbridgeAI
DEBUG=True
```

That's it! You're ready to go.

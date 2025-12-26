# HealthbridgeAI Backend

FastAPI-based backend for HealthbridgeAI healthcare consultation platform.

## Quick Start

1. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Setup database:
   ```bash
   createdb healthbridge_db
   ```

4. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. Run server:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

Visit http://localhost:8000/docs for interactive API documentation.

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique, Optional)
- phone_number (Unique, Optional)
- auth_provider (google/phone)
- google_id (Unique, Optional)
- is_active
- created_at
- updated_at

### User Profiles Table
- id (Primary Key)
- user_id (Foreign Key)
- first_name
- last_name
- date_of_birth
- gender
- health_condition
- created_at
- updated_at

### Consultations Table
- id (Primary Key)
- user_id (Foreign Key)
- patient_description
- symptoms
- potential_diagnosis
- potential_treatment
- next_steps
- created_at

## Environment Variables

Required:
- DATABASE_URL
- SECRET_KEY
- OPENAI_API_KEY

Optional:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

## Development

Run with auto-reload:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Database Migrations

To create a migration:
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

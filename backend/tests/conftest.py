import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient
from app.database import Base, get_db
from app.main import app
from app.models import User, UserProfile, AuthProvider, Gender, UserRole
from app.auth import create_access_token
from datetime import date

# Use in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override the database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override"""
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(
        email="testuser@example.com",
        auth_provider=AuthProvider.GOOGLE,
        google_id="test_google_id_123",
        is_active=1,
        role=UserRole.PATIENT
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_doctor(db_session):
    """Create a test doctor user"""
    doctor = User(
        email="doctor@example.com",
        auth_provider=AuthProvider.GOOGLE,
        google_id="doctor_google_id_456",
        is_active=1,
        role=UserRole.DOCTOR,
        license_number="DOC123456",
        specialization="General Medicine"
    )
    db_session.add(doctor)
    db_session.commit()
    db_session.refresh(doctor)
    return doctor


@pytest.fixture
def test_user_with_profile(db_session, test_user):
    """Create a test user with profile"""
    profile = UserProfile(
        user_id=test_user.id,
        first_name="John",
        last_name="Doe",
        date_of_birth=date(1990, 1, 1),
        gender=Gender.MALE,
        health_condition="No known conditions"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(test_user)
    return test_user


@pytest.fixture
def auth_token(test_user):
    """Create an authentication token for test user"""
    return create_access_token(data={"sub": str(test_user.id), "role": test_user.role.value})


@pytest.fixture
def auth_headers(auth_token):
    """Create authorization headers with test token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def doctor_token(test_doctor):
    """Create an authentication token for test doctor"""
    return create_access_token(data={"sub": str(test_doctor.id), "role": test_doctor.role.value})


@pytest.fixture
def doctor_auth_headers(doctor_token):
    """Create authorization headers with doctor token"""
    return {"Authorization": f"Bearer {doctor_token}"}

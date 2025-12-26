"""
Healthbridge AI Database Seeding Script
Seeds the database with realistic patient data and medical vitals
"""
import random
import uuid
from datetime import date, timedelta
from faker import Faker
import psycopg2
from psycopg2.extras import execute_values

# Initialize Faker
fake = Faker()

# Database Connection Details
DB_CONFIG = {
    "dbname": "healthbridge_db",
    "user": "satyenkansara",
    "password": "",  # Add password if needed
    "host": "localhost",
    "port": "5432"
}


def generate_vitals(age):
    """Generates realistic vitals based on age group."""
    if age <= 20:  # Pediatric/Young Adult
        return {
            "bp_sys": random.randint(100, 120),
            "bp_dia": random.randint(60, 80),
            "hr": random.randint(70, 100),
            "o2": random.randint(97, 100),
            "weight": round(random.uniform(30, 75), 1)
        }
    elif age <= 60:  # Adult
        return {
            "bp_sys": random.randint(110, 135),
            "bp_dia": random.randint(70, 85),
            "hr": random.randint(60, 85),
            "o2": random.randint(95, 99),
            "weight": round(random.uniform(55, 95), 1)
        }
    else:  # Elderly (61-95)
        return {
            "bp_sys": random.randint(120, 150),
            "bp_dia": random.randint(75, 95),
            "hr": random.randint(55, 80),
            "o2": random.randint(92, 98),
            "weight": round(random.uniform(50, 90), 1)
        }


def seed_db():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        print("🌱 Starting database seeding...")

        # 1. Seed 1 Admin
        cur.execute(
            "INSERT INTO users (email, role) VALUES (%s, 'ADMIN')",
            ("admin@healthbridge.ai",)
        )
        print("✓ Seeded 1 Admin")

        # 2. Seed 5 Pharmacies
        for _ in range(5):
            u_id = str(uuid.uuid4())  # Convert to string
            cur.execute(
                "INSERT INTO users (user_id, role) VALUES (%s::uuid, 'PHARMACY')",
                (u_id,)
            )
            cur.execute(
                """INSERT INTO pharmacy_profiles (user_id, business_name, email, phone, address)
                   VALUES (%s::uuid, %s, %s, %s, %s)""",
                (u_id, fake.company() + " Pharmacy", fake.email(), fake.phone_number(), fake.address())
            )
        print("✓ Seeded 5 Pharmacies")

        # 3. Seed 2 Labs
        for _ in range(2):
            u_id = str(uuid.uuid4())  # Convert to string
            cur.execute(
                "INSERT INTO users (user_id, role) VALUES (%s::uuid, 'LAB')",
                (u_id,)
            )
            cur.execute(
                """INSERT INTO lab_profiles (user_id, business_name, email, phone, address)
                   VALUES (%s::uuid, %s, %s, %s, %s)""",
                (u_id, fake.company() + " Diagnostics", fake.email(), fake.phone_number(), fake.address())
            )
        print("✓ Seeded 2 Labs")

        # 4. Seed 20 Doctors with specific specialties
        specs = (
            ['Internal Medicine'] * 5 +
            ['Pediatrician'] * 3 +
            ['Neurologist'] * 2 +
            ['Cardiologist'] * 2 +
            ['Dermatologist'] * 1 +
            ['Orthopaedic Surgeon'] * 2 +
            ['Psychologist'] * 2 +
            ['Psychiatrist'] * 1 +
            ['Cardio Surgeon'] * 1 +
            ['Radiologist'] * 1
        )

        for spec in specs:
            u_id = str(uuid.uuid4())  # Convert to string
            cur.execute(
                "INSERT INTO users (user_id, role) VALUES (%s::uuid, 'DOCTOR')",
                (u_id,)
            )
            cur.execute(
                """INSERT INTO doctor_profiles
                   (user_id, first_name, last_name, email, phone, address, specialty, hospital_name, degree, last_degree_year)
                   VALUES (%s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    u_id,
                    fake.first_name(),
                    fake.last_name(),
                    fake.email(),
                    fake.phone_number(),
                    fake.address(),
                    spec,
                    fake.city() + " Medical Center",
                    "MD",
                    random.randint(2005, 2020)
                )
            )
        print("✓ Seeded 20 Specialized Doctors")

        # 5. Seed 50 Patients (Age & Gender Balanced) + Vitals
        age_groups = [(1, 20), (21, 40), (41, 60), (61, 80), (81, 95)]

        for min_age, max_age in age_groups:
            for i in range(10):  # 10 per age group
                gender = 'Male' if i < 5 else 'Female'
                age = random.randint(min_age, max_age)
                dob = date.today() - timedelta(days=age * 365)

                u_id = str(uuid.uuid4())  # Convert to string

                # Create user
                cur.execute(
                    "INSERT INTO users (user_id, phone_number, role) VALUES (%s::uuid, %s, 'PATIENT')",
                    (u_id, fake.unique.phone_number())
                )

                # Create patient profile
                cur.execute(
                    """INSERT INTO patient_profiles
                       (user_id, first_name, last_name, date_of_birth, gender, general_health_issues)
                       VALUES (%s::uuid, %s, %s, %s, %s, %s)""",
                    (
                        u_id,
                        fake.first_name_male() if gender == 'Male' else fake.first_name_female(),
                        fake.last_name(),
                        dob,
                        gender,
                        random.choice([None, "Hypertension", "Diabetes Type 2", "Asthma", "None"])
                    )
                )

                # Seed Initial Vitals for the Patient's timeline
                v = generate_vitals(age)

                cur.execute(
                    """INSERT INTO encounters (encounter_id, patient_id, encounter_type, input_method)
                       VALUES (%s::uuid, %s::uuid, 'INITIAL_LOG', 'MANUAL') RETURNING encounter_id""",
                    (str(uuid.uuid4()), u_id)
                )
                enc_id = cur.fetchone()[0]

                cur.execute(
                    """INSERT INTO vitals_logs
                       (vital_id, encounter_id, blood_pressure_sys, blood_pressure_dia, heart_rate, oxygen_level, weight)
                       VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s)""",
                    (str(uuid.uuid4()), enc_id, v['bp_sys'], v['bp_dia'], v['hr'], v['o2'], v['weight'])
                )

        print("✓ Seeded 50 Patients with Vitals")

        # Commit all changes
        conn.commit()
        print("\n✅ Database seeding completed successfully!")
        print("\nSummary:")
        print("  - 1 Admin")
        print("  - 5 Pharmacies")
        print("  - 2 Labs")
        print("  - 20 Doctors (with specialties)")
        print("  - 50 Patients (with vitals)")

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    # Check if required libraries are installed
    try:
        import faker
        import psycopg2
    except ImportError as e:
        print("❌ Missing required library. Please install:")
        print("   pip install faker psycopg2-binary")
        exit(1)

    seed_db()

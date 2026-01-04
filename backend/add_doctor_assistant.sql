-- Migration: Add Doctor's Assistant user type
-- Date: 2026-01-01
-- Description: Add DOCTOR_ASSISTANT user role, profiles, and associations with doctors

-- Step 1: Add DOCTOR_ASSISTANT to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DOCTOR_ASSISTANT';

-- Step 2: Create doctor_assistant_profiles table
CREATE TABLE IF NOT EXISTS doctor_assistant_profiles (
    user_id UUID PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR,
    phone VARCHAR NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Step 3: Create doctor_assistant_associations table (junction table)
-- Allows assistants to be associated with up to 5 doctors
CREATE TABLE IF NOT EXISTS doctor_assistant_associations (
    association_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assistant_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    hospital_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assistant_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(assistant_id, doctor_id)  -- Prevent duplicate associations
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctor_assistant_associations_assistant
    ON doctor_assistant_associations(assistant_id);
CREATE INDEX IF NOT EXISTS idx_doctor_assistant_associations_doctor
    ON doctor_assistant_associations(doctor_id);

-- Step 4: Find Dr. David Mayes
-- (We'll use this in the next step)

-- Step 5: Create sample doctor's assistant with phone 1234567890
-- First, create the user
INSERT INTO users (user_id, phone_number, role, is_active)
VALUES (
    uuid_generate_v4(),
    '1234567890',
    'DOCTOR_ASSISTANT',
    true
)
ON CONFLICT (phone_number) DO NOTHING;

-- Get the created user_id (or existing if conflict)
DO $$
DECLARE
    assistant_user_id UUID;
    david_mayes_user_id UUID;
BEGIN
    -- Get the assistant's user_id
    SELECT user_id INTO assistant_user_id
    FROM users
    WHERE phone_number = '1234567890';

    -- Get Dr. David Mayes' user_id
    SELECT user_id INTO david_mayes_user_id
    FROM doctor_profiles
    WHERE first_name = 'David' AND last_name = 'Mayes';

    -- Create the assistant profile
    IF assistant_user_id IS NOT NULL THEN
        INSERT INTO doctor_assistant_profiles (
            user_id,
            first_name,
            last_name,
            email,
            phone,
            address
        ) VALUES (
            assistant_user_id,
            'Sarah',
            'Johnson',
            'sarah.johnson@healthbridge.com',
            '1234567890',
            'HealthBridge Medical Center, San Francisco, CA'
        )
        ON CONFLICT (user_id) DO NOTHING;

        -- Associate with Dr. David Mayes if found
        IF david_mayes_user_id IS NOT NULL THEN
            INSERT INTO doctor_assistant_associations (
                association_id,
                assistant_id,
                doctor_id,
                hospital_name
            ) VALUES (
                uuid_generate_v4(),
                assistant_user_id,
                david_mayes_user_id,
                'HealthBridge Medical Center'
            )
            ON CONFLICT (assistant_id, doctor_id) DO NOTHING;

            RAISE NOTICE 'Doctor assistant Sarah Johnson created and associated with Dr. David Mayes';
        ELSE
            RAISE NOTICE 'Dr. David Mayes not found. Assistant created but not associated.';
        END IF;
    END IF;
END $$;

-- Add comments
COMMENT ON TABLE doctor_assistant_profiles IS 'Profiles for doctor assistants who help with data entry and follow-ups';
COMMENT ON TABLE doctor_assistant_associations IS 'Associates doctor assistants with doctors (max 5 doctors per assistant)';
COMMENT ON COLUMN doctor_assistant_associations.assistant_id IS 'User ID of the doctor assistant';
COMMENT ON COLUMN doctor_assistant_associations.doctor_id IS 'User ID of the associated doctor';
COMMENT ON COLUMN doctor_assistant_associations.hospital_name IS 'Hospital or clinic where the association is active';

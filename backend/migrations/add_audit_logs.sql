-- Migration: Add audit_logs table for HIPAA compliance
-- Date: 2026-02-03
-- Description: Creates audit_logs table to track all PHI access and modifications

-- Create AuditAction enum type
DO $$ BEGIN
    CREATE TYPE auditaction AS ENUM (
        'VIEW',
        'CREATE',
        'UPDATE',
        'DELETE',
        'EXPORT',
        'LOGIN',
        'LOGOUT',
        'ACCESS_DENIED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- What action was performed
    action auditaction NOT NULL,

    -- What resource was accessed/modified
    resource_type VARCHAR(100),
    resource_id UUID,

    -- Request metadata
    ip_address VARCHAR(45),  -- IPv4 or IPv6
    user_agent TEXT,

    -- Session tracking
    session_id VARCHAR(255),

    -- Additional context
    details JSONB,

    -- Timestamp (immutable)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_log_id ON audit_logs(log_id);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Add comment
COMMENT ON TABLE audit_logs IS 'HIPAA compliance: Tracks all access and modifications to PHI';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (VIEW, CREATE, UPDATE, DELETE, etc.)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource (PATIENT, ENCOUNTER, SUMMARY_REPORT, etc.)';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource accessed/modified';
COMMENT ON COLUMN audit_logs.details IS 'Additional context: endpoint, query params, changes made, etc.';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT ON audit_logs TO healthbridge_app;

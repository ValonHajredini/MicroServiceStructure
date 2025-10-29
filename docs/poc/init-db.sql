-- Initial database setup for POC phase

-- Create POC database (already created by POSTGRES_DB, but included for reference)
-- CREATE DATABASE poc_db;

-- Connect to poc_db
\c poc_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table (will be used by POC #1)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test tenants
INSERT INTO tenants (id, name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Tenant A'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant B')
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT 'Database setup complete!' as status;
SELECT * FROM tenants;

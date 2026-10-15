-- ==============================================================================
-- AuditEngine Database Schema
-- Production-grade PostgreSQL Schema for AI-Powered Auditing Web Application
-- ==============================================================================

-- Enable UUID extension if needed in future
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores registered platform users, authentication credentials, and system roles.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'superadmin', 'auditor', 'user'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATIONS TABLE
-- Workspace/tenant boundary. Users create and manage organizations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

-- ------------------------------------------------------------------------------
-- 3. ORGANIZATION MEMBERS TABLE
-- Multi-tenant association table with RBAC roles per organization.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_members (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'auditor', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- ------------------------------------------------------------------------------
-- 4. ORGANIZATION INVITATIONS TABLE
-- Pending / past member invitations via email tokens.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_invitations (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    token VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_email ON organization_invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON organization_invitations(status);

-- ------------------------------------------------------------------------------
-- 5. DOCUMENTS TABLE
-- Uploaded audit files (images, text, documents) scoped to an organization.
-- Pre-configured with vector indexing fields for Part 2 (RAG & Chroma DB).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'image', 'document', 'text'
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- 'uploaded', 'processing', 'audited', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Part 2: RAG & Chroma DB vector storage attributes
    chroma_collection_id VARCHAR(255),
    embedding_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'indexed', 'failed', 'not_applicable'
    chunk_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);

-- ------------------------------------------------------------------------------
-- 6. AUDIT REPORTS TABLE
-- Google Gemini AI Powered Audit Analysis Results
-- Stores summary, authenticity verdict, spam check, faults, security measures, and scores.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_reports (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    audited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    summary TEXT,
    authenticity_verdict VARCHAR(50), -- 'authentic', 'suspicious', 'fake', 'spam', 'undetermined'
    authenticity_score NUMERIC(5, 2), -- 0.00 to 100.00
    is_fake BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    faults JSONB DEFAULT '[]'::jsonb, -- array of { description, severity, category }
    security_measures JSONB DEFAULT '[]'::jsonb, -- array of { recommendation, priority }
    overall_score NUMERIC(5, 2), -- 0.00 to 100.00 audit health score
    risk_level VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
    model_used VARCHAR(100),
    raw_analysis JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_reports_document_id ON audit_reports(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_org_id ON audit_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_reports_status ON audit_reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_reports_risk_level ON audit_reports(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_reports_verdict ON audit_reports(authenticity_verdict);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATED UPDATED_AT TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orgs_updated_at ON organizations;
CREATE TRIGGER trg_orgs_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON organization_members;
CREATE TRIGGER trg_org_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_reports_updated_at ON audit_reports;
CREATE TRIGGER trg_audit_reports_updated_at
    BEFORE UPDATE ON audit_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

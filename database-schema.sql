CREATE EXTENSION IF NOT EXISTS vector;

-- users table
CREATE TABLE users (
id SERIAL PRIMARY KEY,
username VARCHAR(100) UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
email VARCHAR(255) UNIQUE,
role VARCHAR(50) DEFAULT 'user',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- chat_sessions table
CREATE TABLE chat_sessions (
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
session_title VARCHAR(255),
started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ended_at TIMESTAMP,
metadata JSONB
);

-- messages table
CREATE TABLE messages (
id SERIAL PRIMARY KEY,
session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
sender VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
content TEXT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
message_type VARCHAR(50) DEFAULT 'text',
sources JSONB
);

-- feedbacks table
CREATE TABLE feedbacks (
id SERIAL PRIMARY KEY,
message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
rating INTEGER CHECK (rating BETWEEN 1 AND 5),
comment TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- business_documents table
CREATE TABLE business_documents (
id SERIAL PRIMARY KEY,
title VARCHAR(255) NOT NULL,
content TEXT NOT NULL,
status VARCHAR(20) DEFAULT 'active', -- active / archived
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
tags TEXT[]
);

-- document_sections table
CREATE TABLE document_sections (
id SERIAL PRIMARY KEY,
document_id INTEGER REFERENCES business_documents(id) ON DELETE CASCADE,
section_title VARCHAR(255),
content TEXT NOT NULL,
embedding VECTOR(768), -- each section has its own embedding
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- retrieval_logs table
CREATE TABLE retrieval_logs (
id SERIAL PRIMARY KEY,
session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
user_question TEXT NOT NULL,
retrieved_section_ids INTEGER[], -- links to document_sections
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suggested indexes for optimization
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_document_sections_embedding ON document_sections USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_retrieval_logs_session_id ON retrieval_logs(session_id); 
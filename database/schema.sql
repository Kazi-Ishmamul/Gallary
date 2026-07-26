-- Create the database (Run this manually in psql or pgAdmin)
-- CREATE DATABASE gallery_db;

-- Connect to the database
-- \c gallery_db

-- Table for Folders
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(10) DEFAULT '📁',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Images
CREATE TABLE IF NOT EXISTS images (
    id VARCHAR(50) PRIMARY KEY, -- We'll use Cloudinary's public_id or a generated string as ID
    folder_id INT REFERENCES folders(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    public_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    size_bytes BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

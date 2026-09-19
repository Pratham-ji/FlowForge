-- 002_authentication.sql

ALTER TABLE users 
ADD COLUMN email TEXT UNIQUE,
ADD COLUMN password_hash TEXT;

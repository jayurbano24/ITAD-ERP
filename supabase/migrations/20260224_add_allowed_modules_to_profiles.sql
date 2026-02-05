ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_modules text[] DEFAULT NULL;

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS inline_buttons json;
INSERT INTO alembic_version (version_num) VALUES ('add_inline_buttons') ON CONFLICT (version_num) DO NOTHING;

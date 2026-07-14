ALTER TABLE broadcasts DROP COLUMN inline_buttons;
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('a1c3e5f7b9d1');

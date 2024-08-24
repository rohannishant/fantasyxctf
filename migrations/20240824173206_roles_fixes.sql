-- +goose Up
ALTER TABLE athletes ADD COLUMN sex char NOT NULL DEFAULT('?');
ALTER TABLE users ADD COLUMN user_role text;


ALTER TABLE races DROP CONSTRAINT races_finish_minutes_check;
ALTER TABLE races DROP CONSTRAINT races_finish_seconds_check;
ALTER TABLE races DROP CONSTRAINT races_previous_minutes_check;
ALTER TABLE races DROP CONSTRAINT races_previous_seconds_check;
ALTER TABLE races DROP CONSTRAINT races_score_check;

-- +goose Down
ALTER TABLE athletes DROP COLUMN sex;
ALTER TABLE users DROP COLUMN user_role;

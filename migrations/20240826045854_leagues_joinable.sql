-- +goose Up
ALTER TABLE leagues ADD COLUMN joinable boolean NOT NULL DEFAULT(FALSE);

-- +goose Down
ALTER TABLE leagues DROP COLUMN joinable;

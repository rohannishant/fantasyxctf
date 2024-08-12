-- +goose Up
CREATE TABLE users(
	user_id SERIAL PRIMARY KEY,
	username VARCHAR(20) NOT NULL,
	pass VARCHAR(20) NOT NULL
);

-- +goose Down
DROP TABLE users;

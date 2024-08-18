-- +goose Up
CREATE TABLE seasons (
    season_id SERIAL PRIMARY KEY,
    season_name text UNIQUE NOT NULL
);

CREATE TABLE athletes (
    athlete_id SERIAL PRIMARY KEY,
    athlete_name text NOT NULL,
    athlete_year smallint NOT NULL CHECK (athlete_year > 0 and athlete_year < 5),
    season_id int NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    UNIQUE(season_id, athlete_name)
);

CREATE TABLE meets (
    meet_id SERIAL PRIMARY KEY,
    meet_name text NOT NULL,
    season_id int NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    UNIQUE(season_id, meet_name)
);

ALTER TABLE seasons ADD current_meet int REFERENCES meets(meet_id) ON DELETE SET NULL;

CREATE TABLE races (
    race_id SERIAL PRIMARY KEY,
    score real NOT NULL CHECK (score > 0.0),
    previous_minutes smallint NOT NULL CHECK (previous_minutes > 0),
    previous_seconds smallint NOT NULL CHECK (previous_seconds > 0),
    finish_minutes smallint NOT NULL CHECK (finish_minutes > 0),
    finish_seconds smallint NOT NULL CHECK (finish_seconds > 0),
    athlete_id int NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
    meet_id int NOT NULL REFERENCES meets(meet_id) ON DELETE CASCADE,
    UNIQUE(athlete_id, meet_id)
);

CREATE TABLE leagues (
    league_id SERIAL PRIMARY KEY,
    league_name TEXT UNIQUE NOT NULL,
    season_id int NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE
);

CREATE TABLE leaguemembers (
    membership_id SERIAL PRIMARY KEY,
    league_id int NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
    user_id int NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE meetpicks (
    picks_id SERIAL PRIMARY KEY,
    user_id int NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    meet_id int NOT NULL REFERENCES meets(meet_id) ON DELETE CASCADE,
    league_id int NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
    pick1 int REFERENCES athletes(athlete_id) ON DELETE SET NULL,
    pick2 int REFERENCES athletes(athlete_id) ON DELETE SET NULL,
    pick3 int REFERENCES athletes(athlete_id) ON DELETE SET NULL,
    CHECK(pick1 <> pick2 AND pick1 <> pick3 AND pick2 <> pick3)
);

-- +goose Down
DROP TABLE meetpicks;
DROP TABLE leaguemembers;
DROP TABLE races;
DROP TABLE athletes;
DROP TABLE meets;
DROP TABLE leagues;
DROP TABLE seasons;

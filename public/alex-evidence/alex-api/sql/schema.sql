-- Tasks API schema. Run once by hand before the first start:
--   psql tasks_dev < sql/schema.sql
-- There is no migration tool in this project; if the schema changes,
-- drop the tables and run this file again (documented in the README).

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Most queries list a team's pending tasks, so index the foreign key.
CREATE INDEX tasks_team_id_idx ON tasks (team_id);

-- Small seed set used during the capstone defense demo.
INSERT INTO teams (name) VALUES ('Demo Team');
INSERT INTO tasks (team_id, title, due_date) VALUES
  (1, 'Prepare defense slides', '2022-05-02'),
  (1, 'Load test data', NULL),
  (1, 'Rehearse API walkthrough', '2022-05-05');

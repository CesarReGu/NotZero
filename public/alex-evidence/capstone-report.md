# Task Management REST API for Small Teams

Final degree project report · B.S. Software Engineering
Universidad del Valle Tecnológico · Facultad de Ingeniería
Submitted April 2022 · Defended May 2022

## 1. Problem statement

Small student teams coordinate assignments over chat, so tasks are lost
when a conversation scrolls. This project delivers a REST API that stores
tasks per team and exposes them to any client that speaks HTTP.

## 2. Technology selection

I chose Node.js with Express and TypeScript because the Web Application
Development course used JavaScript, and TypeScript adds the static typing
we studied in Object-Oriented Programming. PostgreSQL was selected over
MySQL because the Databases course used PostgreSQL for the normalization
exercises, and I wanted foreign keys with `ON DELETE CASCADE`.

No framework beyond Express was used. The course guidance was to keep the
dependency list short so the grader can read the whole project, so request
validation, error handling, and configuration are written by hand.

## 3. Architecture

The API is a single Express process talking to one PostgreSQL database.

- `src/server.ts` defines four routes and validates input before touching
  the database.
- `src/config.ts` reads `DATABASE_URL` and `PORT` from the environment so
  no connection string is committed to the repository.
- `src/db.ts` creates one shared `pg` connection pool.
- `sql/schema.sql` creates the `teams` and `tasks` tables.

Endpoints implemented:

| Method | Path              | Purpose                          |
|--------|-------------------|----------------------------------|
| GET    | /health           | Liveness check used by the tests |
| GET    | /tasks            | List tasks, `?done=false` filter |
| POST   | /tasks            | Create a task for a team         |
| PUT    | /tasks/:id/done   | Mark one task complete           |

Every query that accepts user input uses parameterized placeholders
(`$1`, `$2`) rather than string concatenation. This was the specific
recommendation in the Information Security Fundamentals unit on injection.

## 4. Testing

Testing follows the Software Quality and Testing course: a written test
plan for manual cases and one automated test for the health endpoint using
Jest and Supertest. I run `npm test` on my laptop before each delivery.

The automated suite covers one endpoint. The remaining routes were checked
by hand with Postman and recorded in the course test plan. I did not have
time to automate them, and the program did not cover any tool that runs
tests automatically when code changes.

## 5. Deployment

Releases go to the faculty server by hand: compile with `npm run build`,
copy `dist/` with `scp`, reinstall production dependencies over SSH,
rewrite the `.env` file from my notes, then restart the process inside
`screen` so it survives logout. The README records the exact sequence.

This works but it is fragile. Twice during the semester the API stayed
down after a restart because a step was skipped and nobody noticed until
a teammate reported it.

## 6. Known limitations and future work

- Logging is a single `console.log` line per request. There is no way to
  search or aggregate it after the fact, and no metrics of any kind.
- Each teammate reinstalls Node and PostgreSQL locally. Setup differences
  cost several hours across the semester.
- Schema changes require dropping and recreating tables by hand. There is
  no migration history.
- The project has never run anywhere except a laptop and the faculty
  server. Cloud hosting was outside the scope of the program.
- Authentication was declared out of scope by the project seminar rubric.

Given more time I would automate the release sequence and add tests for
the remaining routes. The program did not teach these tools, so I would be
learning them from documentation rather than from coursework.

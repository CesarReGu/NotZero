# Tasks API

Final degree project · Software Engineering · April 2022

A REST API for managing team task lists, built with Node.js,
Express, TypeScript, and PostgreSQL. This was developed and graded
as an individual capstone project.

## Requirements

- Node.js 16 installed on your machine
- PostgreSQL 13 installed and running locally
- npm 8 (comes with Node)

## Repository layout

- `src/server.ts` — Express app and route definitions
- `src/config.ts` — reads runtime settings from the environment
- `src/db.ts` — PostgreSQL connection pool
- `tests/health.test.ts` — health endpoint test (Jest + Supertest)
- `sql/schema.sql` — tables, run this once before starting

## Run locally

Install dependencies, create the environment file, run the tests, then start the API.

1. `npm install`
2. Copy `.env.example` to `.env` and set both values by hand:
   - `DATABASE_URL=postgres://localhost:5432/tasks_dev`
   - `PORT=3000`
3. Create the database and load `sql/schema.sql` with `psql`
4. `npm test`
5. `npm start` (runs `ts-node src/server.ts`)

If the port is busy, change `PORT` in `.env` and restart. Every
teammate repeats these steps on their own machine.

## Deployment (faculty server)

Releases are done by hand at the end of each sprint:

1. `npm run build` to compile TypeScript into `dist/`
2. Copy `dist/` and `package.json` to the faculty server with `scp`
3. SSH in, run `npm install --production`
4. Recreate the `.env` file on the server from my notes
5. Stop the old process, then `node dist/server.js` inside `screen`
   so it keeps running after logout

There is no automated pipeline; if a step is forgotten the API
stays down until someone notices and repeats the sequence.

Last updated 2022-04-14 before the final defense.

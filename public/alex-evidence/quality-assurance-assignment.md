# Software Quality and Testing — Assignment 4

Unit and integration testing on the semester project
Universidad del Valle Tecnológico · Fourth year · Delivered March 2022

## Objective given by the instructor

Write a test plan for your semester project, implement at least one
automated test, and justify which cases stay manual. Deliver the plan and
a screenshot of the passing test run.

## Part A. Manual test plan

| ID   | Case                                   | Steps                                        | Expected result            | Result |
|------|----------------------------------------|----------------------------------------------|----------------------------|--------|
| TC-1 | Health check responds                  | GET /health                                  | 200, `{"status":"ok"}`     | Pass   |
| TC-2 | Create task with valid data            | POST /tasks with title and teamId            | 201, task returned with id | Pass   |
| TC-3 | Reject empty title                     | POST /tasks with `title: ""`                 | 400, error message         | Pass   |
| TC-4 | Reject title over 200 characters       | POST /tasks with a 250-character title       | 400, error message         | Pass   |
| TC-5 | Reject non-integer teamId              | POST /tasks with `teamId: "abc"`             | 400, error message         | Pass   |
| TC-6 | Mark task complete                     | PUT /tasks/1/done                            | 200, `done` is true        | Pass   |
| TC-7 | Unknown task id                        | PUT /tasks/9999/done                         | 404, error message         | Pass   |
| TC-8 | Filter pending tasks                   | GET /tasks?done=false                        | Only tasks with done=false | Pass   |

Cases TC-2 through TC-8 were executed by hand in Postman on March 21 and
repeated before the April delivery. Each run takes about ten minutes.

## Part B. Automated test

I automated TC-1 with Jest and Supertest. Supertest starts the Express app
in memory, so the test does not need a running server or a free port:

```ts
test("health endpoint", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});
```

The application only calls `app.listen` when the file is executed
directly, which is what lets the test import `app` without opening a port.

Command used: `npm test`. The suite runs in under two seconds on my
laptop.

## Part C. Justification for the manual cases

TC-2 through TC-8 write to the database. Automating them would need a
separate test database that is reset between runs, and the course did not
cover fixtures, seeding, or test isolation for databases. Running them by
hand in Postman was the option available to me within the delivery date.

## Instructor feedback received

"Correct test plan and a working automated case. The next step in industry
practice is to run these checks automatically on every change instead of
before each delivery. That subject is not part of this program."

## What I would improve

Automating TC-2 through TC-8 requires a repeatable database state. I know
what the tests should assert because they are already written down here.
The missing piece is the mechanism that sets up and tears down the data,
and something that runs the suite without me remembering to type
`npm test`.

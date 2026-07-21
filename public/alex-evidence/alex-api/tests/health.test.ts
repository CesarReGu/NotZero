import request from "supertest";
import { app } from "../src/server";

// Run with `npm test` before every manual release (see README).
test("health endpoint", async () => {
  const response = await request(app).get("/health");
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ status: "ok" });
});

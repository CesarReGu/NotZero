import express from "express";
import { config } from "./config";
import { pool } from "./db";

export const app = express();
app.use(express.json());

// Simple request log so I can see what happened during the demo.
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// List tasks, optionally only the pending ones (?done=false).
app.get("/tasks", async (req, res) => {
  try {
    const onlyPending = req.query.done === "false";
    const result = onlyPending
      ? await pool.query("SELECT * FROM tasks WHERE done = FALSE ORDER BY created_at DESC")
      : await pool.query("SELECT * FROM tasks ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error("GET /tasks failed", error);
    res.status(500).json({ error: "internal_error" });
  }
});

app.post("/tasks", async (req, res) => {
  const { title, teamId } = req.body;
  // Validate by hand; we did not use a validation library in class.
  if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
    return res.status(400).json({ error: "title is required (1-200 characters)" });
  }
  if (!Number.isInteger(teamId)) {
    return res.status(400).json({ error: "teamId must be an integer" });
  }
  try {
    // Parameterized queries as taught in Databases to avoid SQL injection.
    const result = await pool.query(
      "INSERT INTO tasks (title, team_id) VALUES ($1, $2) RETURNING *",
      [title.trim(), teamId],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /tasks failed", error);
    res.status(500).json({ error: "internal_error" });
  }
});

app.put("/tasks/:id/done", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id must be a positive integer" });
  }
  try {
    const result = await pool.query(
      "UPDATE tasks SET done = TRUE WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "task not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("PUT /tasks/:id/done failed", error);
    res.status(500).json({ error: "internal_error" });
  }
});

// Only listen when started directly (npm start). The Jest tests import
// `app` without opening a port, following the Supertest examples.
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Tasks API listening on port ${config.port}`);
  });
}

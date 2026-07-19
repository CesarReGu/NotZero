import { preparedScenarioSchema } from "@/lib/domain/schemas";

export const alexScenario = preparedScenarioSchema.parse({
  id: "alex-2022-software-graduate",
  fieldContext: {
    field: "Software development",
    targetTitle: "Junior backend engineer",
    location: "Mexico · Remote-friendly",
    jurisdiction: "Mexico",
  },
  person: {
    name: "Alex Rivera",
    graduationYear: 2022,
    program: "B.S. Software Engineering",
  },
  evidence: [
    {
      id: "curriculum",
      title: "Software engineering study plan",
      sourceType: "curriculum",
      evidenceClass: "expected_exposure",
      date: "2022-05-20",
      summary: "Programming, data structures, databases, web development, operating systems, and networking.",
      locator: { path: "study-plan.md", kind: "section", value: "Course record" },
    },
    {
      id: "deployment-guide",
      title: "Manual deployment guide",
      sourceType: "supporting_document",
      evidenceClass: "demonstrated",
      date: "2022-04-14",
      summary: "Documents dependency installation, environment setup, local tests, and a manual release sequence.",
      locator: { path: "alex-api/README.md", kind: "section", value: "Run locally" },
    },
    {
      id: "project-config",
      title: "REST API runtime configuration",
      sourceType: "project_artifact",
      evidenceClass: "demonstrated",
      date: "2022-04-14",
      summary: "Reads required runtime settings outside application logic and applies a documented port default.",
      locator: { path: "alex-api/src/config.ts", kind: "configuration_key", value: "PORT" },
    },
    {
      id: "project-tests",
      title: "Local health-check test",
      sourceType: "project_artifact",
      evidenceClass: "demonstrated",
      date: "2022-04-14",
      summary: "Runs a bounded automated test locally before manual deployment.",
      locator: { path: "alex-api/tests/health.test.ts", kind: "symbol", value: "health endpoint" },
    },
  ],
  targetRoles: [
    {
      id: "junior-backend-devops",
      title: "Junior backend engineer",
      field: "Software development",
      location: "Mexico · Remote-friendly",
      jurisdiction: "Mexico",
      scope: "Entry-level backend work with deployment and operations responsibilities.",
    },
  ],
});

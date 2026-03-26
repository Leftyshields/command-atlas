import { execSync } from "child_process";

// Use a separate test database so we don't touch dev.db (file path relative to prisma/schema.prisma)
process.env.DATABASE_URL = "file:./test.db";
process.env.NODE_ENV = "test";

execSync("npx prisma migrate deploy", {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

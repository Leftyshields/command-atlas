import cors from "cors";
import express from "express";
import { backupRouter } from "./routes/backup.js";
import { exportRouter } from "./routes/export.js";
import { observationsRouter } from "./routes/observations.js";
import { peopleRouter } from "./routes/people.js";
import { searchRouter } from "./routes/search.js";
import { systemsRouter } from "./routes/systems.js";

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? true }));
app.use(express.json());

app.use("/api/observations", observationsRouter);
app.use("/api/people", peopleRouter);
app.use("/api/systems", systemsRouter);
app.use("/api/search", searchRouter);
app.use("/api/backup", backupRouter);
app.use("/api/export", exportRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (process.env.NODE_ENV === "production") {
    console.error("Internal server error");
  } else {
    console.error(err);
  }
  res.status(500).json({ error: "Internal server error" });
});

import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";

import userRoutes from "./users/user.routes.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", userRoutes);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next; // mark param as used to satisfy lint
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request body",
      issues: error.issues,
    });
    return;
  }

  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

export default app;

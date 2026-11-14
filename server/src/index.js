import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import api from "./routes/api.js";
import { User } from "./models/index.js";
const app = express();
app.use(helmet());
app.use(cors({
  origin: ['https://vemsio-eta.vercel.app'],
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "Vemsio API" }),
);
app.use("/api", api);
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server error" });
});
await mongoose.connect(process.env.MONGO_URI);
if (process.env.ADMIN_PASSWORD) {
  const exists = await User.findOne({ role: "Admin" });
  if (!exists) {
    await User.create({
      emp_id: process.env.ADMIN_EMP_ID || "admin",
      name: "System Administrator",
      department: "Administration",
      role: "Admin",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    });
    console.log("Initial admin created from environment variables");
  }
}
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Vemsio API listening on ${port}`));

import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import employeesRouter from "./routes/employeeRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";

const app = express();
const PORT = process.env.PORT || 4000;

//middleware
app.use(cors());
app.use(express());
app.use(multer().none());

//routes
app.get("/", (req, res) => res.send("server is running"));
app.use("/api/auth", authRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/profile", profileRouter);
app.use("/api/attendance", attendanceRouter);
await connectDB();
app.listen(PORT, () => console.log(`server running on port ${PORT}`));

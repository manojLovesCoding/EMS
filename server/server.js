import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";

const app = express();
const PORT = process.env.PORT || 4000;

//middleware
app.use(cors());
app.use(express());
app.use(multer().none());

//routes
app.get("/", (req, res) => res.send("server is running"));
app.listen(PORT, () => console.log(`server running on port ${PORT}`));

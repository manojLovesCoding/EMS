import { Router } from "express";

import { protect, protectAdmin } from "../middleware/auth.js";
import { getDashboard } from "../controllers/dashboardController.js";

const dashboardRouter = Router();

dashboardRouter.get("/", protect, getDashboard);

export default dashboardRouter;

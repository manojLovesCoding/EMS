import { Router } from "express";

import { protect } from "../middleware/auth.js";
import { getProfile, updateProfile } from "../controllers/profileContoller.js";

const profileRouter = Router();

profileRouter.get("/", protect, getProfile);
profileRouter.post("/:id", protect, updateProfile);

export default profileRouter;

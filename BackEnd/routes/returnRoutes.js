import express from "express";
import auth from "../middleware/auth.js";
import { createReturn, listReturns, getReturnById, returnsSummary } from "../controllers/returnController.js";

const router = express.Router();
router.use(auth);

router.get("/summary", returnsSummary);

router.get("/", listReturns);
router.post("/", createReturn);
router.get("/:id", getReturnById);

export default router;
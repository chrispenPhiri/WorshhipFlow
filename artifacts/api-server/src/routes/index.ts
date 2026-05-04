import { Router, type IRouter } from "express";
import healthRouter from "./health";
import songsRouter from "./songs";
import schedulesRouter from "./schedules";
import notesRouter from "./notes";
import settingsRouter from "./settings";
import screenRouter from "./screen";
import teachingsRouter from "./teachings";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/songs", songsRouter);
router.use("/schedules", schedulesRouter);
router.use("/notes", notesRouter);
router.use("/settings", settingsRouter);
router.use("/screen", screenRouter);
router.use("/teachings", teachingsRouter);
router.use("/ai", aiRouter);

export default router;

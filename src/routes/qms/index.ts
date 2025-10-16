import { Router, Request, Response } from "express";
import sopsRouter from "./qms-sops";
import trainingRouter from "./qms-training";
import deviationsRouter from "./qms-deviations";
import capasRouter from "./qms-capas";
import environmentalRouter from "./qms-environmental";
import ebrRouter from "./qms-ebr";
import recordsRouter from "./qms-records";
import { QMSRecordsService } from "@/services/qms/qms-records";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const qmsRecordsService = new QMSRecordsService();

/**
 * @route GET /api/v1/qms/metrics
 * @desc Get QMS metrics and statistics
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/metrics",
	authenticate,
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const metrics = await qmsRecordsService.getMetrics();

			res.json({
				success: true,
				data: metrics,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

// Mount all QMS sub-routes
router.use("/sops", sopsRouter);
router.use("/training", trainingRouter);
router.use("/deviations", deviationsRouter);
router.use("/capas", capasRouter);
router.use("/environment", environmentalRouter);
router.use("/ebr", ebrRouter);
router.use("/records", recordsRouter);

export default router;

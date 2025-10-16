import { Router, Request, Response } from "express";
import { StagesService } from "@/services/stages";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const stagesService = new StagesService();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/stages
 * @desc List stages with optional filters
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				is_active: req.query.is_active ? req.query.is_active === "true" : undefined,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await stagesService.listStages(filters);

			res.json({
				success: true,
				data: result,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route GET /api/v1/stages/:stage_id
 * @desc Get a single stage by ID
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/:stage_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { stage_id } = req.params;

			if (!stage_id) {
				res.status(400).json({
					success: false,
					error: "Stage ID is required",
				});
				return;
			}

			const stage = await stagesService.getStageById(stage_id);

			res.json({
				success: true,
				data: stage,
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Stage not found") {
				res.status(404).json({
					success: false,
					error: "Stage not found",
				});
				return;
			}

			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route POST /api/v1/stages
 * @desc Create a new stage
 * @access Private (admin)
 */
router.post(
	"/",
	requireRole(["admin"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { name, description, duration_days, requirements, order_index, is_active } = req.body;

			if (!name) {
				res.status(400).json({
					success: false,
					error: "Stage name is required",
				});
				return;
			}

			const stage = await stagesService.createStage({
				name,
				description,
				duration_days,
				requirements,
				order_index,
				is_active,
			});

			res.status(201).json({
				success: true,
				data: stage,
				message: "Stage created successfully",
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route PUT /api/v1/stages/:stage_id
 * @desc Update an existing stage
 * @access Private (admin)
 */
router.put(
	"/:stage_id",
	requireRole(["admin"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { stage_id } = req.params;

			if (!stage_id) {
				res.status(400).json({
					success: false,
					error: "Stage ID is required",
				});
				return;
			}

			// Check if stage exists
			const exists = await stagesService.stageExists(stage_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "Stage not found",
				});
				return;
			}

			const stage = await stagesService.updateStage(stage_id, req.body);

			res.json({
				success: true,
				data: stage,
				message: "Stage updated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Stage not found") {
				res.status(404).json({
					success: false,
					error: "Stage not found",
				});
				return;
			}

			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route GET /api/v1/stages/batch/:batch_id
 * @desc Get batch stages for a specific batch
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/batch/:batch_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { batch_id } = req.params;

			if (!batch_id) {
				res.status(400).json({
					success: false,
					error: "Batch ID is required",
				});
				return;
			}

			const batchStages = await stagesService.getBatchStages(batch_id);

			res.json({
				success: true,
				data: batchStages,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route POST /api/v1/stages/batch/:batch_id
 * @desc Create batch stages for a batch
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.post(
	"/batch/:batch_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { batch_id } = req.params;
			const { stages } = req.body;

			if (!batch_id) {
				res.status(400).json({
					success: false,
					error: "Batch ID is required",
				});
				return;
			}

			if (!stages || !Array.isArray(stages)) {
				res.status(400).json({
					success: false,
					error: "Stages array is required",
				});
				return;
			}

			const batchStages = await stagesService.createBatchStages(batch_id, stages);

			res.status(201).json({
				success: true,
				data: batchStages,
				message: "Batch stages created successfully",
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route PATCH /api/v1/stages/batch-stages/:batch_stage_id/activate
 * @desc Activate a batch stage
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.patch(
	"/batch-stages/:batch_stage_id/activate",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { batch_stage_id } = req.params;

			if (!batch_stage_id) {
				res.status(400).json({
					success: false,
					error: "Batch stage ID is required",
				});
				return;
			}

			const batchStage = await stagesService.activateBatchStage(batch_stage_id);

			res.json({
				success: true,
				data: batchStage,
				message: "Batch stage activated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Batch stage not found") {
				res.status(404).json({
					success: false,
					error: "Batch stage not found",
				});
				return;
			}

			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route PATCH /api/v1/stages/batch-stages/:batch_stage_id/complete
 * @desc Complete a batch stage
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.patch(
	"/batch-stages/:batch_stage_id/complete",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { batch_stage_id } = req.params;

			if (!batch_stage_id) {
				res.status(400).json({
					success: false,
					error: "Batch stage ID is required",
				});
				return;
			}

			const batchStage = await stagesService.completeBatchStage(batch_stage_id);

			res.json({
				success: true,
				data: batchStage,
				message: "Batch stage completed successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Batch stage not found") {
				res.status(404).json({
					success: false,
					error: "Batch stage not found",
				});
				return;
			}

			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

/**
 * @route PUT /api/v1/stages/batch-stages/:batch_stage_id
 * @desc Update a batch stage
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.put(
	"/batch-stages/:batch_stage_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { batch_stage_id } = req.params;

			if (!batch_stage_id) {
				res.status(400).json({
					success: false,
					error: "Batch stage ID is required",
				});
				return;
			}

			// Check if batch stage exists
			const exists = await stagesService.batchStageExists(batch_stage_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "Batch stage not found",
				});
				return;
			}

			const batchStage = await stagesService.updateBatchStage(batch_stage_id, req.body);

			res.json({
				success: true,
				data: batchStage,
				message: "Batch stage updated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Batch stage not found") {
				res.status(404).json({
					success: false,
					error: "Batch stage not found",
				});
				return;
			}

			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

export default router;

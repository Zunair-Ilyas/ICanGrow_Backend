import { Router, Request, Response } from "express";
import { QMSRecordsService } from "@/services/qms/qms-records";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const qmsRecordsService = new QMSRecordsService();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/qms/records
 * @desc List QMS records with optional filters
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				record_type: req.query.record_type as string,
				status: req.query.status as string,
				severity: req.query.severity as string,
				batch_id: req.query.batch_id as string,
				cycle_id: req.query.cycle_id as string,
				stage_id: req.query.stage_id as string,
				assigned_to: req.query.assigned_to as string,
				created_by: req.query.created_by as string,
				q: req.query.q as string,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await qmsRecordsService.listRecords(filters);

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
 * @route GET /api/v1/qms/metrics
 * @desc Get QMS metrics and statistics
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/metrics",
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

/**
 * @route POST /api/v1/qms/records
 * @desc Create a new QMS record
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.post(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const {
				title,
				description,
				record_type,
				severity,
				status,
				batch_id,
				cycle_id,
				stage_id,
				assigned_to,
				due_date,
				data,
				tags,
				attachments,
			} = req.body;

			if (!title || !record_type) {
				res.status(400).json({
					success: false,
					error: "Title and record_type are required",
				});
				return;
			}

			// Get user ID from auth middleware
			const userId = req.user?.userId;
			if (!userId) {
				res.status(401).json({
					success: false,
					error: "User ID not found in token",
				});
				return;
			}

			const record = await qmsRecordsService.createRecord(
				{
					title,
					description,
					record_type,
					severity,
					status,
					batch_id,
					cycle_id,
					stage_id,
					assigned_to,
					due_date,
					data,
					tags,
					attachments,
				},
				userId
			);

			res.status(201).json({
				success: true,
				data: record,
				message: "QMS record created successfully",
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
 * @route GET /api/v1/qms/records/:record_id
 * @desc Get a single QMS record by ID
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/:record_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { record_id } = req.params;

			if (!record_id) {
				res.status(400).json({
					success: false,
					error: "Record ID is required",
				});
				return;
			}

			const record = await qmsRecordsService.getRecordById(record_id);

			res.json({
				success: true,
				data: record,
			});
		} catch (error) {
			if (error instanceof Error && error.message === "QMS record not found") {
				res.status(404).json({
					success: false,
					error: "QMS record not found",
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
 * @route PUT /api/v1/qms/records/:record_id
 * @desc Update an existing QMS record
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.put(
	"/:record_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { record_id } = req.params;

			if (!record_id) {
				res.status(400).json({
					success: false,
					error: "Record ID is required",
				});
				return;
			}

			// Check if record exists
			const exists = await qmsRecordsService.recordExists(record_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "QMS record not found",
				});
				return;
			}

			const record = await qmsRecordsService.updateRecord(record_id, req.body);

			res.json({
				success: true,
				data: record,
				message: "QMS record updated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "QMS record not found") {
				res.status(404).json({
					success: false,
					error: "QMS record not found",
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
 * @route GET /api/v1/qms/records/batch/:batch_id
 * @desc Get QMS records for a specific batch
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

			const records = await qmsRecordsService.getRecordsByBatch(batch_id);

			res.json({
				success: true,
				data: records,
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}
);

export default router;

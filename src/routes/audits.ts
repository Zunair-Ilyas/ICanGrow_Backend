import { Router, Request, Response } from "express";
import { AuditsService } from "@/services/audits";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const auditsService = new AuditsService();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/audits
 * @desc List audits with optional filters
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				status: req.query.status as string,
				type: req.query.type as string,
				date_from: req.query.date_from as string,
				date_to: req.query.date_to as string,
				auditor: req.query.auditor as string,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await auditsService.listAudits(filters);

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
 * @route POST /api/v1/audits
 * @desc Create a new audit
 * @access Private (admin, qa_manager)
 */
router.post(
	"/",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { title, type, scheduled_date, auditor, description, scope, objectives, criteria } = req.body;

			if (!title || !type || !scheduled_date || !auditor) {
				res.status(400).json({
					success: false,
					error: "Title, type, scheduled_date, and auditor are required",
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

			const audit = await auditsService.createAudit(
				{
					title,
					type,
					scheduled_date,
					auditor,
					description,
					scope,
					objectives,
					criteria,
				},
				userId
			);

			res.status(201).json({
				success: true,
				data: audit,
				message: "Audit created successfully",
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
 * @route GET /api/v1/audits/:audit_id
 * @desc Get a single audit by ID
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/:audit_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { audit_id } = req.params;

			if (!audit_id) {
				res.status(400).json({
					success: false,
					error: "Audit ID is required",
				});
				return;
			}

			const audit = await auditsService.getAuditById(audit_id);

			res.json({
				success: true,
				data: audit,
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Audit not found") {
				res.status(404).json({
					success: false,
					error: "Audit not found",
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
 * @route PUT /api/v1/audits/:audit_id
 * @desc Update an existing audit
 * @access Private (admin, qa_manager)
 */
router.put(
	"/:audit_id",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { audit_id } = req.params;

			if (!audit_id) {
				res.status(400).json({
					success: false,
					error: "Audit ID is required",
				});
				return;
			}

			// Check if audit exists
			const exists = await auditsService.auditExists(audit_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "Audit not found",
				});
				return;
			}

			const audit = await auditsService.updateAudit(audit_id, req.body);

			res.json({
				success: true,
				data: audit,
				message: "Audit updated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Audit not found") {
				res.status(404).json({
					success: false,
					error: "Audit not found",
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
 * @route POST /api/v1/audits/:audit_id/complete
 * @desc Complete an audit
 * @access Private (admin, qa_manager)
 */
router.post(
	"/:audit_id/complete",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { audit_id } = req.params;

			if (!audit_id) {
				res.status(400).json({
					success: false,
					error: "Audit ID is required",
				});
				return;
			}

			// Check if audit exists
			const exists = await auditsService.auditExists(audit_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "Audit not found",
				});
				return;
			}

			const { results, recommendations, completed_date } = req.body;

			const audit = await auditsService.completeAudit(audit_id, {
				results,
				recommendations,
				completed_date,
			});

			res.json({
				success: true,
				data: audit,
				message: "Audit completed successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Audit not found") {
				res.status(404).json({
					success: false,
					error: "Audit not found",
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

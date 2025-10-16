import { Router, Request, Response } from "express";
import { AuditLogsService } from "@/services/audit-logs";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const auditLogsService = new AuditLogsService();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/audit-logs
 * @desc List audit logs with optional filters
 * @access Private (admin, qa_manager)
 */
router.get(
	"/",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				user_id: req.query.user_id as string,
				action: req.query.action as string,
				resource_type: req.query.resource_type as string,
				resource_id: req.query.resource_id as string,
				date_from: req.query.date_from as string,
				date_to: req.query.date_to as string,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await auditLogsService.listAuditLogs(filters);

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
 * @route POST /api/v1/audit-logs
 * @desc Create a new audit log entry
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.post(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { action, resource_type, resource_id, details } = req.body;

			if (!action || !resource_type) {
				res.status(400).json({
					success: false,
					error: "Action and resource_type are required",
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

			const auditLog = await auditLogsService.createAuditLog(
				{
					action,
					resource_type,
					resource_id,
					details,
				},
				userId
			);

			res.status(201).json({
				success: true,
				data: auditLog,
				message: "Audit log created successfully",
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
 * @route GET /api/v1/audit-logs/resource/:resource_type/:resource_id
 * @desc Get audit logs for a specific resource
 * @access Private (admin, qa_manager)
 */
router.get(
	"/resource/:resource_type/:resource_id",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { resource_type, resource_id } = req.params;

			if (!resource_type || !resource_id) {
				res.status(400).json({
					success: false,
					error: "Resource type and resource ID are required",
				});
				return;
			}

			const auditLogs = await auditLogsService.getAuditLogsByResource(
				resource_type,
				resource_id
			);

			res.json({
				success: true,
				data: auditLogs,
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
 * @route GET /api/v1/audit-logs/user/:user_id
 * @desc Get audit logs for a specific user
 * @access Private (admin, qa_manager)
 */
router.get(
	"/user/:user_id",
	requireRole(["admin", "qa_manager"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { user_id } = req.params;

			if (!user_id) {
				res.status(400).json({
					success: false,
					error: "User ID is required",
				});
				return;
			}

			const auditLogs = await auditLogsService.getAuditLogsByUser(user_id);

			res.json({
				success: true,
				data: auditLogs,
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
 * @route POST /api/v1/audit-logs/ebr-export
 * @desc Log EBR export activity
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.post(
	"/ebr-export",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { ebr_id, export_type, format } = req.body;

			if (!ebr_id || !export_type || !format) {
				res.status(400).json({
					success: false,
					error: "EBR ID, export type, and format are required",
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

			const auditLog = await auditLogsService.logEBRExport(
				ebr_id,
				export_type,
				format,
				userId
			);

			res.status(201).json({
				success: true,
				data: auditLog,
				message: "EBR export logged successfully",
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
 * @route POST /api/v1/audit-logs/delivery-note
 * @desc Log delivery note generation
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.post(
	"/delivery-note",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { dispatch_id, format } = req.body;

			if (!dispatch_id || !format) {
				res.status(400).json({
					success: false,
					error: "Dispatch ID and format are required",
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

			const auditLog = await auditLogsService.logDeliveryNoteGeneration(
				dispatch_id,
				format,
				userId
			);

			res.status(201).json({
				success: true,
				data: auditLog,
				message: "Delivery note generation logged successfully",
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

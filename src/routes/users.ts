import { Router, Request, Response } from "express";
import { UsersService } from "@/services/users";
import { authenticate, requireRole } from "@/middleware/auth";

const router: Router = Router();
const usersService = new UsersService();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route GET /api/v1/users
 * @desc List users with optional filters
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				role: req.query.role as string,
				status: req.query.status as string,
				q: req.query.q as string,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await usersService.listUsers(filters);

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
 * @route GET /api/v1/users/:user_id
 * @desc Get a single user by ID
 * @access Private (admin, qa_manager, cultivation_lead)
 */
router.get(
	"/:user_id",
	requireRole(["admin", "qa_manager", "cultivation_lead"]),
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

			const user = await usersService.getUserById(user_id);

			res.json({
				success: true,
				data: user,
			});
		} catch (error) {
			if (error instanceof Error && error.message === "User not found") {
				res.status(404).json({
					success: false,
					error: "User not found",
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
 * @route POST /api/v1/users/invite
 * @desc Send user invitation
 * @access Private (admin)
 */
router.post(
	"/invite",
	requireRole(["admin"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const { email, role } = req.body;

			if (!email || !role) {
				res.status(400).json({
					success: false,
					error: "Email and role are required",
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

			const invitation = await usersService.createUserInvitation(
				{ email, role },
				userId
			);

			res.status(201).json({
				success: true,
				data: invitation,
				message: "User invitation sent successfully",
			});
		} catch (error) {
			if (error instanceof Error && (
				error.message === "User with this email already exists" ||
				error.message === "Active invitation already exists for this email"
			)) {
				res.status(409).json({
					success: false,
					error: error.message,
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
 * @route PUT /api/v1/users/:user_id
 * @desc Update an existing user
 * @access Private (admin)
 */
router.put(
	"/:user_id",
	requireRole(["admin"]),
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

			// Check if user exists
			const exists = await usersService.userExists(user_id);
			if (!exists) {
				res.status(404).json({
					success: false,
					error: "User not found",
				});
				return;
			}

			const user = await usersService.updateUser(user_id, req.body);

			res.json({
				success: true,
				data: user,
				message: "User updated successfully",
			});
		} catch (error) {
			if (error instanceof Error && error.message === "User not found") {
				res.status(404).json({
					success: false,
					error: "User not found",
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
 * @route GET /api/v1/users/invitations
 * @desc Get user invitations
 * @access Private (admin)
 */
router.get(
	"/invitations",
	requireRole(["admin"]),
	async (req: Request, res: Response): Promise<void> => {
		try {
			const filters = {
				status: req.query.status as string,
				page: req.query.page ? parseInt(req.query.page as string) : 1,
				limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
			};

			const result = await usersService.getUserInvitations(filters);

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

export default router;

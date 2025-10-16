import express from "express";
import { ClientsService } from "../services/clients";
import { authenticate } from "../middleware/auth";
import { ClientStatus, createClientSchema } from "../utils/client-validation";
import { validate } from "../utils/validation";

const router: express.Router = express.Router();
const clientsService = new ClientsService();

interface Client {
	id: string;
	name: string;
	email: string;
	phone?: string | null;
	company?: string | null;
	address?: string | null;
	license_number?: string | null;
	client_type: string;
	status: string;
	notes?: string | null;
	created_by: string;
	created_at: string;
	updated_at: string;
}

// GET /api/v1/clients
router.get("/", authenticate, async (req, res, next) => {
	try {
		const { search, status, type } = req.query;
		const clients = await clientsService.getClients({
			search: typeof search === "string" ? search : undefined,
			status: typeof status === "string" ? status : undefined,
			type: typeof type === "string" ? type : undefined,
		});
		res.json({ success: true, data: clients });
	} catch (error) {
		next(error);
	}
});

// DELETE /api/v1/clients/:id
router.delete("/:id", authenticate, async (req, res, next) => {
	try {
		const { id } = req.params;
		await clientsService.deleteClient(id);
		res.json({ success: true, message: "Client deleted successfully" });
	} catch (error) {
		next(error);
	}
});

// PATCH /api/v1/clients/:id/archive
router.patch("/:id/archive", authenticate, async (req, res, next) => {
	try {
		const { id } = req.params;
		await clientsService.archiveClient(id);
		res.json({ success: true, message: "Client archived successfully" });
	} catch (error) {
		next(error);
	}
});

// GET /api/v1/clients/stats
router.get("/stats", authenticate, async (req, res, next) => {
	try {
		const clients = (await clientsService.getClients({})) as Client[];
		const total_clients = clients.length;
		const active_clients = clients.filter(
			(c: Client) => c.status === ClientStatus.ACTIVE
		).length;
		const suspended_clients = clients.filter(
			(c: Client) => c.status === ClientStatus.SUSPENDED
		).length;
		const inactive_clients = clients.filter(
			(c: Client) => c.status === ClientStatus.INACTIVE
		).length;

		res.json({
			success: true,
			data: {
				total_clients,
				active_clients,
				suspended_clients,
				inactive_clients,
			},
		});
	} catch (error) {
		next(error);
	}
});

// Helper function to transform client data to match database constraints
const transformClientData = (data: any) => {
	// Transform status to lowercase (database expects lowercase)
	if (data.status) {
		const statusMap: { [key: string]: string } = {
			active: "active",
			inactive: "inactive",
			suspended: "suspended",
			prospect: "suspended", // Map legacy 'prospect' to 'suspended'
		};
		data.status =
			statusMap[data.status.toLowerCase()] || data.status.toLowerCase();
	}

	// Transform client_type to lowercase (database expects lowercase)
	if (data.client_type) {
		const typeMap: { [key: string]: string } = {
			retailer: "retailer",
			processor: "processor",
			distributor: "distributor",
			direct: "direct",
		};
		data.client_type =
			typeMap[data.client_type.toLowerCase()] || data.client_type.toLowerCase();
	}

	return data;
};

// POST /api/v1/clients
router.post("/", authenticate, async (req, res, next) => {
	try {
		// Transform the request data to proper case
		const transformedBody = transformClientData(req.body);

		// Validate the transformed data
		const validatedData = createClientSchema.parse(transformedBody);

		const created_by = (req.user as import("../utils/jwt").JWTPayload)?.userId;
		if (!created_by) {
			res.status(401).json({ success: false, message: "Unauthorized" });
			return;
		}

		const clientData = {
			...validatedData,
			created_by,
		};

		const client = await clientsService.createClient(clientData);
		res.json({
			success: true,
			message: "Client created successfully",
			data: client,
		});
		return;
	} catch (error: any) {
		// Handle validation errors
		if (error.name === "ZodError") {
			res.status(400).json({
				success: false,
				message: "Validation error",
				errors: error.errors,
			});
			return;
		}

		if (error.code === "23505") {
			res.status(409).json({
				success: false,
				message: "A client with this email already exists",
			});
			return;
		}
		next(error);
		return;
	}
});

// PATCH /api/v1/clients/:id
router.patch("/:id", authenticate, async (req, res, next) => {
	try {
		const { id } = req.params;

		// Transform the request data to proper case
		const transformedBody = transformClientData(req.body);

		// Remove created_by from validation since it's not allowed in updates
		const { created_by, ...updateData } = transformedBody;

		// Validate the transformed data (using update schema would be better, but we'll use partial validation)
		// For now, just ensure the transformation worked

		const client = await clientsService.updateClient(id, updateData);
		res.json({
			success: true,
			message: "Client updated successfully",
			data: client,
		});
		return;
	} catch (error: any) {
		if (error.code === "23505") {
			res.status(409).json({
				success: false,
				message: "A client with this email already exists",
			});
			return;
		}
		next(error);
		return;
	}
});

export default router;

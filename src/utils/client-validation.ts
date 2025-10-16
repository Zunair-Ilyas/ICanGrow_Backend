import { z } from "zod";

// Client status enum validation (matching database constraint)
const clientStatusSchema = z.enum(["active", "inactive", "suspended"]);

// Client type enum validation (matching database constraint)
const clientTypeSchema = z.enum([
	"retailer",
	"processor",
	"distributor",
	"direct",
]);

// Client creation schema
export const createClientSchema = z.object({
	name: z.string().min(1, "Name is required").max(255),
	email: z.string().email("Invalid email format").max(255),
	phone: z.string().max(20).optional().nullable(),
	company: z.string().max(255).optional().nullable(),
	address: z.string().max(500).optional().nullable(),
	license_number: z.string().max(100).optional().nullable(),
	client_type: clientTypeSchema,
	status: clientStatusSchema.optional().default("active"),
	notes: z.string().max(1000).optional().nullable(),
});

// Client update schema
export const updateClientSchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().max(255).optional(),
	phone: z.string().max(20).optional().nullable(),
	company: z.string().max(255).optional().nullable(),
	address: z.string().max(500).optional().nullable(),
	license_number: z.string().max(100).optional().nullable(),
	client_type: clientTypeSchema.optional(),
	status: clientStatusSchema.optional(),
	notes: z.string().max(1000).optional().nullable(),
});

// Client query filters schema
export const clientsQuerySchema = z.object({
	search: z.string().optional(),
	status: clientStatusSchema.optional(),
	type: clientTypeSchema.optional(),
	page: z.coerce.number().positive().optional().default(1),
	limit: z.coerce.number().positive().max(100).optional().default(20),
});

// Export the enums for use in other files
export const ClientStatus = {
	ACTIVE: "active" as const,
	INACTIVE: "inactive" as const,
	SUSPENDED: "suspended" as const,
} as const;

export const ClientType = {
	RETAILER: "retailer" as const,
	PROCESSOR: "processor" as const,
	DISTRIBUTOR: "distributor" as const,
	DIRECT: "direct" as const,
} as const;

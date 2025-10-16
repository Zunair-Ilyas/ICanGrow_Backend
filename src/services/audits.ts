import { getSupabaseAdmin } from "@/services/supabase";
import { Database } from "@/types/database.types";

type Audit = Database["public"]["Tables"]["audits"]["Row"];
type AuditInsert = Database["public"]["Tables"]["audits"]["Insert"];
type AuditUpdate = Database["public"]["Tables"]["audits"]["Update"];

export interface AuditFilters {
	status?: string;
	type?: string;
	date_from?: string;
	date_to?: string;
	auditor?: string;
	page?: number;
	limit?: number;
}

export interface AuditListResponse {
	audits: Audit[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface CreateAuditData {
	title: string;
	type: string;
	scheduled_date: string;
	auditor: string;
	description?: string;
	scope?: string;
	objectives?: string;
	criteria?: string;
}

export interface UpdateAuditData {
	title?: string;
	type?: string;
	scheduled_date?: string;
	auditor?: string;
	description?: string;
	scope?: string;
	objectives?: string;
	criteria?: string;
	status?: string;
	completed_date?: string;
	results?: string;
	recommendations?: string;
}

export class AuditsService {
	private get supabase() {
		return getSupabaseAdmin();
	}

	/**
	 * List audits with optional filters
	 */
	async listAudits(filters: AuditFilters = {}): Promise<AuditListResponse> {
		try {
			const {
				status,
				type,
				date_from,
				date_to,
				auditor,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("audits").select("*", { count: "exact" });

			// Apply filters
			if (status) {
				query = query.eq("status", status);
			}
			if (type) {
				query = query.eq("type", type);
			}
			if (auditor) {
				query = query.eq("auditor", auditor);
			}
			if (date_from) {
				query = query.gte("scheduled_date", date_from);
			}
			if (date_to) {
				query = query.lte("scheduled_date", date_to);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by scheduled_date (newest first)
			query = query.order("scheduled_date", { ascending: false });

			const { data: audits, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch audits: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				audits: audits || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list audits: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get a single audit by ID
	 */
	async getAuditById(auditId: string): Promise<Audit> {
		try {
			const { data: audit, error } = await this.supabase
				.from("audits")
				.select("*")
				.eq("id", auditId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Audit not found");
				}
				throw new Error(`Failed to fetch audit: ${error.message}`);
			}

			return audit;
		} catch (error) {
			throw new Error(
				`Failed to get audit: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create a new audit
	 */
	async createAudit(
		data: CreateAuditData,
		createdBy: string
	): Promise<Audit> {
		try {
			const auditData: AuditInsert = {
				audit_number: "", // Will be overridden by database trigger
				title: data.title,
				type: data.type,
				scheduled_date: data.scheduled_date,
				auditor: data.auditor,
				description: data.description || null,
				scope: data.scope || null,
				objectives: data.objectives || null,
				criteria: data.criteria || null,
				status: "planned",
				created_by: createdBy,
			};

			const { data: audit, error } = await this.supabase
				.from("audits")
				.insert(auditData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create audit: ${error.message}`);
			}

			return audit;
		} catch (error) {
			throw new Error(
				`Failed to create audit: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Update an existing audit
	 */
	async updateAudit(
		auditId: string,
		data: UpdateAuditData
	): Promise<Audit> {
		try {
			const updateData: AuditUpdate = {};

			// Only include fields that are provided
			if (data.title !== undefined) updateData.title = data.title;
			if (data.type !== undefined) updateData.type = data.type;
			if (data.scheduled_date !== undefined) updateData.scheduled_date = data.scheduled_date;
			if (data.auditor !== undefined) updateData.auditor = data.auditor;
			if (data.description !== undefined) updateData.description = data.description;
			if (data.scope !== undefined) updateData.scope = data.scope;
			if (data.objectives !== undefined) updateData.objectives = data.objectives;
			if (data.criteria !== undefined) updateData.criteria = data.criteria;
			if (data.status !== undefined) updateData.status = data.status;
			if (data.completed_date !== undefined) updateData.completed_date = data.completed_date;
			if (data.results !== undefined) updateData.results = data.results;
			if (data.recommendations !== undefined) updateData.recommendations = data.recommendations;

			const { data: audit, error } = await this.supabase
				.from("audits")
				.update(updateData)
				.eq("id", auditId)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Audit not found");
				}
				throw new Error(`Failed to update audit: ${error.message}`);
			}

			return audit;
		} catch (error) {
			throw new Error(
				`Failed to update audit: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Complete an audit
	 */
	async completeAudit(
		auditId: string,
		completionData: {
			results?: string;
			recommendations?: string;
			completed_date?: string;
		}
	): Promise<Audit> {
		try {
			const updateData: AuditUpdate = {
				status: "completed",
				completed_date: completionData.completed_date || new Date().toISOString(),
			};

			if (completionData.results) {
				updateData.results = completionData.results;
			}
			if (completionData.recommendations) {
				updateData.recommendations = completionData.recommendations;
			}

			const { data: audit, error } = await this.supabase
				.from("audits")
				.update(updateData)
				.eq("id", auditId)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Audit not found");
				}
				throw new Error(`Failed to complete audit: ${error.message}`);
			}

			return audit;
		} catch (error) {
			throw new Error(
				`Failed to complete audit: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Check if audit exists
	 */
	async auditExists(auditId: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("audits")
				.select("id")
				.eq("id", auditId)
				.single();

			return !error && !!data;
		} catch (error) {
			return false;
		}
	}
}

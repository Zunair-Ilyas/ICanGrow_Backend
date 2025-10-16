import { getSupabaseAdmin } from "@/services/supabase";
import { Database } from "@/types/database.types";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

export interface AuditLogFilters {
	user_id?: string;
	action?: string;
	resource_type?: string;
	resource_id?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	limit?: number;
}

export interface AuditLogListResponse {
	audit_logs: AuditLog[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface CreateAuditLogData {
	action: string;
	resource_type: string;
	resource_id?: string;
	details?: any;
}

export class AuditLogsService {
	private get supabase() {
		return getSupabaseAdmin();
	}

	/**
	 * List audit logs with optional filters
	 */
	async listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
		try {
			const {
				user_id,
				action,
				resource_type,
				resource_id,
				date_from,
				date_to,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("audit_logs").select("*", { count: "exact" });

			// Apply filters
			if (user_id) {
				query = query.eq("user_id", user_id);
			}
			if (action) {
				query = query.eq("action", action);
			}
			if (resource_type) {
				query = query.eq("resource_type", resource_type);
			}
			if (resource_id) {
				query = query.eq("resource_id", resource_id);
			}
			if (date_from) {
				query = query.gte("created_at", date_from);
			}
			if (date_to) {
				query = query.lte("created_at", date_to);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by created_at (newest first)
			query = query.order("created_at", { ascending: false });

			const { data: auditLogs, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch audit logs: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				audit_logs: auditLogs || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list audit logs: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create a new audit log entry
	 */
	async createAuditLog(
		data: CreateAuditLogData,
		userId: string
	): Promise<AuditLog> {
		try {
			const auditLogData: AuditLogInsert = {
				user_id: userId,
				action: data.action,
				resource_type: data.resource_type,
				resource_id: data.resource_id || null,
				reason: data.details || null,
				created_at: new Date().toISOString(),
			};

			const { data: auditLog, error } = await this.supabase
				.from("audit_logs")
				.insert(auditLogData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create audit log: ${error.message}`);
			}

			return auditLog;
		} catch (error) {
			throw new Error(
				`Failed to create audit log: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get audit logs for a specific resource
	 */
	async getAuditLogsByResource(
		resourceType: string,
		resourceId: string
	): Promise<AuditLog[]> {
		try {
			const { data: auditLogs, error } = await this.supabase
				.from("audit_logs")
				.select("*")
				.eq("resource_type", resourceType)
				.eq("resource_id", resourceId)
				.order("created_at", { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch resource audit logs: ${error.message}`);
			}

			return auditLogs || [];
		} catch (error) {
			throw new Error(
				`Failed to get resource audit logs: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get audit logs for a specific user
	 */
	async getAuditLogsByUser(userId: string): Promise<AuditLog[]> {
		try {
			const { data: auditLogs, error } = await this.supabase
				.from("audit_logs")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch user audit logs: ${error.message}`);
			}

			return auditLogs || [];
		} catch (error) {
			throw new Error(
				`Failed to get user audit logs: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Log EBR export activity
	 */
	async logEBRExport(
		ebrId: string,
		exportType: string,
		format: string,
		userId: string
	): Promise<AuditLog> {
		return this.createAuditLog(
			{
				action: "EXPORT",
				resource_type: "qms_ebr",
				resource_id: ebrId,
				details: { export_type: exportType, format },
			},
			userId
		);
	}

	/**
	 * Log delivery note generation
	 */
	async logDeliveryNoteGeneration(
		dispatchId: string,
		format: string,
		userId: string
	): Promise<AuditLog> {
		return this.createAuditLog(
			{
				action: "GENERATE_DELIVERY_NOTE",
				resource_type: "dispatches",
				resource_id: dispatchId,
				details: { format, generated_at: new Date().toISOString() },
			},
			userId
		);
	}

	/**
	 * Log general activity
	 */
	async logActivity(
		action: string,
		resourceType: string,
		resourceId: string | null,
		details: any,
		userId: string
	): Promise<AuditLog> {
		return this.createAuditLog(
			{
				action,
				resource_type: resourceType,
				resource_id: resourceId || undefined,
				details,
			},
			userId
		);
	}
}

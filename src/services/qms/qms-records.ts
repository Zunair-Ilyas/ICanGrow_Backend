import { getSupabaseAdmin } from "@/services/supabase";
import { Database } from "@/types/database.types";

type QMSRecord = Database["public"]["Tables"]["qms_records"]["Row"];
type QMSRecordInsert = Database["public"]["Tables"]["qms_records"]["Insert"];
type QMSRecordUpdate = Database["public"]["Tables"]["qms_records"]["Update"];

export interface QMSRecordFilters {
	record_type?: string;
	status?: string;
	severity?: string;
	batch_id?: string;
	cycle_id?: string;
	stage_id?: string;
	assigned_to?: string;
	created_by?: string;
	q?: string;
	page?: number;
	limit?: number;
}

export interface QMSRecordListResponse {
	records: QMSRecord[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface CreateQMSRecordData {
	title: string;
	description?: string;
	record_type: string;
	severity?: string;
	status?: string;
	batch_id?: string;
	cycle_id?: string;
	stage_id?: string;
	assigned_to?: string;
	due_date?: string;
	data?: any;
	tags?: string[];
	attachments?: string[];
}

export interface UpdateQMSRecordData {
	title?: string;
	description?: string;
	record_type?: string;
	severity?: string;
	status?: string;
	batch_id?: string;
	cycle_id?: string;
	stage_id?: string;
	assigned_to?: string;
	due_date?: string;
	data?: any;
	tags?: string[];
	attachments?: string[];
	completed_date?: string;
	reviewed_by?: string;
	approved_by?: string;
}

export interface QMSMetrics {
	total_records: number;
	open_records: number;
	completed_records: number;
	overdue_records: number;
	records_by_type: Record<string, number>;
	records_by_status: Record<string, number>;
	records_by_severity: Record<string, number>;
	recent_activity: QMSRecord[];
}

export class QMSRecordsService {
	private get supabase() {
		return getSupabaseAdmin();
	}

	/**
	 * List QMS records with optional filters
	 */
	async listRecords(filters: QMSRecordFilters = {}): Promise<QMSRecordListResponse> {
		try {
			const {
				record_type,
				status,
				severity,
				batch_id,
				cycle_id,
				stage_id,
				assigned_to,
				created_by,
				q,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("qms_records").select("*", { count: "exact" });

			// Apply filters
			if (record_type) {
				query = query.eq("record_type", record_type);
			}
			if (status) {
				query = query.eq("status", status);
			}
			if (severity) {
				query = query.eq("severity", severity);
			}
			if (batch_id) {
				query = query.eq("batch_id", batch_id);
			}
			if (cycle_id) {
				query = query.eq("cycle_id", cycle_id);
			}
			if (stage_id) {
				query = query.eq("stage_id", stage_id);
			}
			if (assigned_to) {
				query = query.eq("assigned_to", assigned_to);
			}
			if (created_by) {
				query = query.eq("created_by", created_by);
			}
			if (q) {
				query = query.or(
					`title.ilike.%${q}%,description.ilike.%${q}%,reference_number.ilike.%${q}%`
				);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by created_at (newest first)
			query = query.order("created_at", { ascending: false });

			const { data: records, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch QMS records: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				records: records || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list QMS records: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get a single QMS record by ID
	 */
	async getRecordById(recordId: string): Promise<QMSRecord> {
		try {
			const { data: record, error } = await this.supabase
				.from("qms_records")
				.select("*")
				.eq("id", recordId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("QMS record not found");
				}
				throw new Error(`Failed to fetch QMS record: ${error.message}`);
			}

			return record;
		} catch (error) {
			throw new Error(
				`Failed to get QMS record: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create a new QMS record
	 */
	async createRecord(
		data: CreateQMSRecordData,
		createdBy: string
	): Promise<QMSRecord> {
		try {
			const recordData: QMSRecordInsert = {
				title: data.title,
				description: data.description || null,
				record_type: data.record_type as any,
				severity: data.severity as any || null,
				status: (data.status as any) || "open",
				batch_id: data.batch_id || null,
				cycle_id: data.cycle_id || null,
				stage_id: data.stage_id || null,
				assigned_to: data.assigned_to || null,
				due_date: data.due_date || null,
				data: data.data || null,
				tags: data.tags || null,
				attachments: data.attachments || null,
				created_by: createdBy,
			};

			const { data: record, error } = await this.supabase
				.from("qms_records")
				.insert(recordData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create QMS record: ${error.message}`);
			}

			return record;
		} catch (error) {
			throw new Error(
				`Failed to create QMS record: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Update an existing QMS record
	 */
	async updateRecord(
		recordId: string,
		data: UpdateQMSRecordData
	): Promise<QMSRecord> {
		try {
			const updateData: QMSRecordUpdate = {};

			// Only include fields that are provided
			if (data.title !== undefined) updateData.title = data.title;
			if (data.description !== undefined) updateData.description = data.description;
			if (data.record_type !== undefined) updateData.record_type = data.record_type as any;
			if (data.severity !== undefined) updateData.severity = data.severity as any;
			if (data.status !== undefined) updateData.status = data.status as any;
			if (data.batch_id !== undefined) updateData.batch_id = data.batch_id;
			if (data.cycle_id !== undefined) updateData.cycle_id = data.cycle_id;
			if (data.stage_id !== undefined) updateData.stage_id = data.stage_id;
			if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;
			if (data.due_date !== undefined) updateData.due_date = data.due_date;
			if (data.data !== undefined) updateData.data = data.data;
			if (data.tags !== undefined) updateData.tags = data.tags;
			if (data.attachments !== undefined) updateData.attachments = data.attachments;
			if (data.completed_date !== undefined) updateData.completed_date = data.completed_date;
			if (data.reviewed_by !== undefined) updateData.reviewed_by = data.reviewed_by;
			if (data.approved_by !== undefined) updateData.approved_by = data.approved_by;

			const { data: record, error } = await this.supabase
				.from("qms_records")
				.update(updateData)
				.eq("id", recordId)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("QMS record not found");
				}
				throw new Error(`Failed to update QMS record: ${error.message}`);
			}

			return record;
		} catch (error) {
			throw new Error(
				`Failed to update QMS record: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get QMS metrics and statistics
	 */
	async getMetrics(): Promise<QMSMetrics> {
		try {
			// Get total records
			const { count: totalRecords } = await this.supabase
				.from("qms_records")
				.select("*", { count: "exact", head: true });

			// Get records by status
			const { data: statusCounts } = await this.supabase
				.from("qms_records")
				.select("status");

			// Get records by type
			const { data: typeCounts } = await this.supabase
				.from("qms_records")
				.select("record_type");

			// Get records by severity
			const { data: severityCounts } = await this.supabase
				.from("qms_records")
				.select("severity");

			// Get overdue records
			const { count: overdueRecords } = await this.supabase
				.from("qms_records")
				.select("*", { count: "exact", head: true })
				.lt("due_date", new Date().toISOString())
				.neq("status", "completed");

			// Get recent activity (last 10 records)
			const { data: recentActivity } = await this.supabase
				.from("qms_records")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(10);

			// Process counts
			const recordsByStatus: Record<string, number> = {};
			statusCounts?.forEach((record: { status: string }) => {
				recordsByStatus[record.status] = (recordsByStatus[record.status] || 0) + 1;
			});

			const recordsByType: Record<string, number> = {};
			typeCounts?.forEach((record: { record_type: string }) => {
				recordsByType[record.record_type] = (recordsByType[record.record_type] || 0) + 1;
			});

			const recordsBySeverity: Record<string, number> = {};
			severityCounts?.forEach((record: { severity: string | null }) => {
				if (record.severity) {
					recordsBySeverity[record.severity] = (recordsBySeverity[record.severity] || 0) + 1;
				}
			});

			return {
				total_records: totalRecords || 0,
				open_records: recordsByStatus["open"] || 0,
				completed_records: recordsByStatus["completed"] || 0,
				overdue_records: overdueRecords || 0,
				records_by_type: recordsByType,
				records_by_status: recordsByStatus,
				records_by_severity: recordsBySeverity,
				recent_activity: recentActivity || [],
			};
		} catch (error) {
			throw new Error(
				`Failed to get QMS metrics: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Check if QMS record exists
	 */
	async recordExists(recordId: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("qms_records")
				.select("id")
				.eq("id", recordId)
				.single();

			return !error && !!data;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get QMS records for a specific batch
	 */
	async getRecordsByBatch(batchId: string): Promise<QMSRecord[]> {
		try {
			const { data: records, error } = await this.supabase
				.from("qms_records")
				.select("*")
				.eq("batch_id", batchId)
				.order("created_at", { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch batch QMS records: ${error.message}`);
			}

			return records || [];
		} catch (error) {
			throw new Error(
				`Failed to get batch QMS records: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}
}

import { getSupabaseAdmin } from "@/services/supabase";
import { Database } from "@/types/database.types";

type Stage = Database["public"]["Tables"]["stages"]["Row"];
type StageInsert = Database["public"]["Tables"]["stages"]["Insert"];
type StageUpdate = Database["public"]["Tables"]["stages"]["Update"];
type BatchStage = Database["public"]["Tables"]["batch_stages"]["Row"];
type BatchStageInsert = Database["public"]["Tables"]["batch_stages"]["Insert"];
type BatchStageUpdate = Database["public"]["Tables"]["batch_stages"]["Update"];

export interface StageFilters {
	is_active?: boolean;
	page?: number;
	limit?: number;
}

export interface StageListResponse {
	stages: Stage[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface CreateStageData {
	name: string;
	description?: string;
	duration_days?: number;
	requirements?: string[];
	order_index?: number;
	is_active?: boolean;
}

export interface UpdateStageData {
	name?: string;
	description?: string;
	duration_days?: number;
	requirements?: string[];
	order_index?: number;
	is_active?: boolean;
}

export interface CreateBatchStageData {
	batch_id: string;
	stage_id: string;
	status?: string;
	started_at?: string;
	completed_at?: string;
	notes?: string;
}

export interface BatchStageListResponse {
	batch_stages: BatchStage[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export class StagesService {
	private get supabase() {
		return getSupabaseAdmin();
	}

	/**
	 * List stages with optional filters
	 */
	async listStages(filters: StageFilters = {}): Promise<StageListResponse> {
		try {
			const {
				is_active,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("stages").select("*", { count: "exact" });

			// Apply filters
			if (is_active !== undefined) {
				query = query.eq("is_active", is_active);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by stage_order
			query = query.order("stage_order", { ascending: true });

			const { data: stages, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch stages: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				stages: stages || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list stages: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get a single stage by ID
	 */
	async getStageById(stageId: string): Promise<Stage> {
		try {
			const { data: stage, error } = await this.supabase
				.from("stages")
				.select("*")
				.eq("id", stageId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Stage not found");
				}
				throw new Error(`Failed to fetch stage: ${error.message}`);
			}

			return stage;
		} catch (error) {
			throw new Error(
				`Failed to get stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create a new stage
	 */
	async createStage(data: CreateStageData): Promise<Stage> {
		try {
			const stageData: StageInsert = {
				name: data.name,
				display_name: data.name, // Use name as display_name
				description: data.description || null,
				default_duration_days: data.duration_days || null,
				stage_order: data.order_index || 0,
				is_active: data.is_active !== undefined ? data.is_active : true,
			};

			const { data: stage, error } = await this.supabase
				.from("stages")
				.insert(stageData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create stage: ${error.message}`);
			}

			return stage;
		} catch (error) {
			throw new Error(
				`Failed to create stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Update an existing stage
	 */
	async updateStage(
		stageId: string,
		data: UpdateStageData
	): Promise<Stage> {
		try {
			const updateData: StageUpdate = {};

			// Only include fields that are provided
			if (data.name !== undefined) {
				updateData.name = data.name;
				updateData.display_name = data.name; // Update display_name as well
			}
			if (data.description !== undefined) updateData.description = data.description;
			if (data.duration_days !== undefined) updateData.default_duration_days = data.duration_days;
			if (data.order_index !== undefined) updateData.stage_order = data.order_index;
			if (data.is_active !== undefined) updateData.is_active = data.is_active;

			const { data: stage, error } = await this.supabase
				.from("stages")
				.update(updateData)
				.eq("id", stageId)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Stage not found");
				}
				throw new Error(`Failed to update stage: ${error.message}`);
			}

			return stage;
		} catch (error) {
			throw new Error(
				`Failed to update stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get batch stages for a specific batch
	 */
	async getBatchStages(batchId: string): Promise<BatchStage[]> {
		try {
			const { data: batchStages, error } = await this.supabase
				.from("batch_stages")
				.select(`
					*,
					stages (
						name,
						description,
						duration_days,
						requirements
					)
				`)
				.eq("batch_id", batchId)
				.order("created_at", { ascending: true });

			if (error) {
				throw new Error(`Failed to fetch batch stages: ${error.message}`);
			}

			return batchStages || [];
		} catch (error) {
			throw new Error(
				`Failed to get batch stages: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create batch stages for a batch
	 */
	async createBatchStages(
		batchId: string,
		stagesData: CreateBatchStageData[]
	): Promise<BatchStage[]> {
		try {
			const batchStagesData: BatchStageInsert[] = stagesData.map(stage => ({
				batch_id: batchId,
				stage_id: stage.stage_id,
				status: stage.status || "pending",
				started_at: stage.started_at || null,
				completed_at: stage.completed_at || null,
				notes: stage.notes || null,
			}));

			const { data: batchStages, error } = await this.supabase
				.from("batch_stages")
				.insert(batchStagesData)
				.select(`
					*,
					stages (
						name,
						description,
						duration_days,
						requirements
					)
				`);

			if (error) {
				throw new Error(`Failed to create batch stages: ${error.message}`);
			}

			return batchStages || [];
		} catch (error) {
			throw new Error(
				`Failed to create batch stages: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Activate a batch stage
	 */
	async activateBatchStage(batchStageId: string): Promise<BatchStage> {
		try {
			const { data: batchStage, error } = await this.supabase
				.from("batch_stages")
				.update({
					status: "active",
					started_at: new Date().toISOString(),
				})
				.eq("id", batchStageId)
				.select(`
					*,
					stages (
						name,
						description,
						duration_days,
						requirements
					)
				`)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Batch stage not found");
				}
				throw new Error(`Failed to activate batch stage: ${error.message}`);
			}

			return batchStage;
		} catch (error) {
			throw new Error(
				`Failed to activate batch stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Complete a batch stage
	 */
	async completeBatchStage(batchStageId: string): Promise<BatchStage> {
		try {
			const { data: batchStage, error } = await this.supabase
				.from("batch_stages")
				.update({
					status: "completed",
					completed_at: new Date().toISOString(),
				})
				.eq("id", batchStageId)
				.select(`
					*,
					stages (
						name,
						description,
						duration_days,
						requirements
					)
				`)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Batch stage not found");
				}
				throw new Error(`Failed to complete batch stage: ${error.message}`);
			}

			return batchStage;
		} catch (error) {
			throw new Error(
				`Failed to complete batch stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Update a batch stage
	 */
	async updateBatchStage(
		batchStageId: string,
		data: Partial<BatchStageUpdate>
	): Promise<BatchStage> {
		try {
			const { data: batchStage, error } = await this.supabase
				.from("batch_stages")
				.update(data)
				.eq("id", batchStageId)
				.select(`
					*,
					stages (
						name,
						description,
						duration_days,
						requirements
					)
				`)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("Batch stage not found");
				}
				throw new Error(`Failed to update batch stage: ${error.message}`);
			}

			return batchStage;
		} catch (error) {
			throw new Error(
				`Failed to update batch stage: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Check if stage exists
	 */
	async stageExists(stageId: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("stages")
				.select("id")
				.eq("id", stageId)
				.single();

			return !error && !!data;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Check if batch stage exists
	 */
	async batchStageExists(batchStageId: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("batch_stages")
				.select("id")
				.eq("id", batchStageId)
				.single();

			return !error && !!data;
		} catch (error) {
			return false;
		}
	}
}

import { getSupabaseAdmin } from "@/services/supabase";
import { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
type UserInvitation = Database["public"]["Tables"]["user_invitations"]["Row"];
type UserInvitationInsert = Database["public"]["Tables"]["user_invitations"]["Insert"];

export interface UserFilters {
	role?: string;
	status?: string;
	q?: string;
	page?: number;
	limit?: number;
}

export interface UserListResponse {
	users: Profile[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface CreateUserInvitationData {
	email: string;
	role: string;
}

export interface UpdateUserData {
	full_name?: string;
	role?: string;
	status?: string;
}

export class UsersService {
	private get supabase() {
		return getSupabaseAdmin();
	}

	/**
	 * List users with optional filters
	 */
	async listUsers(filters: UserFilters = {}): Promise<UserListResponse> {
		try {
			const {
				role,
				status,
				q,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("profiles").select("*", { count: "exact" });

			// Apply filters
			if (role) {
				query = query.eq("role", role);
			}
			if (status) {
				query = query.eq("status", status);
			}
			if (q) {
				query = query.or(
					`full_name.ilike.%${q}%,email.ilike.%${q}%`
				);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by created_at (newest first)
			query = query.order("created_at", { ascending: false });

			const { data: users, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch users: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				users: users || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list users: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get a single user by ID
	 */
	async getUserById(userId: string): Promise<Profile> {
		try {
			const { data: user, error } = await this.supabase
				.from("profiles")
				.select("*")
				.eq("id", userId)
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("User not found");
				}
				throw new Error(`Failed to fetch user: ${error.message}`);
			}

			return user;
		} catch (error) {
			throw new Error(
				`Failed to get user: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Create a new user invitation
	 */
	async createUserInvitation(
		data: CreateUserInvitationData,
		invitedBy: string
	): Promise<UserInvitation> {
		try {
			// Check if user already exists
			const { data: existingUser } = await this.supabase
				.from("profiles")
				.select("id")
				.eq("email", data.email)
				.single();

			if (existingUser) {
				throw new Error("User with this email already exists");
			}

			// Check if invitation already exists and is not expired
			const { data: existingInvitation } = await this.supabase
				.from("user_invitations")
				.select("id, expires_at")
				.eq("email", data.email)
				.gt("expires_at", new Date().toISOString())
				.single();

			if (existingInvitation) {
				throw new Error("Active invitation already exists for this email");
			}

			const invitationData: UserInvitationInsert = {
				email: data.email,
				token: crypto.randomUUID(),
				invited_by: invitedBy,
				expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
				status: "pending",
			};

			const { data: invitation, error } = await this.supabase
				.from("user_invitations")
				.insert(invitationData)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create invitation: ${error.message}`);
			}

			return invitation;
		} catch (error) {
			throw new Error(
				`Failed to create invitation: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Update an existing user
	 */
	async updateUser(
		userId: string,
		data: UpdateUserData
	): Promise<Profile> {
		try {
			const updateData: ProfileUpdate = {};

			// Only include fields that are provided
			if (data.full_name !== undefined) updateData.full_name = data.full_name;
			if (data.role !== undefined) updateData.role = data.role as Database["public"]["Enums"]["app_role"];
			if (data.status !== undefined) updateData.status = data.status;

			const { data: user, error } = await this.supabase
				.from("profiles")
				.update(updateData)
				.eq("id", userId)
				.select()
				.single();

			if (error) {
				if (error.code === "PGRST116") {
					throw new Error("User not found");
				}
				throw new Error(`Failed to update user: ${error.message}`);
			}

			return user;
		} catch (error) {
			throw new Error(
				`Failed to update user: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Get user invitations
	 */
	async getUserInvitations(filters: {
		status?: string;
		page?: number;
		limit?: number;
	} = {}): Promise<{
		invitations: UserInvitation[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}> {
		try {
			const {
				status,
				page = 1,
				limit = 20,
			} = filters;

			let query = this.supabase.from("user_invitations").select("*", { count: "exact" });

			// Apply filters
			if (status) {
				query = query.eq("status", status);
			}

			// Apply pagination
			const from = (page - 1) * limit;
			const to = from + limit - 1;
			query = query.range(from, to);

			// Order by created_at (newest first)
			query = query.order("created_at", { ascending: false });

			const { data: invitations, error, count } = await query;

			if (error) {
				throw new Error(`Failed to fetch invitations: ${error.message}`);
			}

			const total = count || 0;
			const totalPages = Math.ceil(total / limit);

			return {
				invitations: invitations || [],
				total,
				page,
				limit,
				totalPages,
			};
		} catch (error) {
			throw new Error(
				`Failed to list invitations: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		}
	}

	/**
	 * Check if user exists
	 */
	async userExists(userId: string): Promise<boolean> {
		try {
			const { data, error } = await this.supabase
				.from("profiles")
				.select("id")
				.eq("id", userId)
				.single();

			return !error && !!data;
		} catch (error) {
			return false;
		}
	}
}

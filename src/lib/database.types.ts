// Database types for Supabase
export type UserRole = 'superadmin' | 'admin' | 'normal';

export interface Profile {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    created_by: string | null;
    created_at: string;
    avatar_url: string | null;
}

export interface Team {
    id: string;
    name: string;
    description: string | null;
    institution: string | null;
    admin_id: string;
    created_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: 'leader' | 'member';
    joined_at: string;
}

// Amazon task types for tracking
export type AmazonTaskType = 'listing' | 'premium_a_plus' | 'basic_a_plus' | 'store_front' | 'brand_story' | 'color_variation' | 'mini_task';

export interface AmazonTaskItem {
    type: AmazonTaskType;
    quantity: number;
}

export interface Task {
    id: string;
    title: string;
    notes: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    created_by: string;
    assigned_to: string | null;
    team_id: string | null;
    project_id: string | null;
    order: number;
    subtasks: Subtask[];
    attachments: string[];
    // Amazon task tracking
    is_amazon: boolean;
    amazon_tasks: AmazonTaskItem[];
    created_at: string;
    completed_at: string | null;
}

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface Project {
    id: string;
    name: string;
    color: string;
    team_id: string | null;
    created_by: string;
    created_at: string;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
    team_id: string | null;
    created_by: string;
}

export interface TeamInvitation {
    id: string;
    team_id: string;
    code: string;
    created_by: string;
    expires_at: string | null;
    max_uses: number;
    uses: number;
    created_at: string;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    content: string;
    created_at: string;
    // Joined data
    user?: Profile;
}

export interface TaskRating {
    id: string;
    task_id: string;
    rated_by: string;
    rating: number; // 1-10
    comment?: string;
    created_at: string;
    // Joined data
    rater?: Profile;
}

// Points configuration for Amazon tasks
export const AMAZON_POINTS: Record<AmazonTaskType, number> = {
    listing: 1,
    premium_a_plus: 1,
    basic_a_plus: 1,
    store_front: 1,
    brand_story: 1,
    color_variation: 0.25, // 4 = 1 point
    mini_task: 0.167, // 6 = 1 point
};

export const AMAZON_TASK_LABELS: Record<AmazonTaskType, string> = {
    listing: 'Listing',
    premium_a_plus: 'Premium A+',
    basic_a_plus: 'Basic A+',
    store_front: 'Store Front',
    brand_story: 'Brand Story',
    color_variation: 'Color Variation',
    mini_task: 'Mini Task',
};

// Database schema type for Supabase client
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at'>;
                Update: Partial<Profile>;
            };
            teams: {
                Row: Team;
                Insert: Omit<Team, 'id' | 'created_at'>;
                Update: Partial<Team>;
            };
            team_members: {
                Row: TeamMember;
                Insert: Omit<TeamMember, 'id' | 'joined_at'>;
                Update: Partial<TeamMember>;
            };
            tasks: {
                Row: Task;
                Insert: Omit<Task, 'id' | 'created_at'>;
                Update: Partial<Task>;
            };
            projects: {
                Row: Project;
                Insert: Omit<Project, 'id' | 'created_at'>;
                Update: Partial<Project>;
            };
            tags: {
                Row: Tag;
                Insert: Omit<Tag, 'id'>;
                Update: Partial<Tag>;
            };
        };
    };
}

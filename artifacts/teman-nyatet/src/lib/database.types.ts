// TypeScript types for TemanNyatet Supabase schema
// Structured to match @supabase/supabase-js v2 GenericSchema constraints
//
// Note: notes, transactions, todos, and links tables exist in the initial
// Supabase migration but are NOT used — all app data lives in each user's
// private Google Spreadsheet. The types below (Note, Transaction, etc.) are
// kept for compatibility with the data hooks that use them as shapes for
// API responses from the api-server (which reads from Google Sheets).

export type SubscriptionStatus = 'pending' | 'active' | 'archived';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type TransactionType = 'income' | 'expense';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          avatar_url: string | null;
          subscription_status: SubscriptionStatus;
          subscription_plan: SubscriptionPlan | null;
          subscription_end: string | null;
          spreadsheet_id: string | null;
          template_version: string | null;
          google_refresh_token: string | null;
          last_sync_at: string | null;
          sync_status: 'unknown' | 'ok' | 'error' | 'repair_needed' | null;
          recovery_metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_plan?: SubscriptionPlan | null;
          subscription_end?: string | null;
          spreadsheet_id?: string | null;
          template_version?: string | null;
          google_refresh_token?: string | null;
          last_sync_at?: string | null;
          sync_status?: 'unknown' | 'ok' | 'error' | 'repair_needed' | null;
          recovery_metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          subscription_status?: SubscriptionStatus;
          subscription_plan?: SubscriptionPlan | null;
          subscription_end?: string | null;
          spreadsheet_id?: string | null;
          template_version?: string | null;
          google_refresh_token?: string | null;
          last_sync_at?: string | null;
          sync_status?: 'unknown' | 'ok' | 'error' | 'repair_needed' | null;
          recovery_metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // Legacy tables — exist in Supabase but data lives in Google Sheets.
      // Kept here so shared type imports don't break.
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          content: string;
          tags: string[];
          created_at: string;
          updated_at: string;
          position: number | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          content?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          position?: number | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          content?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
          position?: number | null;
          color?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          source: string;
          note: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          category: string;
          source: string;
          note?: string | null;
          date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: TransactionType;
          amount?: number;
          category?: string;
          source?: string;
          note?: string | null;
          date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          is_done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          is_done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          is_done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      links: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          url: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          url: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          url?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_status: SubscriptionStatus;
      subscription_plan: SubscriptionPlan;
      transaction_type: TransactionType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type Todo = Database['public']['Tables']['todos']['Row'];
export type Link = Database['public']['Tables']['links']['Row'];

// Insert types
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TodoInsert = Database['public']['Tables']['todos']['Insert'];
export type LinkInsert = Database['public']['Tables']['links']['Insert'];

// Update types
export type NoteUpdate = Database['public']['Tables']['notes']['Update'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];
export type TodoUpdate = Database['public']['Tables']['todos']['Update'];
export type LinkUpdate = Database['public']['Tables']['links']['Update'];

// Finance helpers
export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  type: TransactionType;
}

// Backward-compatible exports. New finance code should import these from the
// transaction domain module so schemas, defaults, and helpers stay together.
export {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
} from './transactions';

// src/lib/supabase/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: number
          customer_code: string
          customer_name: string
          sector_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_code: string
          customer_name: string
          sector_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_code?: string
          customer_name?: string
          sector_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          category_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          category_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          category_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: number
          brand_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          brand_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          brand_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: number
          product_code: string
          product_name: string
          category_id: number | null
          brand_id: number | null
          unit: string | null
          latest_cost: number | null
          latest_cost_with_tax: number | null
          latest_cost_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          product_code: string
          product_name: string
          category_id?: number | null
          brand_id?: number | null
          unit?: string | null
          latest_cost?: number | null
          latest_cost_with_tax?: number | null
          latest_cost_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          product_code?: string
          product_name?: string
          category_id?: number | null
          brand_id?: number | null
          unit?: string | null
          latest_cost?: number | null
          latest_cost_with_tax?: number | null
          latest_cost_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            referencedRelation: "brands"
            referencedColumns: ["id"]
          }
        ]
      }
      sales_personnel: {
        Row: {
          id: number
          personnel_code: string
          personnel_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          personnel_code: string
          personnel_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          personnel_code?: string
          personnel_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_transactions: {
        Row: {
          id: number
          transaction_type: string | null
          document_date: string
          customer_id: number | null
          product_id: number | null
          document_number: string | null
          invoice_number: string | null
          quantity: number
          unit_price: number
          unit_price_with_tax: number | null
          total_amount: number
          total_amount_with_tax: number | null
          tax_amount: number | null
          sales_status: string | null
          purchase_status: string | null
          pre_sale_unit_cost: number | null
          pre_sale_unit_cost_with_tax: number | null
          pre_sale_purchase_date: string | null
          pre_sale_unit_profit: number | null
          pre_sale_total_profit: number | null
          pre_sale_profit_percentage: number | null
          average_unit_cost: number | null
          average_unit_cost_with_tax: number | null
          avg_unit_profit: number | null
          avg_total_profit: number | null
          avg_profit_percentage: number | null
          current_unit_profit: number | null
          current_total_profit: number | null
          current_profit_percentage: number | null
          personnel_id: number | null
          notes: string | null
          additional_notes: string | null
          import_batch_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          transaction_type?: string | null
          document_date: string
          customer_id?: number | null
          product_id?: number | null
          document_number?: string | null
          invoice_number?: string | null
          quantity: number
          unit_price: number
          unit_price_with_tax?: number | null
          total_amount: number
          total_amount_with_tax?: number | null
          tax_amount?: number | null
          sales_status?: string | null
          purchase_status?: string | null
          pre_sale_unit_cost?: number | null
          pre_sale_unit_cost_with_tax?: number | null
          pre_sale_purchase_date?: string | null
          pre_sale_unit_profit?: number | null
          pre_sale_total_profit?: number | null
          pre_sale_profit_percentage?: number | null
          average_unit_cost?: number | null
          average_unit_cost_with_tax?: number | null
          avg_unit_profit?: number | null
          avg_total_profit?: number | null
          avg_profit_percentage?: number | null
          current_unit_profit?: number | null
          current_total_profit?: number | null
          current_profit_percentage?: number | null
          personnel_id?: number | null
          notes?: string | null
          additional_notes?: string | null
          import_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          transaction_type?: string | null
          document_date?: string
          customer_id?: number | null
          product_id?: number | null
          document_number?: string | null
          invoice_number?: string | null
          quantity?: number
          unit_price?: number
          unit_price_with_tax?: number | null
          total_amount?: number
          total_amount_with_tax?: number | null
          tax_amount?: number | null
          sales_status?: string | null
          purchase_status?: string | null
          pre_sale_unit_cost?: number | null
          pre_sale_unit_cost_with_tax?: number | null
          pre_sale_purchase_date?: string | null
          pre_sale_unit_profit?: number | null
          pre_sale_total_profit?: number | null
          pre_sale_profit_percentage?: number | null
          average_unit_cost?: number | null
          average_unit_cost_with_tax?: number | null
          avg_unit_profit?: number | null
          avg_total_profit?: number | null
          avg_profit_percentage?: number | null
          current_unit_profit?: number | null
          current_total_profit?: number | null
          current_profit_percentage?: number | null
          personnel_id?: number | null
          notes?: string | null
          additional_notes?: string | null
          import_batch_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_personnel_id_fkey"
            columns: ["personnel_id"]
            referencedRelation: "sales_personnel"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_customer_summaries: {
        Row: {
          id: number
          year: number
          month: number
          customer_id: number | null
          total_sales: number
          total_sales_with_tax: number | null
          total_profit: number | null
          total_profit_percentage: number | null
          transaction_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          year: number
          month: number
          customer_id?: number | null
          total_sales: number
          total_sales_with_tax?: number | null
          total_profit?: number | null
          total_profit_percentage?: number | null
          transaction_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          year?: number
          month?: number
          customer_id?: number | null
          total_sales?: number
          total_sales_with_tax?: number | null
          total_profit?: number | null
          total_profit_percentage?: number | null
          transaction_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_customer_summaries_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_category_summaries: {
        Row: {
          id: number
          year: number
          month: number
          customer_id: number | null
          category_id: number | null
          total_sales: number
          total_sales_with_tax: number | null
          total_profit: number | null
          total_profit_percentage: number | null
          transaction_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          year: number
          month: number
          customer_id?: number | null
          category_id?: number | null
          total_sales: number
          total_sales_with_tax?: number | null
          total_profit?: number | null
          total_profit_percentage?: number | null
          transaction_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          year?: number
          month?: number
          customer_id?: number | null
          category_id?: number | null
          total_sales?: number
          total_sales_with_tax?: number | null
          total_profit?: number | null
          total_profit_percentage?: number | null
          transaction_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_category_summaries_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_category_summaries_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_category_loss_analysis: {
        Row: {
          id: number
          customer_id: number | null
          category_id: number | null
          last_purchase_date: string | null
          consecutive_inactive_months: number | null
          average_monthly_purchase: number | null
          risk_level: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id?: number | null
          category_id?: number | null
          last_purchase_date?: string | null
          consecutive_inactive_months?: number | null
          average_monthly_purchase?: number | null
          risk_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number | null
          category_id?: number | null
          last_purchase_date?: string | null
          consecutive_inactive_months?: number | null
          average_monthly_purchase?: number | null
          risk_level?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_category_loss_analysis_customer_id_fkey"
            columns: ["customer_id"]
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_category_loss_analysis_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      import_history: {
        Row: {
          id: number
          filename: string
          import_date: string
          row_count: number | null
          successful: boolean | null
          error_message: string | null
          imported_by: string | null
          batch_id: string | null
        }
        Insert: {
          id?: number
          filename: string
          import_date?: string
          row_count?: number | null
          successful?: boolean | null
          error_message?: string | null
          imported_by?: string | null
          batch_id?: string | null
        }
        Update: {
          id?: number
          filename?: string
          import_date?: string
          row_count?: number | null
          successful?: boolean | null
          error_message?: string | null
          imported_by?: string | null
          batch_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Ana veri modelleri için tipler oluşturalım
export type Customer = Database['public']['Tables']['customers']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type SalesTransaction = Database['public']['Tables']['sales_transactions']['Row']
export type MonthlySummary = Database['public']['Tables']['monthly_customer_summaries']['Row']
export type CategorySummary = Database['public']['Tables']['monthly_category_summaries']['Row']
export type LossAnalysis = Database['public']['Tables']['customer_category_loss_analysis']['Row']
export type ImportHistory = Database['public']['Tables']['import_history']['Row']
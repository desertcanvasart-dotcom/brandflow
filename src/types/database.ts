export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Manual type definitions matching 001_initial_schema.sql
// Replace with generated types once Supabase is running:
// npx supabase gen types typescript --local > src/types/database.ts

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          stripe_customer_id: string | null
          is_disabled: boolean
          disabled_at: string | null
          disabled_reason: string | null
          default_task_duration_hours: number
          working_days: string[]
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          stripe_customer_id?: string | null
          is_disabled?: boolean
          disabled_at?: string | null
          disabled_reason?: string | null
          default_task_duration_hours?: number
          working_days?: string[]
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          stripe_customer_id?: string | null
          is_disabled?: boolean
          disabled_at?: string | null
          disabled_reason?: string | null
          default_task_duration_hours?: number
          working_days?: string[]
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          display_name: string | null
          avatar_url: string | null
          skills: string[]
          is_active: boolean
          department_id: string | null
          job_title: string | null
          timezone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          display_name?: string | null
          avatar_url?: string | null
          skills?: string[]
          is_active?: boolean
          department_id?: string | null
          job_title?: string | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          display_name?: string | null
          avatar_url?: string | null
          skills?: string[]
          is_active?: boolean
          department_id?: string | null
          job_title?: string | null
          timezone?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organization_members_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
        ]
      }
      invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          token: string
          invited_by: string
          status: 'pending' | 'accepted' | 'expired' | 'revoked'
          department_id: string | null
          job_title: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role?: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          token?: string
          invited_by: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          department_id?: string | null
          job_title?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
          token?: string
          invited_by?: string
          status?: 'pending' | 'accepted' | 'expired' | 'revoked'
          department_id?: string | null
          job_title?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invitations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      departments: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          color: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          color?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          color?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      brands: {
        Row: {
          id: string
          organization_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          website_url: string | null
          guidelines: Json
          colors: Json
          fonts: Json
          platforms: ('instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other')[]
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          website_url?: string | null
          guidelines?: Json
          colors?: Json
          fonts?: Json
          platforms?: ('instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other')[]
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          website_url?: string | null
          guidelines?: Json
          colors?: Json
          fonts?: Json
          platforms?: ('instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other')[]
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brands_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          project_type: 'content_ops' | 'web_build' | 'full_service'
          is_default: boolean
          stages: Json
          transitions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          project_type: 'content_ops' | 'web_build' | 'full_service'
          is_default?: boolean
          stages?: Json
          transitions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          project_type?: 'content_ops' | 'web_build' | 'full_service'
          is_default?: boolean
          stages?: Json
          transitions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_templates_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          brand_id: string
          workflow_template_id: string | null
          type: 'content_ops' | 'web_build' | 'full_service'
          name: string
          slug: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          start_date: string | null
          end_date: string | null
          settings: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id: string
          workflow_template_id?: string | null
          type: 'content_ops' | 'web_build' | 'full_service'
          name: string
          slug: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          start_date?: string | null
          end_date?: string | null
          settings?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string
          workflow_template_id?: string | null
          type?: 'content_ops' | 'web_build' | 'full_service'
          name?: string
          slug?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          start_date?: string | null
          end_date?: string | null
          settings?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_workflow_template_id_fkey'
            columns: ['workflow_template_id']
            isOneToOne: false
            referencedRelation: 'workflow_templates'
            referencedColumns: ['id']
          },
        ]
      }
      phases: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          sort_order: number
          status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
          start_date: string | null
          end_date: string | null
          milestone_name: string | null
          milestone_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          sort_order?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
          start_date?: string | null
          end_date?: string | null
          milestone_name?: string | null
          milestone_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          sort_order?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'skipped'
          start_date?: string | null
          end_date?: string | null
          milestone_name?: string | null
          milestone_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'phases_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          parent_task_id: string | null
          title: string
          description: string | null
          status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'client_review' | 'approved' | 'scheduled' | 'published' | 'blocked' | 'done'
          priority: number
          sort_order: number
          assignee_id: string | null
          reviewer_id: string | null
          start_date: string | null
          due_date: string | null
          estimated_hours: number | null
          actual_hours: number | null
          depends_on: string[]
          tags: string[]
          generation_reason: string | null
          source_brief_id: string | null
          template_id: string | null
          task_type: string | null
          service_type: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          parent_task_id?: string | null
          title: string
          description?: string | null
          status?: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'client_review' | 'approved' | 'scheduled' | 'published' | 'blocked' | 'done'
          priority?: number
          sort_order?: number
          assignee_id?: string | null
          reviewer_id?: string | null
          start_date?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          depends_on?: string[]
          tags?: string[]
          generation_reason?: string | null
          source_brief_id?: string | null
          template_id?: string | null
          task_type?: string | null
          service_type?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string | null
          parent_task_id?: string | null
          title?: string
          description?: string | null
          status?: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'client_review' | 'approved' | 'scheduled' | 'published' | 'blocked' | 'done'
          priority?: number
          sort_order?: number
          assignee_id?: string | null
          reviewer_id?: string | null
          start_date?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          depends_on?: string[]
          tags?: string[]
          generation_reason?: string | null
          source_brief_id?: string | null
          template_id?: string | null
          task_type?: string | null
          service_type?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_phase_id_fkey'
            columns: ['phase_id']
            isOneToOne: false
            referencedRelation: 'phases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_task_id_fkey'
            columns: ['parent_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      content_items: {
        Row: {
          id: string
          task_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          body: string | null
          media_urls: string[]
          hashtags: string[]
          scheduled_at: string | null
          published_at: string | null
          published_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          body?: string | null
          media_urls?: string[]
          hashtags?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          published_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          body?: string | null
          media_urls?: string[]
          hashtags?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          published_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'content_items_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      content_versions: {
        Row: {
          id: string
          content_item_id: string
          version_number: number
          body: string | null
          media_urls: string[]
          change_note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          content_item_id: string
          version_number: number
          body?: string | null
          media_urls?: string[]
          change_note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          content_item_id?: string
          version_number?: number
          body?: string | null
          media_urls?: string[]
          change_note?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'content_versions_content_item_id_fkey'
            columns: ['content_item_id']
            isOneToOne: false
            referencedRelation: 'content_items'
            referencedColumns: ['id']
          },
        ]
      }
      deliverables: {
        Row: {
          id: string
          task_id: string
          type: 'wireframe' | 'mockup' | 'prototype' | 'code' | 'document' | 'asset' | 'other'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          version: number
          status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          type?: 'wireframe' | 'mockup' | 'prototype' | 'code' | 'document' | 'asset' | 'other'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          version?: number
          status?: 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          type?: 'wireframe' | 'mockup' | 'prototype' | 'code' | 'document' | 'asset' | 'other'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          version?: number
          status?: 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deliverables_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      deliverable_versions: {
        Row: {
          id: string
          deliverable_id: string
          version_number: number
          file_url: string
          file_name: string | null
          file_size: number | null
          change_note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          deliverable_id: string
          version_number: number
          file_url: string
          file_name?: string | null
          file_size?: number | null
          change_note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          deliverable_id?: string
          version_number?: number
          file_url?: string
          file_name?: string | null
          file_size?: number | null
          change_note?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deliverable_versions_deliverable_id_fkey'
            columns: ['deliverable_id']
            isOneToOne: false
            referencedRelation: 'deliverables'
            referencedColumns: ['id']
          },
        ]
      }
      comments: {
        Row: {
          id: string
          task_id: string
          parent_id: string | null
          author_id: string
          body: string
          is_internal: boolean
          is_resolved: boolean
          attachments: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          parent_id?: string | null
          author_id: string
          body: string
          is_internal?: boolean
          is_resolved?: boolean
          attachments?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          parent_id?: string | null
          author_id?: string
          body?: string
          is_internal?: boolean
          is_resolved?: boolean
          attachments?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comments_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'comments'
            referencedColumns: ['id']
          },
        ]
      }
      assets: {
        Row: {
          id: string
          organization_id: string
          brand_id: string | null
          project_id: string | null
          uploaded_by: string
          type: 'logo' | 'image' | 'video' | 'document' | 'font' | 'icon' | 'template' | 'other'
          name: string
          file_url: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          thumbnail_url: string | null
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id?: string | null
          project_id?: string | null
          uploaded_by: string
          type?: 'logo' | 'image' | 'video' | 'document' | 'font' | 'icon' | 'template' | 'other'
          name: string
          file_url: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string | null
          project_id?: string | null
          uploaded_by?: string
          type?: 'logo' | 'image' | 'video' | 'document' | 'font' | 'icon' | 'template' | 'other'
          name?: string
          file_url?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assets_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assets_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assets_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      client_access: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          permissions?: Json
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          permissions?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'client_access_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      // ── Phase 2 Tables ──
      meetings: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          brand_id: string | null
          title: string
          description: string | null
          scheduled_at: string
          duration_minutes: number
          meeting_type: 'internal' | 'client' | 'review'
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          livekit_room_id: string | null
          recording_url: string | null
          transcript: string | null
          summary: string | null
          action_items: Json
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          brand_id?: string | null
          title: string
          description?: string | null
          scheduled_at: string
          duration_minutes?: number
          meeting_type?: 'internal' | 'client' | 'review'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          livekit_room_id?: string | null
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          action_items?: Json
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          brand_id?: string | null
          title?: string
          description?: string | null
          scheduled_at?: string
          duration_minutes?: number
          meeting_type?: 'internal' | 'client' | 'review'
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          livekit_room_id?: string | null
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          action_items?: Json
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meetings_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meetings_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meetings_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_participants: {
        Row: {
          id: string
          meeting_id: string
          user_id: string
          role: 'host' | 'participant' | 'viewer'
          joined_at: string | null
          left_at: string | null
        }
        Insert: {
          id?: string
          meeting_id: string
          user_id: string
          role?: 'host' | 'participant' | 'viewer'
          joined_at?: string | null
          left_at?: string | null
        }
        Update: {
          id?: string
          meeting_id?: string
          user_id?: string
          role?: 'host' | 'participant' | 'viewer'
          joined_at?: string | null
          left_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_participants_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
        ]
      }
      briefs: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          task_id: string | null
          type: 'content_brief' | 'project_requirements' | 'change_request'
          title: string
          body: Json
          generated_by_ai: boolean
          source_meeting_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          task_id?: string | null
          type?: 'content_brief' | 'project_requirements' | 'change_request'
          title?: string
          body?: Json
          generated_by_ai?: boolean
          source_meeting_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          task_id?: string | null
          type?: 'content_brief' | 'project_requirements' | 'change_request'
          title?: string
          body?: Json
          generated_by_ai?: boolean
          source_meeting_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'briefs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'briefs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'briefs_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'briefs_source_meeting_id_fkey'
            columns: ['source_meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
        ]
      }
      annotations: {
        Row: {
          id: string
          deliverable_id: string
          author_id: string
          type: 'pin' | 'rectangle' | 'arrow'
          x_percent: number
          y_percent: number
          width_percent: number | null
          height_percent: number | null
          body: string
          is_resolved: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deliverable_id: string
          author_id: string
          type?: 'pin' | 'rectangle' | 'arrow'
          x_percent: number
          y_percent: number
          width_percent?: number | null
          height_percent?: number | null
          body: string
          is_resolved?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deliverable_id?: string
          author_id?: string
          type?: 'pin' | 'rectangle' | 'arrow'
          x_percent?: number
          y_percent?: number
          width_percent?: number | null
          height_percent?: number | null
          body?: string
          is_resolved?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'annotations_deliverable_id_fkey'
            columns: ['deliverable_id']
            isOneToOne: false
            referencedRelation: 'deliverables'
            referencedColumns: ['id']
          },
        ]
      }
      brand_contacts: {
        Row: {
          id: string
          brand_id: string
          name: string
          email: string | null
          phone: string | null
          job_title: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          job_title?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brand_contacts_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      // ── Phase 3 Tables ──
      notifications: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          type: string
          title: string
          body: string | null
          link: string | null
          is_read: boolean
          metadata: Json
          group_key: string | null
          is_archived: boolean
          archived_at: string | null
          action_type: string | null
          action_payload: Json | null
          action_taken: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          type: string
          title: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          metadata?: Json
          group_key?: string | null
          is_archived?: boolean
          archived_at?: string | null
          action_type?: string | null
          action_payload?: Json | null
          action_taken?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string | null
          link?: string | null
          is_read?: boolean
          metadata?: Json
          group_key?: string | null
          is_archived?: boolean
          archived_at?: string | null
          action_type?: string | null
          action_payload?: Json | null
          action_taken?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          event_type: string
          in_app: boolean
          email: boolean
          push: boolean
          slack: boolean
          webhook: boolean
          digest_frequency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          event_type: string
          in_app?: boolean
          email?: boolean
          push?: boolean
          slack?: boolean
          webhook?: boolean
          digest_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          event_type?: string
          in_app?: boolean
          email?: boolean
          push?: boolean
          slack?: boolean
          webhook?: boolean
          digest_frequency?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notification_quiet_hours: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          is_enabled: boolean
          start_time: string
          end_time: string
          timezone: string
          active_days: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          is_enabled?: boolean
          start_time?: string
          end_time?: string
          timezone?: string
          active_days?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          is_enabled?: boolean
          start_time?: string
          end_time?: string
          timezone?: string
          active_days?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_quiet_hours_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      organization_integrations: {
        Row: {
          id: string
          organization_id: string
          type: string
          name: string
          config: Json
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          type: string
          name: string
          config?: Json
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          type?: string
          name?: string
          config?: Json
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_integrations_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      notification_events: {
        Row: {
          id: string
          notification_id: string
          channel: string
          event: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          notification_id: string
          channel: string
          event: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          notification_id?: string
          channel?: string
          event?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_events_notification_id_fkey'
            columns: ['notification_id']
            isOneToOne: false
            referencedRelation: 'notifications'
            referencedColumns: ['id']
          },
        ]
      }
      notification_queue: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          notification_id: string
          channels: string[]
          deliver_after: string
          is_processed: boolean
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          notification_id: string
          channels: string[]
          deliver_after: string
          is_processed?: boolean
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          notification_id?: string
          channels?: string[]
          deliver_after?: string
          is_processed?: boolean
          processed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_queue_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_queue_notification_id_fkey'
            columns: ['notification_id']
            isOneToOne: false
            referencedRelation: 'notifications'
            referencedColumns: ['id']
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          organization_id: string
          actor_id: string
          action: string
          entity_type: string
          entity_id: string
          metadata: Json
          project_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          actor_id: string
          action: string
          entity_type: string
          entity_id: string
          metadata?: Json
          project_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          actor_id?: string
          action?: string
          entity_type?: string
          entity_id?: string
          metadata?: Json
          project_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_logs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      automation_rules: {
        Row: {
          id: string
          organization_id: string
          name: string
          is_active: boolean
          rule_type: string
          conditions: Json
          action: Json
          priority: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          is_active?: boolean
          rule_type: string
          conditions?: Json
          action?: Json
          priority?: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          is_active?: boolean
          rule_type?: string
          conditions?: Json
          action?: Json
          priority?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'automation_rules_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      figma_connections: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          figma_user_id: string
          figma_user_name: string | null
          figma_email: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          figma_team_ids: string[]
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          figma_user_id: string
          figma_user_name?: string | null
          figma_email?: string | null
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          figma_team_ids?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          figma_user_id?: string
          figma_user_name?: string | null
          figma_email?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          figma_team_ids?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'figma_connections_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_subscription_id: string
          plan: 'starter' | 'pro' | 'agency'
          status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused'
          seats: number
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_subscription_id: string
          plan?: 'starter' | 'pro' | 'agency'
          status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused'
          seats?: number
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_subscription_id?: string
          plan?: 'starter' | 'pro' | 'agency'
          status?: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid' | 'paused'
          seats?: number
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: true
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      brand_strategies: {
        Row: {
          id: string
          organization_id: string
          brand_id: string
          content_pillars: Json
          audience_personas: Json
          tone_profiles: Json
          campaign_objectives: Json
          competitive_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id: string
          content_pillars?: Json
          audience_personas?: Json
          tone_profiles?: Json
          campaign_objectives?: Json
          competitive_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string
          content_pillars?: Json
          audience_personas?: Json
          tone_profiles?: Json
          campaign_objectives?: Json
          competitive_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'brand_strategies_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'brand_strategies_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: true
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      ai_outputs: {
        Row: {
          id: string
          organization_id: string
          brand_id: string | null
          agent_type: 'ad_copy' | 'seo_research' | 'performance_report' | 'competitor_analysis' | 'cta_suggestion'
          status: 'generated' | 'saved' | 'discarded' | 'used'
          input_summary: string | null
          output_text: string
          rating: number | null
          user_id: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id?: string | null
          agent_type: 'ad_copy' | 'seo_research' | 'performance_report' | 'competitor_analysis' | 'cta_suggestion'
          status?: 'generated' | 'saved' | 'discarded' | 'used'
          input_summary?: string | null
          output_text: string
          rating?: number | null
          user_id: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string | null
          agent_type?: 'ad_copy' | 'seo_research' | 'performance_report' | 'competitor_analysis' | 'cta_suggestion'
          status?: 'generated' | 'saved' | 'discarded' | 'used'
          input_summary?: string | null
          output_text?: string
          rating?: number | null
          user_id?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_outputs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ai_outputs_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      embeddings: {
        Row: {
          id: string
          organization_id: string
          source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment' | 'document'
          source_id: string
          chunk_index: number
          chunk_text: string
          embedding: number[]
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment' | 'document'
          source_id: string
          chunk_index?: number
          chunk_text: string
          embedding: number[]
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          source_type?: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment' | 'document'
          source_id?: string
          chunk_index?: number
          chunk_text?: string
          embedding?: number[]
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'embeddings_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      platform_admins: {
        Row: {
          id: string
          user_id: string
          granted_by: string | null
          granted_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          granted_by?: string | null
          granted_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          granted_by?: string | null
          granted_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      project_intake: {
        Row: {
          id: string
          project_id: string
          organization_id: string
          meeting_id: string | null
          client_name: string | null
          company_name: string | null
          industry: string | null
          goals: Json
          services_requested: string[]
          target_audience: Json
          competitors: Json
          budget_range: string | null
          timeline: string | null
          start_date: string | null
          pain_points: Json
          existing_assets: Json
          raw_extraction: Json | null
          confidence: 'high' | 'medium' | 'low'
          status: 'draft' | 'reviewed' | 'approved'
          extracted_by: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          organization_id: string
          meeting_id?: string | null
          client_name?: string | null
          company_name?: string | null
          industry?: string | null
          goals?: Json
          services_requested?: string[]
          target_audience?: Json
          competitors?: Json
          budget_range?: string | null
          timeline?: string | null
          start_date?: string | null
          pain_points?: Json
          existing_assets?: Json
          raw_extraction?: Json | null
          confidence?: 'high' | 'medium' | 'low'
          status?: 'draft' | 'reviewed' | 'approved'
          extracted_by?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          organization_id?: string
          meeting_id?: string | null
          client_name?: string | null
          company_name?: string | null
          industry?: string | null
          goals?: Json
          services_requested?: string[]
          target_audience?: Json
          competitors?: Json
          budget_range?: string | null
          timeline?: string | null
          start_date?: string | null
          pain_points?: Json
          existing_assets?: Json
          raw_extraction?: Json | null
          confidence?: 'high' | 'medium' | 'low'
          status?: 'draft' | 'reviewed' | 'approved'
          extracted_by?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_briefs: {
        Row: {
          id: string
          intake_id: string | null
          project_id: string
          organization_id: string
          service_type: string
          title: string | null
          overview: string | null
          objectives: Json
          deliverables: Json
          timeline: Json
          requirements: Json
          kpis: Json
          notes: string | null
          status: 'draft' | 'in_review' | 'approved' | 'active' | 'complete'
          generated_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          intake_id?: string | null
          project_id: string
          organization_id: string
          service_type: string
          title?: string | null
          overview?: string | null
          objectives?: Json
          deliverables?: Json
          timeline?: Json
          requirements?: Json
          kpis?: Json
          notes?: string | null
          status?: 'draft' | 'in_review' | 'approved' | 'active' | 'complete'
          generated_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          intake_id?: string | null
          project_id?: string
          organization_id?: string
          service_type?: string
          title?: string | null
          overview?: string | null
          objectives?: Json
          deliverables?: Json
          timeline?: Json
          requirements?: Json
          kpis?: Json
          notes?: string | null
          status?: 'draft' | 'in_review' | 'approved' | 'active' | 'complete'
          generated_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_generation_log: {
        Row: {
          id: string
          project_id: string | null
          brief_id: string | null
          organization_id: string | null
          service_type: string | null
          full_ai_response: Json | null
          included_tasks: Json | null
          excluded_tasks: Json | null
          generated_at: string
          generated_by: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          brief_id?: string | null
          organization_id?: string | null
          service_type?: string | null
          full_ai_response?: Json | null
          included_tasks?: Json | null
          excluded_tasks?: Json | null
          generated_at?: string
          generated_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          brief_id?: string | null
          organization_id?: string | null
          service_type?: string | null
          full_ai_response?: Json | null
          included_tasks?: Json | null
          excluded_tasks?: Json | null
          generated_at?: string
          generated_by?: string | null
        }
        Relationships: []
      }
      meeting_agenda_templates: {
        Row: {
          id: string
          organization_id: string
          name: string
          service_types: string[]
          sections: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          service_types?: string[]
          sections?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          service_types?: string[]
          sections?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          id: string
          service_type: string
          phase_name: string
          task_name: string
          type: string | null
          estimated_hours: number | null
          description: string | null
          is_default: boolean
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          service_type: string
          phase_name: string
          task_name: string
          type?: string | null
          estimated_hours?: number | null
          description?: string | null
          is_default?: boolean
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          service_type?: string
          phase_name?: string
          task_name?: string
          type?: string | null
          estimated_hours?: number | null
          description?: string | null
          is_default?: boolean
          organization_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      knowledge_base_documents: {
        Row: {
          id: string
          organization_id: string
          brand_id: string | null
          title: string
          description: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          extracted_text: string | null
          word_count: number
          embedding_status: 'processing' | 'ready' | 'failed' | 'no_text'
          source_type: 'uploaded_file' | 'pasted_text' | 'url_import' | 'brand_guidelines' | 'sop' | 'text_note'
          error_message: string | null
          uploaded_by: string
          category: string
          knowledge_scope: 'agency' | 'brand' | 'project'
          project_id: string | null
          source_url: string | null
          chunk_count: number
          content_type: string | null
          structured_data: Json
          auto_fill_source: string | null
          auto_fill_source_url: string | null
          current_version: number
          last_edited_by: string | null
          last_edited_at: string | null
          is_public: boolean
          public_slug: string | null
          public_expires_at: string | null
          public_password_hash: string | null
          public_view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id?: string | null
          title: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          extracted_text?: string | null
          word_count?: number
          embedding_status?: 'processing' | 'ready' | 'failed' | 'no_text'
          source_type?: 'uploaded_file' | 'pasted_text' | 'url_import' | 'brand_guidelines' | 'sop' | 'text_note'
          error_message?: string | null
          uploaded_by: string
          category?: string
          knowledge_scope?: 'agency' | 'brand' | 'project'
          project_id?: string | null
          source_url?: string | null
          chunk_count?: number
          content_type?: string | null
          structured_data?: Json
          auto_fill_source?: string | null
          auto_fill_source_url?: string | null
          current_version?: number
          last_edited_by?: string | null
          last_edited_at?: string | null
          is_public?: boolean
          public_slug?: string | null
          public_expires_at?: string | null
          public_password_hash?: string | null
          public_view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string | null
          title?: string
          description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          extracted_text?: string | null
          word_count?: number
          embedding_status?: 'processing' | 'ready' | 'failed' | 'no_text'
          source_type?: 'uploaded_file' | 'pasted_text' | 'url_import' | 'brand_guidelines' | 'sop' | 'text_note'
          error_message?: string | null
          uploaded_by?: string
          category?: string
          knowledge_scope?: 'agency' | 'brand' | 'project'
          project_id?: string | null
          source_url?: string | null
          chunk_count?: number
          content_type?: string | null
          structured_data?: Json
          auto_fill_source?: string | null
          auto_fill_source_url?: string | null
          current_version?: number
          last_edited_by?: string | null
          last_edited_at?: string | null
          is_public?: boolean
          public_slug?: string | null
          public_expires_at?: string | null
          public_password_hash?: string | null
          public_view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'knowledge_base_documents_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'knowledge_base_documents_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      hubspot_connections: {
        Row: {
          id: string
          organization_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          portal_id: string
          connected_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          access_token: string
          refresh_token: string
          expires_at: string
          portal_id: string
          connected_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          portal_id?: string
          connected_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      knowledge_document_versions: {
        Row: {
          id: string
          document_id: string
          organization_id: string
          version_number: number
          title: string
          structured_data: Json
          extracted_text: string | null
          changed_by: string | null
          change_summary: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          organization_id: string
          version_number: number
          title: string
          structured_data?: Json
          extracted_text?: string | null
          changed_by?: string | null
          change_summary?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          organization_id?: string
          version_number?: number
          title?: string
          structured_data?: Json
          extracted_text?: string | null
          changed_by?: string | null
          change_summary?: string | null
          created_at?: string
        }
        Relationships: []
      }
      kb_document_locks: {
        Row: {
          document_id: string
          field_name: string
          locked_by: string
          locked_at: string
          expires_at: string
        }
        Insert: {
          document_id: string
          field_name: string
          locked_by: string
          locked_at?: string
          expires_at?: string
        }
        Update: {
          document_id?: string
          field_name?: string
          locked_by?: string
          locked_at?: string
          expires_at?: string
        }
        Relationships: []
      }
      webhook_delivery_logs: {
        Row: {
          id: string
          organization_id: string
          integration_id: string
          event_type: string
          payload: Json
          status_code: number | null
          response_time_ms: number | null
          response_body: string | null
          error_message: string | null
          attempt_number: number
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          integration_id: string
          event_type: string
          payload?: Json
          status_code?: number | null
          response_time_ms?: number | null
          response_body?: string | null
          error_message?: string | null
          attempt_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          integration_id?: string
          event_type?: string
          payload?: Json
          status_code?: number | null
          response_time_ms?: number | null
          response_body?: string | null
          error_message?: string | null
          attempt_number?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'webhook_delivery_logs_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'webhook_delivery_logs_integration_id_fkey'
            columns: ['integration_id']
            isOneToOne: false
            referencedRelation: 'organization_integrations'
            referencedColumns: ['id']
          },
        ]
      }
      api_keys: {
        Row: {
          id: string
          organization_id: string
          created_by: string
          name: string
          key_prefix: string
          key_hash: string
          last_used_at: string | null
          is_revoked: boolean
          revoked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          created_by: string
          name: string
          key_prefix: string
          key_hash: string
          last_used_at?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          created_by?: string
          name?: string
          key_prefix?: string
          key_hash?: string
          last_used_at?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'api_keys_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      email_connections: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          provider: string
          email_address: string
          display_name: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          sync_cursor: string | null
          last_synced_at: string | null
          watch_expiry: string | null
          watch_resource_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          provider: string
          email_address: string
          display_name?: string | null
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          sync_cursor?: string | null
          last_synced_at?: string | null
          watch_expiry?: string | null
          watch_resource_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          provider?: string
          email_address?: string
          display_name?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          sync_cursor?: string | null
          last_synced_at?: string | null
          watch_expiry?: string | null
          watch_resource_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_connections_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      email_threads: {
        Row: {
          id: string
          organization_id: string
          connection_id: string
          project_id: string | null
          brand_id: string | null
          provider_thread_id: string
          subject: string
          snippet: string | null
          participants: string[]
          last_message_at: string
          message_count: number
          is_read: boolean
          is_starred: boolean
          is_archived: boolean
          linked_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          connection_id: string
          project_id?: string | null
          brand_id?: string | null
          provider_thread_id: string
          subject: string
          snippet?: string | null
          participants?: string[]
          last_message_at: string
          message_count?: number
          is_read?: boolean
          is_starred?: boolean
          is_archived?: boolean
          linked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          connection_id?: string
          project_id?: string | null
          brand_id?: string | null
          provider_thread_id?: string
          subject?: string
          snippet?: string | null
          participants?: string[]
          last_message_at?: string
          message_count?: number
          is_read?: boolean
          is_starred?: boolean
          is_archived?: boolean
          linked_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_threads_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_threads_connection_id_fkey'
            columns: ['connection_id']
            isOneToOne: false
            referencedRelation: 'email_connections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'email_threads_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      email_messages: {
        Row: {
          id: string
          thread_id: string
          provider_message_id: string
          from_address: string
          from_name: string | null
          to_addresses: string[]
          cc_addresses: string[]
          bcc_addresses: string[]
          subject: string | null
          body_html: string | null
          body_text: string | null
          sent_at: string
          is_outbound: boolean
          headers: Json
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          provider_message_id: string
          from_address: string
          from_name?: string | null
          to_addresses?: string[]
          cc_addresses?: string[]
          bcc_addresses?: string[]
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          sent_at: string
          is_outbound?: boolean
          headers?: Json
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          provider_message_id?: string
          from_address?: string
          from_name?: string | null
          to_addresses?: string[]
          cc_addresses?: string[]
          bcc_addresses?: string[]
          subject?: string | null
          body_html?: string | null
          body_text?: string | null
          sent_at?: string
          is_outbound?: boolean
          headers?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_messages_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'email_threads'
            referencedColumns: ['id']
          },
        ]
      }
      email_attachments: {
        Row: {
          id: string
          message_id: string
          file_name: string
          content_type: string | null
          size_bytes: number | null
          storage_url: string | null
          provider_attachment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          content_type?: string | null
          size_bytes?: number | null
          storage_url?: string | null
          provider_attachment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          content_type?: string | null
          size_bytes?: number | null
          storage_url?: string | null
          provider_attachment_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_attachments_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'email_messages'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_rooms: {
        Row: {
          id: string
          organization_id: string
          project_id: string
          slug: string
          name: string
          livekit_room_id: string
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id: string
          slug: string
          name: string
          livekit_room_id: string
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string
          slug?: string
          name?: string
          livekit_room_id?: string
          is_active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_rooms_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_rooms_project_id_fkey'
            columns: ['project_id']
            isOneToOne: true
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      meeting_sessions: {
        Row: {
          id: string
          room_id: string
          meeting_id: string | null
          title: string | null
          started_at: string
          ended_at: string | null
          duration_seconds: number | null
          recording_url: string | null
          transcript_text: string | null
          transcript_segments: Json
          summary: string | null
          action_items: Json
          notes: string | null
          source: string
          external_meeting_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          meeting_id?: string | null
          title?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          recording_url?: string | null
          transcript_text?: string | null
          transcript_segments?: Json
          summary?: string | null
          action_items?: Json
          notes?: string | null
          source?: string
          external_meeting_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          meeting_id?: string | null
          title?: string | null
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number | null
          recording_url?: string | null
          transcript_text?: string | null
          transcript_segments?: Json
          summary?: string | null
          action_items?: Json
          notes?: string | null
          source?: string
          external_meeting_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_sessions_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'meeting_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_sessions_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
        ]
      }
      session_participants: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          guest_name: string | null
          guest_email: string | null
          role: string
          identity: string
          joined_at: string | null
          left_at: string | null
          is_present: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          guest_name?: string | null
          guest_email?: string | null
          role?: string
          identity: string
          joined_at?: string | null
          left_at?: string | null
          is_present?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          guest_name?: string | null
          guest_email?: string | null
          role?: string
          identity?: string
          joined_at?: string | null
          left_at?: string | null
          is_present?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_participants_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'meeting_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_events: {
        Row: {
          id: string
          organization_id: string
          meeting_id: string | null
          room_id: string | null
          title: string
          description: string | null
          starts_at: string
          ends_at: string
          is_all_day: boolean
          location: string | null
          color: string | null
          recurrence_rule: string | null
          google_event_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          meeting_id?: string | null
          room_id?: string | null
          title: string
          description?: string | null
          starts_at: string
          ends_at: string
          is_all_day?: boolean
          location?: string | null
          color?: string | null
          recurrence_rule?: string | null
          google_event_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          meeting_id?: string | null
          room_id?: string | null
          title?: string
          description?: string | null
          starts_at?: string
          ends_at?: string
          is_all_day?: boolean
          location?: string | null
          color?: string | null
          recurrence_rule?: string | null
          google_event_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_events_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'meetings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'calendar_events_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'meeting_rooms'
            referencedColumns: ['id']
          },
        ]
      }
      calendar_event_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          email: string | null
          name: string | null
          status: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          email?: string | null
          name?: string | null
          status?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          email?: string | null
          name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_event_attendees_event_id_fkey'
            columns: ['event_id']
            isOneToOne: false
            referencedRelation: 'calendar_events'
            referencedColumns: ['id']
          },
        ]
      }
      transcript_chat_messages: {
        Row: {
          id: string
          organization_id: string
          session_id: string | null
          project_id: string | null
          user_id: string
          role: string
          content: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          session_id?: string | null
          project_id?: string | null
          user_id: string
          role: string
          content: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          session_id?: string | null
          project_id?: string | null
          user_id?: string
          role?: string
          content?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transcript_chat_messages_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transcript_chat_messages_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'meeting_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transcript_chat_messages_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      google_calendar_connections: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          email_address: string
          display_name: string | null
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          sync_token: string | null
          last_synced_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          email_address: string
          display_name?: string | null
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          sync_token?: string | null
          last_synced_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          email_address?: string
          display_name?: string | null
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          sync_token?: string | null
          last_synced_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'google_calendar_connections_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
        ]
      }
      channels: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          name: string
          type: 'project' | 'direct' | 'general' | 'announcement'
          created_by: string
          created_at: string
          updated_at: string
          pinned_message_ids: string[]
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          name: string
          type?: 'project' | 'direct' | 'general' | 'announcement'
          created_by: string
          created_at?: string
          updated_at?: string
          pinned_message_ids?: string[]
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string | null
          name?: string
          type?: 'project' | 'direct' | 'general' | 'announcement'
          created_by?: string
          created_at?: string
          updated_at?: string
          pinned_message_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'channels_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'channels_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      project_decisions: {
        Row: {
          id: string
          organization_id: string
          project_id: string
          message_id: string
          channel_id: string
          content: string
          marked_by: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id: string
          message_id: string
          channel_id: string
          content: string
          marked_by: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          project_id?: string
          message_id?: string
          channel_id?: string
          content?: string
          marked_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_decisions_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_decisions_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_decisions_message_id_fkey'
            columns: ['message_id']
            isOneToOne: true
            referencedRelation: 'channel_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_decisions_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
      channel_messages: {
        Row: {
          id: string
          channel_id: string
          user_id: string | null
          content: string
          attachments: Json
          mentions: string[]
          is_edited: boolean
          parent_message_id: string | null
          reply_count: number
          last_reply_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id?: string | null
          content: string
          attachments?: Json
          mentions?: string[]
          is_edited?: boolean
          parent_message_id?: string | null
          reply_count?: number
          last_reply_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string | null
          content?: string
          attachments?: Json
          mentions?: string[]
          is_edited?: boolean
          parent_message_id?: string | null
          reply_count?: number
          last_reply_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_messages_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
      unread_cursors: {
        Row: {
          user_id: string
          channel_id: string
          last_read_at: string
        }
        Insert: {
          user_id: string
          channel_id: string
          last_read_at?: string
        }
        Update: {
          user_id?: string
          channel_id?: string
          last_read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'unread_cursors_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'channel_messages'
            referencedColumns: ['id']
          },
        ]
      }
      channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'channel_members_channel_id_fkey'
            columns: ['channel_id']
            isOneToOne: false
            referencedRelation: 'channels'
            referencedColumns: ['id']
          },
        ]
      }
    }
      social_connections: {
        Row: {
          id: string
          organization_id: string
          brand_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
          platform_user_id: string
          platform_user_name: string | null
          platform_page_id: string | null
          platform_page_name: string | null
          platform_page_url: string | null
          page_access_token: string | null
          scopes: string[]
          connected_by: string | null
          metadata: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          access_token: string
          refresh_token?: string | null
          token_expires_at?: string | null
          platform_user_id: string
          platform_user_name?: string | null
          platform_page_id?: string | null
          platform_page_name?: string | null
          platform_page_url?: string | null
          page_access_token?: string | null
          scopes?: string[]
          connected_by?: string | null
          metadata?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          access_token?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          platform_user_id?: string
          platform_user_name?: string | null
          platform_page_id?: string | null
          platform_page_name?: string | null
          platform_page_url?: string | null
          page_access_token?: string | null
          scopes?: string[]
          connected_by?: string | null
          metadata?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'social_connections_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'social_connections_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
        ]
      }
      publish_log: {
        Row: {
          id: string
          organization_id: string
          content_item_id: string
          social_connection_id: string | null
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          status: string
          platform_post_id: string | null
          platform_post_url: string | null
          error_message: string | null
          error_code: string | null
          retry_count: number
          metadata: Json
          attempted_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          content_item_id: string
          social_connection_id?: string | null
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          status?: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          error_message?: string | null
          error_code?: string | null
          retry_count?: number
          metadata?: Json
          attempted_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          content_item_id?: string
          social_connection_id?: string | null
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
          status?: string
          platform_post_id?: string | null
          platform_post_url?: string | null
          error_message?: string | null
          error_code?: string | null
          retry_count?: number
          metadata?: Json
          attempted_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'publish_log_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'publish_log_content_item_id_fkey'
            columns: ['content_item_id']
            isOneToOne: false
            referencedRelation: 'content_items'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
      project_type: 'content_ops' | 'web_build' | 'full_service'
      project_status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
      task_status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'client_review' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'blocked' | 'done'
      phase_status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
      content_platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'blog' | 'newsletter' | 'other'
      deliverable_type: 'wireframe' | 'mockup' | 'prototype' | 'code' | 'document' | 'asset' | 'other'
      deliverable_status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'final'
      asset_type: 'logo' | 'image' | 'video' | 'document' | 'font' | 'icon' | 'template' | 'other'
      invite_status: 'pending' | 'accepted' | 'expired' | 'revoked'
      meeting_type: 'internal' | 'client' | 'review'
      meeting_status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
      meeting_participant_role: 'host' | 'participant' | 'viewer'
      brief_type: 'content_brief' | 'project_requirements' | 'change_request'
      annotation_type: 'pin' | 'rectangle' | 'arrow'
      embedding_source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment' | 'document' | 'document'
      ai_output_type: 'ad_copy' | 'seo_research' | 'performance_report' | 'competitor_analysis' | 'cta_suggestion'
      ai_output_status: 'generated' | 'saved' | 'discarded' | 'used'
      service_type: 'website' | 'seo' | 'content' | 'social' | 'paid_ads' | 'email' | 'branding' | 'cro' | 'analytics' | 'strategy'
      intake_status: 'draft' | 'reviewed' | 'approved'
      brief_status: 'draft' | 'in_review' | 'approved' | 'active' | 'complete'
      intake_confidence: 'high' | 'medium' | 'low'
      channel_type: 'project' | 'direct' | 'general' | 'announcement'
    }
    CompositeTypes: Record<string, never>
  }
}

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
      embeddings: {
        Row: {
          id: string
          organization_id: string
          source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment'
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
          source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment'
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
          source_type?: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment'
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'admin' | 'manager' | 'creator' | 'developer' | 'viewer' | 'client'
      project_type: 'content_ops' | 'web_build' | 'full_service'
      project_status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
      task_status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'client_review' | 'approved' | 'scheduled' | 'published' | 'blocked' | 'done'
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
      embedding_source_type: 'brand_guidelines' | 'meeting_transcript' | 'content_item' | 'brief' | 'comment'
    }
    CompositeTypes: Record<string, never>
  }
}

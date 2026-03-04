import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, orgProcedure, managerProcedure } from '../init'
import type { Database } from '@/types/database'

type AutomationRuleRow = Database['public']['Tables']['automation_rules']['Row']

const conditionsSchema = z.object({
  project_type: z.string().optional(),
  platform: z.string().optional(),
  tags: z.array(z.string()).optional(),
  match_all: z.boolean().optional(),
})

const actionSchema = z.object({
  type: z.enum(['assign_member', 'round_robin']),
  member_id: z.string().uuid().optional(),
  member_ids: z.array(z.string().uuid()).optional(),
})

export const automationRouter = createTRPCRouter({
  listRules: orgProcedure
    .query(async ({ ctx }) => {
      const { data } = await ctx.supabase
        .from('automation_rules')
        .select('*')
        .eq('organization_id', ctx.orgId)
        .order('priority', { ascending: false })
        .returns<AutomationRuleRow[]>()

      return data ?? []
    }),

  createRule: managerProcedure
    .input(z.object({
      name: z.string().min(1),
      ruleType: z.string().default('auto_assign'),
      conditions: conditionsSchema,
      action: actionSchema,
      priority: z.number().int().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('automation_rules')
        .insert({
          organization_id: ctx.orgId,
          name: input.name,
          rule_type: input.ruleType,
          conditions: input.conditions as unknown as Database['public']['Tables']['automation_rules']['Insert']['conditions'],
          action: input.action as unknown as Database['public']['Tables']['automation_rules']['Insert']['action'],
          priority: input.priority,
          created_by: ctx.user.id,
        })
        .select()
        .single<AutomationRuleRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  updateRule: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      conditions: conditionsSchema.optional(),
      action: actionSchema.optional(),
      priority: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.conditions !== undefined) updates.conditions = input.conditions
      if (input.action !== undefined) updates.action = input.action
      if (input.priority !== undefined) updates.priority = input.priority

      const { data, error } = await ctx.supabase
        .from('automation_rules')
        .update(updates)
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<AutomationRuleRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  toggleRule: managerProcedure
    .input(z.object({
      id: z.string().uuid(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('automation_rules')
        .update({ is_active: input.isActive })
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)
        .select()
        .single<AutomationRuleRow>()

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return data
    }),

  deleteRule: managerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from('automation_rules')
        .delete()
        .eq('id', input.id)
        .eq('organization_id', ctx.orgId)

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
      return { success: true }
    }),
})

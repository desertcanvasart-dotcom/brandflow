import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const createTRPCContext = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return {
    supabase,
    user,
    orgId: user?.app_metadata?.organization_id as string | undefined,
    userRole: user?.app_metadata?.user_role as string | undefined,
    isSuperAdmin: user?.app_metadata?.is_super_admin === true,
  }
})

const t = initTRPC.context<Awaited<ReturnType<typeof createTRPCContext>>>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const createCallerFactory = t.createCallerFactory
export const baseProcedure = t.procedure

// Middleware: require authentication
export const authedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

// Middleware: require org membership (also enforces auth)
export const orgProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (!ctx.orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No organization membership found',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      orgId: ctx.orgId,
      userRole: ctx.userRole!,
    },
  })
})

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 50, manager: 40, creator: 30, developer: 25, viewer: 10, client: 5,
}

// Middleware: require manager role (also enforces auth + org)
export const managerProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (!ctx.orgId) throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization membership found' })
  if (!ctx.userRole || ROLE_HIERARCHY[ctx.userRole] < ROLE_HIERARCHY['manager']) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires manager role or higher' })
  }
  return next({
    ctx: { ...ctx, user: ctx.user, orgId: ctx.orgId, userRole: ctx.userRole },
  })
})

// Middleware: require admin role (also enforces auth + org)
export const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  if (!ctx.orgId) throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization membership found' })
  if (!ctx.userRole || ROLE_HIERARCHY[ctx.userRole] < ROLE_HIERARCHY['admin']) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires admin role or higher' })
  }
  return next({
    ctx: { ...ctx, user: ctx.user, orgId: ctx.orgId, userRole: ctx.userRole },
  })
})

// Middleware: require super admin (platform-level, no org required)
export const superAdminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  if (!ctx.isSuperAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Requires super admin access',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      isSuperAdmin: true as const,
    },
  })
})

export const publicProcedure = baseProcedure

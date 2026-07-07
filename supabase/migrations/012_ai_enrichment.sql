-- ============================================================
-- 012: AI Agent Enrichment — Brand Strategies & AI Outputs
-- ============================================================

-- Brand strategy document (one per brand) — content pillars,
-- audience personas, tone profiles, campaign objectives
create table brand_strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  content_pillars jsonb not null default '[]',
  audience_personas jsonb not null default '[]',
  tone_profiles jsonb not null default '{}',
  campaign_objectives jsonb not null default '[]',
  competitive_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(brand_id)
);

-- AI output tracking — feedback loop for agent quality
create table ai_outputs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  brand_id uuid references brands(id) on delete set null,
  agent_type text not null,
  status text not null default 'generated',
  input_summary text,
  output_text text not null,
  rating smallint check (rating between 1 and 5),
  user_id uuid not null references auth.users(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_brand_strategies_org on brand_strategies(organization_id);
create index idx_ai_outputs_org_agent on ai_outputs(organization_id, agent_type);
create index idx_ai_outputs_brand_agent on ai_outputs(brand_id, agent_type);
create index idx_ai_outputs_user on ai_outputs(user_id);

-- Updated-at trigger for brand_strategies
create trigger set_brand_strategies_updated_at
  before update on brand_strategies
  for each row execute function update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────

alter table brand_strategies enable row level security;
alter table ai_outputs enable row level security;

-- brand_strategies: org members can view
create policy "Org members can view brand strategies"
  on brand_strategies for select
  using (organization_id = org_id());

-- brand_strategies: managers+ can insert
create policy "Managers can create brand strategies"
  on brand_strategies for insert
  with check (organization_id = org_id() and has_role('manager'));

-- brand_strategies: managers+ can update
create policy "Managers can update brand strategies"
  on brand_strategies for update
  using (organization_id = org_id() and has_role('manager'));

-- brand_strategies: managers+ can delete
create policy "Managers can delete brand strategies"
  on brand_strategies for delete
  using (organization_id = org_id() and has_role('manager'));

-- ai_outputs: org members can view all outputs in their org
create policy "Org members can view ai outputs"
  on ai_outputs for select
  using (organization_id = org_id());

-- ai_outputs: authenticated users can insert their own
create policy "Users can create ai outputs"
  on ai_outputs for insert
  with check (organization_id = org_id() and user_id = auth.uid());

-- ai_outputs: users can update their own outputs (status, rating)
create policy "Users can update own ai outputs"
  on ai_outputs for update
  using (organization_id = org_id() and user_id = auth.uid());

-- ai_outputs: managers+ can delete
create policy "Managers can delete ai outputs"
  on ai_outputs for delete
  using (organization_id = org_id() and has_role('manager'));

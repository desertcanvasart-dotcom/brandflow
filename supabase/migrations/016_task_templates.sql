-- ============================================================
-- 016_task_templates.sql
-- Task template library + task generation support
-- ============================================================

-- ── 1A. task_templates table ────────────────────────────────

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  type TEXT,
  estimated_hours NUMERIC(6,2),
  description TEXT,
  is_default BOOLEAN DEFAULT TRUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

-- System defaults (organization_id IS NULL) are readable by everyone
CREATE POLICY "read_system_defaults" ON task_templates FOR SELECT
  USING (organization_id IS NULL);

-- Org-specific templates are org-scoped
CREATE POLICY "read_org_templates" ON task_templates FOR SELECT
  USING (organization_id = public.org_id());

CREATE POLICY "manage_org_templates" ON task_templates FOR ALL
  USING (organization_id = public.org_id());

CREATE INDEX idx_task_templates_service ON task_templates(service_type);
CREATE INDEX idx_task_templates_org ON task_templates(organization_id);


-- ── 1B. Update service_briefs status constraint ─────────────

ALTER TABLE service_briefs DROP CONSTRAINT IF EXISTS service_briefs_status_check;
ALTER TABLE service_briefs ADD CONSTRAINT service_briefs_status_check
  CHECK (status IN ('draft', 'in_review', 'approved', 'active', 'complete'));


-- ── 1C. Add task generation columns to tasks ────────────────

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS generation_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_brief_id UUID REFERENCES service_briefs(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_source_brief ON tasks(source_brief_id) WHERE source_brief_id IS NOT NULL;


-- ── 1D. Seed default task templates ─────────────────────────

-- ── WEBSITE ─────────────────────────────────────────────────
INSERT INTO task_templates (service_type, phase_name, task_name, type, estimated_hours, description) VALUES
('website', 'Discovery', 'Existing site audit', 'audit', 4, 'Review current site structure, performance, and content'),
('website', 'Discovery', 'Requirements gathering', 'planning', 6, 'Document functional and technical requirements'),
('website', 'Discovery', 'Sitemap creation', 'planning', 3, 'Define site architecture and page hierarchy'),
('website', 'Discovery', 'Tech stack finalization', 'planning', 2, 'Confirm CMS, frameworks, and hosting decisions'),
('website', 'Design', 'Wireframes', 'design', 12, 'Create wireframes for all key pages'),
('website', 'Design', 'Visual mockups', 'design', 16, 'High-fidelity mockups based on brand guidelines'),
('website', 'Design', 'Responsive design specs', 'design', 8, 'Mobile and tablet design adaptations'),
('website', 'Design', 'Design review and approval', 'review', 3, 'Client review cycle for design sign-off'),
('website', 'Development', 'Frontend development', 'development', 40, 'Build frontend pages and components'),
('website', 'Development', 'Backend / CMS setup', 'development', 24, 'CMS configuration and backend logic'),
('website', 'Development', 'Third-party integrations', 'development', 12, 'Connect APIs, analytics, forms, etc.'),
('website', 'Development', 'Content migration', 'development', 8, 'Migrate existing content to new site'),
('website', 'Launch', 'QA and browser testing', 'testing', 8, 'Cross-browser and device testing'),
('website', 'Launch', 'Staging deployment', 'deployment', 3, 'Deploy to staging for final review'),
('website', 'Launch', 'DNS and domain setup', 'deployment', 2, 'Configure DNS, SSL, and go-live'),
('website', 'Launch', 'Post-launch audit', 'audit', 4, 'Verify all pages, forms, and tracking post-launch'),

-- ── SEO ─────────────────────────────────────────────────────
('seo', 'Audit', 'Technical SEO audit', 'audit', 8, 'Crawl site for technical issues, speed, and indexability'),
('seo', 'Audit', 'Content audit', 'audit', 6, 'Review existing content quality and gaps'),
('seo', 'Audit', 'Competitor analysis', 'research', 6, 'Analyze top competitor SEO strategies'),
('seo', 'Audit', 'Keyword research', 'research', 8, 'Identify target keywords and search intent'),
('seo', 'On-Page', 'Meta title and description optimization', 'optimization', 6, 'Rewrite meta tags for target keywords'),
('seo', 'On-Page', 'Content optimization', 'optimization', 10, 'Update existing pages for SEO best practices'),
('seo', 'On-Page', 'Schema markup implementation', 'development', 4, 'Add structured data markup'),
('seo', 'On-Page', 'Internal linking strategy', 'optimization', 4, 'Build internal link architecture'),
('seo', 'Off-Page', 'Backlink audit', 'audit', 4, 'Review and clean up backlink profile'),
('seo', 'Off-Page', 'Link building outreach plan', 'strategy', 6, 'Develop outreach strategy for quality backlinks'),
('seo', 'Off-Page', 'Local citation setup', 'setup', 4, 'Create and optimize local business listings'),
('seo', 'Reporting', 'Analytics and tracking setup', 'setup', 3, 'Configure GA4, GSC, and rank tracking'),
('seo', 'Reporting', 'SEO dashboard configuration', 'setup', 3, 'Build reporting dashboard for KPIs'),
('seo', 'Reporting', 'First monthly SEO report', 'reporting', 4, 'Deliver baseline performance report'),

-- ── CONTENT ─────────────────────────────────────────────────
('content', 'Strategy', 'Audience research', 'research', 6, 'Define content audience personas'),
('content', 'Strategy', 'Content calendar creation', 'planning', 4, 'Build monthly content calendar'),
('content', 'Strategy', 'Style guide review', 'review', 2, 'Review and align with brand style guide'),
('content', 'Strategy', 'Topic cluster mapping', 'planning', 4, 'Map content pillars and topic clusters'),
('content', 'Production', 'Content writing', 'creation', 20, 'Write articles, blogs, or copy per calendar'),
('content', 'Production', 'Editing and proofreading', 'review', 8, 'Edit all content for quality and accuracy'),
('content', 'Production', 'Graphic asset creation', 'design', 8, 'Create supporting images and graphics'),
('content', 'Production', 'SEO optimization pass', 'optimization', 4, 'Optimize content for target keywords'),
('content', 'Review', 'Internal review cycle', 'review', 3, 'Team review and feedback rounds'),
('content', 'Review', 'Client review and revisions', 'review', 4, 'Client feedback and revision rounds'),
('content', 'Publishing', 'Content scheduling', 'execution', 2, 'Schedule content across platforms'),
('content', 'Publishing', 'Distribution and promotion', 'execution', 3, 'Distribute via email, social, syndication'),
('content', 'Publishing', 'Performance review', 'reporting', 3, 'Analyze content performance metrics'),

-- ── SOCIAL ──────────────────────────────────────────────────
('social', 'Setup', 'Account audit', 'audit', 4, 'Audit current social accounts and profiles'),
('social', 'Setup', 'Content pillars definition', 'strategy', 4, 'Define content themes and posting mix'),
('social', 'Setup', 'Competitor benchmarking', 'research', 4, 'Analyze competitor social presence'),
('social', 'Setup', 'Brand voice guidelines for social', 'strategy', 3, 'Adapt brand voice for social platforms'),
('social', 'Content', 'Monthly content calendar', 'planning', 6, 'Plan monthly posts by platform'),
('social', 'Content', 'Post creation and copywriting', 'creation', 12, 'Write captions, hooks, and CTAs'),
('social', 'Content', 'Visual asset creation', 'design', 10, 'Create graphics, carousels, and short videos'),
('social', 'Content', 'Hashtag and keyword strategy', 'research', 3, 'Research and compile hashtag lists'),
('social', 'Engagement', 'Community management setup', 'setup', 3, 'Define response protocols and templates'),
('social', 'Engagement', 'Response template library', 'creation', 4, 'Create FAQ and engagement templates'),
('social', 'Engagement', 'Paid boost strategy', 'strategy', 3, 'Plan boosted posts and budget allocation'),
('social', 'Reporting', 'Analytics baseline report', 'reporting', 3, 'Document current performance benchmarks'),
('social', 'Reporting', 'Monthly report template', 'reporting', 3, 'Build recurring reporting template'),

-- ── PAID ADS ────────────────────────────────────────────────
('paid_ads', 'Setup', 'Ad account setup', 'setup', 3, 'Create or configure advertising accounts'),
('paid_ads', 'Setup', 'Tracking pixel installation', 'development', 4, 'Install conversion tracking pixels'),
('paid_ads', 'Setup', 'Audience creation', 'strategy', 4, 'Build custom and lookalike audiences'),
('paid_ads', 'Setup', 'Creative brief', 'planning', 3, 'Brief for ad creative production'),
('paid_ads', 'Campaign Build', 'Campaign structure design', 'planning', 4, 'Design campaign and ad set hierarchy'),
('paid_ads', 'Campaign Build', 'Ad copy writing', 'creation', 6, 'Write ad headlines, descriptions, and CTAs'),
('paid_ads', 'Campaign Build', 'Creative production', 'design', 10, 'Produce ad images and videos'),
('paid_ads', 'Campaign Build', 'Landing page review', 'review', 3, 'Audit and optimize landing pages for conversion'),
('paid_ads', 'Launch', 'Pre-launch QA', 'testing', 2, 'Verify tracking, targeting, and creative before launch'),
('paid_ads', 'Launch', 'Budget pacing setup', 'setup', 2, 'Configure daily/weekly budget pacing'),
('paid_ads', 'Launch', 'Initial optimization round', 'optimization', 4, 'First week monitoring and bid adjustments'),
('paid_ads', 'Launch', 'Account migration', 'setup', 4, 'Migrate existing campaigns from previous manager'),
('paid_ads', 'Reporting', 'Conversion tracking validation', 'testing', 3, 'Verify all conversion events fire correctly'),
('paid_ads', 'Reporting', 'First performance report', 'reporting', 4, 'Week-2 or month-1 performance summary'),
('paid_ads', 'Reporting', 'Optimization plan', 'strategy', 3, 'Document next optimization steps'),

-- ── EMAIL ───────────────────────────────────────────────────
('email', 'Setup', 'ESP audit and access', 'audit', 3, 'Review current email service provider setup'),
('email', 'Setup', 'List segmentation', 'strategy', 4, 'Segment subscriber list by behavior and attributes'),
('email', 'Setup', 'Email template design', 'design', 8, 'Design branded email templates'),
('email', 'Setup', 'Deliverability audit', 'audit', 3, 'Check domain auth, reputation, and inbox placement'),
('email', 'Automation', 'Welcome flow setup', 'development', 6, 'Build automated welcome email sequence'),
('email', 'Automation', 'Nurture sequence setup', 'development', 8, 'Build lead nurture automation'),
('email', 'Automation', 'Re-engagement flow setup', 'development', 4, 'Build win-back automation for inactive subscribers'),
('email', 'Campaigns', 'Campaign calendar', 'planning', 3, 'Plan monthly email sends'),
('email', 'Campaigns', 'First campaign draft', 'creation', 4, 'Write and design first campaign email'),
('email', 'Campaigns', 'A/B test plan', 'strategy', 2, 'Define subject line and content test matrix'),
('email', 'Reporting', 'Performance dashboard setup', 'setup', 3, 'Configure email analytics dashboard'),

-- ── BRANDING ────────────────────────────────────────────────
('branding', 'Discovery', 'Brand audit', 'audit', 6, 'Evaluate current brand assets and perception'),
('branding', 'Discovery', 'Competitor visual analysis', 'research', 4, 'Analyze competitor branding and positioning'),
('branding', 'Discovery', 'Stakeholder interviews', 'research', 6, 'Gather brand vision from key stakeholders'),
('branding', 'Strategy', 'Brand positioning statement', 'strategy', 4, 'Define unique positioning and value prop'),
('branding', 'Strategy', 'Messaging framework', 'strategy', 6, 'Develop key messages, tagline, and elevator pitch'),
('branding', 'Strategy', 'Tone and voice guidelines', 'strategy', 4, 'Document brand personality and communication style'),
('branding', 'Design', 'Logo concept exploration', 'design', 12, 'Create multiple logo directions'),
('branding', 'Design', 'Color palette definition', 'design', 3, 'Select primary and secondary brand colors'),
('branding', 'Design', 'Typography selection', 'design', 3, 'Choose heading and body typefaces'),
('branding', 'Design', 'Brand guidelines document', 'design', 10, 'Compile comprehensive brand standards'),
('branding', 'Delivery', 'Asset export and packaging', 'delivery', 4, 'Export all assets in required formats'),
('branding', 'Delivery', 'Brand guide finalization', 'delivery', 3, 'Final review and delivery of brand guide'),
('branding', 'Delivery', 'Team rollout and training', 'delivery', 3, 'Brief team on brand usage'),

-- ── CRO ─────────────────────────────────────────────────────
('cro', 'Audit', 'Analytics review', 'audit', 4, 'Review GA data for conversion drop-off points'),
('cro', 'Audit', 'Heatmap setup', 'setup', 3, 'Install and configure heatmap tracking'),
('cro', 'Audit', 'Conversion funnel mapping', 'research', 4, 'Map all conversion paths and identify leaks'),
('cro', 'Research', 'User testing plan', 'research', 4, 'Design and schedule user testing sessions'),
('cro', 'Research', 'Competitor UX review', 'research', 4, 'Benchmark competitor conversion flows'),
('cro', 'Testing', 'A/B test roadmap', 'strategy', 4, 'Prioritize test hypotheses by impact'),
('cro', 'Testing', 'First experiment setup', 'development', 6, 'Build and launch first A/B test'),
('cro', 'Testing', 'Landing page optimization', 'optimization', 8, 'Redesign key landing pages for conversion'),
('cro', 'Reporting', 'CRO dashboard setup', 'setup', 3, 'Configure conversion tracking dashboard'),
('cro', 'Reporting', 'Test results documentation', 'reporting', 3, 'Document findings and next actions per test'),

-- ── ANALYTICS ───────────────────────────────────────────────
('analytics', 'Audit', 'Tracking audit', 'audit', 6, 'Audit all existing tracking implementations'),
('analytics', 'Audit', 'GA4 setup review', 'audit', 4, 'Verify GA4 configuration and data streams'),
('analytics', 'Audit', 'GTM container review', 'audit', 3, 'Review and clean up GTM tags and triggers'),
('analytics', 'Implementation', 'Event tracking plan', 'planning', 4, 'Define custom events and parameters to track'),
('analytics', 'Implementation', 'Dashboard build', 'development', 10, 'Build custom analytics dashboards'),
('analytics', 'Implementation', 'Attribution model setup', 'development', 6, 'Configure multi-touch attribution'),
('analytics', 'Reporting', 'First monthly report', 'reporting', 4, 'Deliver first comprehensive analytics report'),
('analytics', 'Reporting', 'KPI documentation', 'documentation', 3, 'Document all tracked KPIs and definitions'),
('analytics', 'Reporting', 'Stakeholder walkthrough', 'delivery', 2, 'Present dashboard and reporting to stakeholders'),

-- ── STRATEGY ────────────────────────────────────────────────
('strategy', 'Discovery', 'Market research', 'research', 8, 'Analyze market trends, size, and opportunities'),
('strategy', 'Discovery', 'SWOT analysis', 'research', 4, 'Identify strengths, weaknesses, opportunities, threats'),
('strategy', 'Discovery', 'Stakeholder workshops', 'research', 6, 'Facilitate discovery sessions with key stakeholders'),
('strategy', 'Planning', 'Strategic roadmap', 'strategy', 8, 'Build quarterly/annual marketing roadmap'),
('strategy', 'Planning', 'Budget allocation plan', 'strategy', 4, 'Recommend budget distribution across channels'),
('strategy', 'Planning', 'Channel strategy', 'strategy', 6, 'Define channel mix and prioritization'),
('strategy', 'Documentation', 'Strategy deck', 'documentation', 8, 'Create presentation-ready strategy document'),
('strategy', 'Documentation', 'Implementation timeline', 'planning', 4, 'Map strategy to execution timeline'),
('strategy', 'Documentation', 'Success metrics definition', 'documentation', 3, 'Define KPIs and measurement framework'),
('strategy', 'Alignment', 'Team briefing', 'delivery', 3, 'Brief internal team on strategy'),
('strategy', 'Alignment', 'Stakeholder signoff', 'review', 2, 'Get formal approval from decision makers'),
('strategy', 'Alignment', 'Kickoff planning', 'planning', 3, 'Plan execution kickoff with all parties');

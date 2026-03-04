-- ============================================================
-- DEFAULT WORKFLOW TEMPLATES (system-level, org_id = NULL)
-- ============================================================

-- Content Operations Default Workflow
INSERT INTO workflow_templates (id, organization_id, name, project_type, is_default, stages, transitions)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  'Content Operations Default',
  'content_ops',
  TRUE,
  '[
    {"name": "Brief",           "order": 0, "color": "#6B7280", "status": "backlog"},
    {"name": "In Progress",     "order": 1, "color": "#3B82F6", "status": "in_progress"},
    {"name": "Internal Review", "order": 2, "color": "#F59E0B", "status": "in_review"},
    {"name": "Client Review",   "order": 3, "color": "#8B5CF6", "status": "client_review"},
    {"name": "Approved",        "order": 4, "color": "#10B981", "status": "approved"},
    {"name": "Scheduled",       "order": 5, "color": "#06B6D4", "status": "scheduled"},
    {"name": "Published",       "order": 6, "color": "#059669", "status": "published"}
  ]',
  '[
    {"from": "backlog",        "to": "in_progress",    "requires_role": ["creator","manager","admin"]},
    {"from": "in_progress",    "to": "in_review",      "requires_role": ["creator","manager","admin"]},
    {"from": "in_review",      "to": "client_review",  "requires_role": ["manager","admin"]},
    {"from": "in_review",      "to": "in_progress",    "requires_role": ["manager","admin"]},
    {"from": "client_review",  "to": "approved",       "requires_role": ["manager","admin","client"]},
    {"from": "client_review",  "to": "in_progress",    "requires_role": ["manager","admin","client"]},
    {"from": "approved",       "to": "scheduled",      "requires_role": ["creator","manager","admin"]},
    {"from": "scheduled",      "to": "published",      "requires_role": ["creator","manager","admin"]}
  ]'
);

-- Web Build Default Workflow
INSERT INTO workflow_templates (id, organization_id, name, project_type, is_default, stages, transitions)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  NULL,
  'Web Build Default',
  'web_build',
  TRUE,
  '[
    {"name": "Discovery",    "order": 0, "color": "#6B7280", "status": "not_started"},
    {"name": "Wireframe",    "order": 1, "color": "#3B82F6", "status": "not_started"},
    {"name": "Design",       "order": 2, "color": "#8B5CF6", "status": "not_started"},
    {"name": "Development",  "order": 3, "color": "#F59E0B", "status": "not_started"},
    {"name": "Testing",      "order": 4, "color": "#EF4444", "status": "not_started"},
    {"name": "Launch",       "order": 5, "color": "#10B981", "status": "not_started"}
  ]',
  '[
    {"from": "not_started",  "to": "in_progress", "requires_role": ["manager","admin"]},
    {"from": "in_progress",  "to": "completed",   "requires_role": ["manager","admin"]},
    {"from": "completed",    "to": "in_progress",  "requires_role": ["manager","admin"]}
  ]'
);

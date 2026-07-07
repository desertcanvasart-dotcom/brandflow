-- ============================================================
-- MIGRATION 019: Task Assembly — extend tasks table for template linking
-- ============================================================

-- Add template tracking columns to existing tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_templates(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_template ON tasks(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_service_type ON tasks(service_type) WHERE service_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type) WHERE task_type IS NOT NULL;

-- Jalons de conversion internes (aucun contenu de courrier).
CREATE TABLE IF NOT EXISTS conversion_milestones (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 milestone text NOT NULL CHECK(milestone IN ('registered','first_scan','third_document','subscription_activated')),
 achieved_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,milestone)
);
CREATE INDEX IF NOT EXISTS conversion_milestone_summary ON conversion_milestones(milestone,achieved_at);
ALTER TABLE scans ADD COLUMN IF NOT EXISTS initiated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
INSERT INTO conversion_milestones(user_id,milestone,achieved_at)
SELECT id,'registered',created_at FROM users ON CONFLICT DO NOTHING;

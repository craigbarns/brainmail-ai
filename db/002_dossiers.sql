CREATE TABLE IF NOT EXISTS dossiers (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 label text NOT NULL, status text NOT NULL DEFAULT 'ouvert' CHECK(status IN ('ouvert','en_cours','resolu','cloture')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dossiers_workspace ON dossiers(workspace_id,created_at DESC);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS dossier_id uuid REFERENCES dossiers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS documents_dossier ON documents(dossier_id) WHERE dossier_id IS NOT NULL;

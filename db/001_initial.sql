CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL,
 verified boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workspaces (
 id uuid PRIMARY KEY, name text NOT NULL, preferences text NOT NULL DEFAULT '', memory_enabled boolean NOT NULL DEFAULT false,
 inbox_address text UNIQUE, inbox_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
 user_id uuid NOT NULL REFERENCES users(id), workspace_id uuid NOT NULL REFERENCES workspaces(id),
 role text NOT NULL DEFAULT 'owner' CHECK(role IN ('owner','member')), PRIMARY KEY(user_id,workspace_id)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), workspace_id uuid NOT NULL REFERENCES workspaces(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_tokens (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), title text NOT NULL DEFAULT 'Nouveau courrier',
 source text NOT NULL CHECK(source IN ('scan','pdf','email')), status text NOT NULL DEFAULT 'capturing' CHECK(status IN ('capturing','queued','processing','ready','failed')),
 category text NOT NULL DEFAULT 'À classer', folder text NOT NULL DEFAULT '', sender text NOT NULL DEFAULT '', summary text NOT NULL DEFAULT '',
 ocr_text text NOT NULL DEFAULT '', draft text NOT NULL DEFAULT '', draft_approved_at timestamptz, archived boolean NOT NULL DEFAULT false,
 error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,workspace_id)
);
CREATE TABLE IF NOT EXISTS document_files (
 id uuid PRIMARY KEY, document_id uuid NOT NULL, workspace_id uuid NOT NULL,
 storage_key text UNIQUE NOT NULL, mime text NOT NULL, size integer NOT NULL CHECK(size>0), ordinal integer NOT NULL,
 FOREIGN KEY(document_id,workspace_id) REFERENCES documents(id,workspace_id) ON DELETE CASCADE,
 UNIQUE(document_id,ordinal)
);
CREATE TABLE IF NOT EXISTS scans (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, document_id uuid NOT NULL,
 token_hash text UNIQUE NOT NULL, device_hash text UNIQUE, expires_at timestamptz NOT NULL, completed_at timestamptz,
 FOREIGN KEY(document_id,workspace_id) REFERENCES documents(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS actions (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, document_id uuid NOT NULL,
 label text NOT NULL, due_date date, evidence text NOT NULL DEFAULT '', confirmed boolean NOT NULL DEFAULT false,
 done boolean NOT NULL DEFAULT false, FOREIGN KEY(document_id,workspace_id) REFERENCES documents(id,workspace_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS jobs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id), kind text NOT NULL CHECK(kind IN ('analyze','memory','inbound')),
 payload jsonb NOT NULL, dedup_key text UNIQUE NOT NULL, state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','done','failed')),
 attempts integer NOT NULL DEFAULT 0, run_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid, last_error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reminders (
 id uuid PRIMARY KEY, action_id uuid NOT NULL REFERENCES actions(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES users(id),
 due_date date NOT NULL, state text NOT NULL DEFAULT 'pending', provider_id text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(action_id,user_id,due_date)
);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS documents_workspace ON documents(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_pending ON jobs(state,run_at);
CREATE INDEX IF NOT EXISTS actions_workspace ON actions(workspace_id,due_date);

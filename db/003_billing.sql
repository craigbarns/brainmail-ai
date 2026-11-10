-- Facturation : l'abonnement appartient à l'utilisateur (WeMade facture une
-- entreprise) et borne le nombre de sociétés (workspaces) et de courriers.
CREATE TABLE IF NOT EXISTS billing (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'none' CHECK (plan IN ('none','solo','pro','cabinet')),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status text NOT NULL DEFAULT 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

import type { DB } from './db';

export type ConversionMilestone = 'registered' | 'first_scan' | 'third_document' | 'subscription_activated';

// Un jalon au plus par compte, sans données de document ni suivi du navigateur.
export async function recordMilestone(db: DB, userId: string, milestone: ConversionMilestone) {
  await db.query(
    'INSERT INTO conversion_milestones(user_id,milestone) VALUES($1,$2) ON CONFLICT DO NOTHING',
    [userId, milestone],
  );
}

export async function recordThirdDocumentForWorkspace(db: DB, workspaceId: string) {
  const { rows: owners } = await db.query<{ user_id: string }>(
    "SELECT user_id FROM memberships WHERE workspace_id=$1 AND role='owner'",
    [workspaceId],
  );
  for (const owner of owners) {
    const { rows: [count] } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM documents d
       JOIN memberships m ON m.workspace_id=d.workspace_id
       WHERE m.user_id=$1 AND m.role='owner' AND d.status='ready'`,
      [owner.user_id],
    );
    if (count.n >= 3) await recordMilestone(db, owner.user_id, 'third_document');
  }
}

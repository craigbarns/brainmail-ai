import Link from 'next/link';

// Shared shell for the legal pages: same paper/ink identity as the app.
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">
        <span className="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </Link>
      <h1>{title}</h1>
      <p className="legal-updated">Dernière mise à jour : {updated}</p>
      {children}
      <nav className="legal-nav" aria-label="Pages légales">
        <Link href="/legal/mentions-legales">Mentions légales</Link>
        <Link href="/legal/cgv">CGV</Link>
        <Link href="/legal/confidentialite">Confidentialité</Link>
        <Link href="/">← Retour au site</Link>
      </nav>
    </main>
  );
}

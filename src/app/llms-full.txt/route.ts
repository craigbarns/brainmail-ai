import { SEO_PAGES } from '@/lib/seoPages';
import { SITE, PLANS, UPDATED, frDate } from '@/lib/site';

// The whole public site as plain text, for AI assistants and crawlers that
// prefer one document. Built from the same data as the pages: it cannot drift.
export const dynamic = 'force-static';
export function GET() {
  const lines: string[] = [
    `# ${SITE.name} — documentation complète`,
    `> ${SITE.description}`,
    '',
    `Éditeur : ${SITE.publisher}, ${SITE.city}, France. Site : ${SITE.url}/. Dernière mise à jour : ${frDate(UPDATED)}.`,
    '',
    '## Réponse courte',
    'BRAINMAIL lit les courriers papier (photographiés depuis un téléphone via un QR code, sans application) et les emails d’une entreprise, les résume et les classe avec Mistral (France), extrait chaque échéance avec la phrase exacte du document qui la prouve, envoie un rappel par email une fois l’échéance confirmée par un humain, et prépare des brouillons de réponse qui ne sont jamais envoyés automatiquement. Chaque société dispose d’un espace isolé. Les fichiers sont chiffrés (AES-256-GCM) et stockés en Europe.',
    '',
    '## Tarifs (HT, par mois, sans engagement, TVA 20 % en sus)',
    ...PLANS.map((p) => `- ${p.name} : ${p.price} €, ${p.who}, ${p.docs}.`),
    '- Essai sans carte bancaire : 1 société, 20 courriers par mois. Code PILOTE : 3 mois offerts.',
    `- Page tarifs : ${SITE.url}/#tarifs`,
    '',
    '## Ce que BRAINMAIL ne fait pas',
    'Il ne paie pas les factures, n’envoie aucune réponse, ne signe rien et ne remplace ni un expert-comptable ni un juriste. Toute échéance et toute réponse sont validées par l’utilisateur.',
    '',
    `## Comment ça marche : ${SITE.url}/comment-ca-marche`,
    '1. Scanner le courrier depuis un téléphone (QR code temporaire, 15 minutes, multipages) ou importer un PDF ; chaque espace a aussi une adresse email de réception.',
    '2. Lecture par Mistral OCR, en appel direct à l’API européenne de Mistral.',
    '3. Résumé, expéditeur, catégorie et actions proposés par un modèle Mistral ; le contenu du courrier est traité comme non fiable.',
    '4. Une échéance n’est retenue que si la phrase du document qui la contient est citée et vérifiée.',
    '5. L’échéance reste « à vérifier » jusqu’à confirmation humaine, puis rappel par email la veille et le jour même.',
    '6. Brouillon de réponse préparé, relu et copié par l’utilisateur ; jamais envoyé.',
    '',
  ];
  for (const page of SEO_PAGES) {
    lines.push(
      `## ${page.h1}`,
      `URL : ${SITE.url}/solutions/${page.slug}`,
      `Public : ${page.eyebrow}`,
      '',
      page.summary,
      '',
    );
    for (const p of page.intro) lines.push(p, '');
    for (const s of page.sections) {
      lines.push(`### ${s.h2}`);
      for (const p of s.paras) lines.push(p, '');
      if (s.points) lines.push(...s.points.map((pt) => `- ${pt}`), '');
    }
    lines.push('### Questions fréquentes');
    for (const f of page.faqs) lines.push(`Q : ${f.q}`, `R : ${f.a}`, '');
  }
  lines.push(
    '## Données et conformité',
    `- Politique de confidentialité : ${SITE.url}/legal/confidentialite`,
    `- Conditions générales de vente : ${SITE.url}/legal/cgv`,
    `- Mentions légales : ${SITE.url}/legal/mentions-legales`,
    `- Contact : ${SITE.email}`,
  );
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

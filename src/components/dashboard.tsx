'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Mail,
  LayoutDashboard,
  CreditCard,
  ScanLine,
  CalendarDays,
  Archive,
  Settings,
  Plus,
  Search,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  LogOut,
  ShieldCheck,
  Loader2,
  FolderOpen,
  Download,
  Copy,
  Trash2,
  Camera,
} from 'lucide-react';
import { api, post, patch, formatDate } from './client';
type Data = Record<string, any>;
const statuses: Record<string, string> = {
  capturing: 'Capture en cours',
  queued: 'En attente',
  processing: 'Analyse en cours',
  ready: 'À consulter',
  failed: 'À relancer',
};
const VIEWS: Record<string, { title: string; hint: string }> = {
  inbox: { title: 'Vue d’ensemble', hint: 'Vos courriers, leurs échéances et la suite à donner.' },
  calendar: {
    title: 'Calendrier & actions',
    hint: 'Vérifiez les dates proposées et gardez le fil de vos actions.',
  },
  dossiers: {
    title: 'Dossiers suivis',
    hint: 'Regroupez les courriers d’un même sujet — un contrôle, une SCI, un sinistre — et suivez-le jusqu’à sa clôture.',
  },
  archive: { title: 'Archives', hint: 'Retrouvez les documents que vous avez archivés.' },
  settings: {
    title: 'Préférences',
    hint: 'Indiquez le contexte de votre société pour des réponses qui vous ressemblent.',
  },
};
// Dates are plain YYYY-MM-DD strings, compared in the Paris calendar like the reminders.
const today = () =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
function dueTone(date: string) {
  const now = today();
  if (date < now) return 'late';
  const limit = new Date(`${now}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 7);
  return date <= limit.toISOString().slice(0, 10) ? 'soon' : '';
}
function dayMonth(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    day: d.getUTCDate(),
    month: new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(d),
  };
}
function DateBlock({ date }: { date: string }) {
  const { day, month } = dayMonth(date);
  return (
    <span className={`date-block ${dueTone(date)}`}>
      <b>{day}</b>
      <span>{month}</span>
    </span>
  );
}
export function Dashboard() {
  const [me, setMe] = useState<Data | null>(null),
    [docs, setDocs] = useState<Data[]>([]),
    [actions, setActions] = useState<Data[]>([]),
    [view, setView] = useState('inbox'),
    [search, setSearch] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [scan, setScan] = useState<Data | null>(null),
    [selected, setSelected] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false),
    [name, setName] = useState(''),
    [dossiers, setDossiers] = useState<Data[]>([]);
  const refresh = useCallback(async () => {
    const [m, d, a, ds] = await Promise.all([
      api('me'),
      api(`documents?archived=${view === 'archive'}&q=${encodeURIComponent(search)}`),
      api('actions'),
      view === 'dossiers' ? api('dossiers') : Promise.resolve(null),
    ]);
    setMe(m);
    setDocs(d);
    setActions(a);
    if (ds) setDossiers(ds);
  }, [view, search]);
  // While a mail is being analysed, poll quickly so its result shows up at once.
  const waiting = docs.some((d) => ['queued', 'processing'].includes(d.status));
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const id = setInterval(
      () => {
        // A hidden tab does not need live data; skip the round-trips.
        if (document.hidden) return;
        void refresh().catch((e) => setError(e.message));
      },
      waiting ? 4000 : 15000,
    );
    return () => clearInterval(id);
  }, [refresh, waiting]);
  // A phone takes the pictures itself: no QR code to aim at with the same device.
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(window.matchMedia('(pointer: coarse)').matches), []);
  useEffect(() => {
    if (!scan?.id) return;
    let stopped = false;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const state = await api(`scans/${scan.id}`);
        if (!stopped) setScan((s) => (s ? { ...s, ...state } : null));
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [scan?.id]);
  async function task(fn: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    await task(async () => setSelected(await api(`documents/${id}`)));
  }
  async function importPDF(files: FileList | null) {
    if (!files?.length) return;
    const all = Array.from(files);
    await task(async () => {
      const refused: string[] = [];
      for (const file of all) {
        const d = await post('documents');
        try {
          await api(`documents/${d.id}/files`, { method: 'POST', body: file });
          await post(`documents/${d.id}/complete`);
        } catch (e) {
          // A refused file must not leave an empty mail in the list.
          await api(`documents/${d.id}`, { method: 'DELETE' }).catch(() => {});
          refused.push(`${file.name} — ${(e as Error).message}`);
        }
      }
      if (refused.length < all.length) setNotice('Import terminé. L’analyse va démarrer.');
      if (refused.length) setError(`Non importé : ${refused.join(' ; ')}`);
    });
  }
  const pending = actions.filter((a) => !a.done),
    unconfirmed = pending.filter((a) => !a.confirmed),
    dated = pending.filter((a) => a.due_date).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    undated = pending.length - dated.length;
  // Nearest pending deadline of each mail, shown in the register.
  const nextDue = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of actions)
      if (
        !a.done &&
        a.due_date &&
        (!map.has(a.document_id) || a.due_date < map.get(a.document_id)!)
      )
        map.set(a.document_id, a.due_date);
    return map;
  }, [actions]);
  const meta = VIEWS[view];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a className="brand" href="/">
            <span className="brand-icon">
              <Mail />
            </span>
            BRAINMAIL<span className="brand-ai">.ai</span>
          </a>
          <span className="pilot">Pilote</span>
        </div>
        <label className="workspace-label">
          Société
          <select
            aria-label="Espace actif"
            value={me?.workspace.id || ''}
            onChange={(e) =>
              void task(async () => {
                await post('workspaces/switch', { id: e.target.value });
                setSelected(null);
                setScan(null);
              })
            }
          >
            {me?.workspaces.map((w: Data) => (
              <option value={w.id} key={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button add-space" onClick={() => setCreate(!create)}>
          <Plus size={15} /> Ajouter une société
        </button>
        {create && (
          <form
            className="space-form"
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                const w = await post('workspaces', { name });
                await post('workspaces/switch', { id: w.id });
                setCreate(false);
                setName('');
              });
            }}
          >
            <input
              aria-label="Nom du nouvel espace"
              value={name}
              minLength={2}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de la société"
              required
            />
            <button className="button small" disabled={busy}>
              Créer
            </button>
          </form>
        )}
        <nav aria-label="Navigation principale">
          {[
            ['inbox', LayoutDashboard, 'Vue d’ensemble'],
            ['calendar', CalendarDays, 'Calendrier & actions'],
            ['dossiers', FolderOpen, 'Dossiers suivis'],
            ['archive', Archive, 'Archives'],
            ['settings', Settings, 'Préférences'],
          ].map(([key, Icon, label]) => {
            const I = Icon as typeof Mail;
            return (
              <button
                className={view === key ? 'active' : ''}
                aria-current={view === key ? 'page' : undefined}
                key={key as string}
                onClick={() => {
                  setView(key as string);
                  setSelected(null);
                }}
              >
                <I size={18} />
                {label as string}
                {key === 'calendar' && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            );
          })}
          <a className="nav-link-billing" href="/app/abonnement">
            <CreditCard size={18} />
            Abonnement
            {me?.billing && !me.billing.active && <span className="nav-count warn">!</span>}
          </a>
        </nav>
        <div className="sidebar-bottom">
          <p className="private-note">
            <ShieldCheck size={16} /> Espace privé · documents chiffrés
          </p>
          <button
            className="user-button"
            onClick={() =>
              void task(async () => {
                await post('auth/logout');
                location.href = '/login';
              })
            }
          >
            <span className="avatar">{me?.user.email.slice(0, 2).toUpperCase() || '…'}</span>
            <span className="user-id">
              <span>{me?.user.email || 'Connexion…'}</span>
              <small>Se déconnecter</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace-main">
        <div className="main-content">
          <header className="page-heading">
            <div>
              <p className="overline">
                {new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }).format(new Date())}
                {me?.workspace.name ? ` · ${me.workspace.name}` : ''}
              </p>
              <h1>{meta.title}</h1>
              <p className="muted">{meta.hint}</p>
            </div>
            {view !== 'settings' && (
              <div className="page-actions">
                <label className={`button secondary ${busy ? 'disabled' : ''}`}>
                  <Upload size={17} /> Importer un PDF
                  <input
                    hidden
                    type="file"
                    accept="application/pdf"
                    multiple
                    disabled={busy}
                    onChange={(e) => {
                      void importPDF(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void task(async () => setScan(await post('scans')))}
                >
                  <ScanLine size={18} /> Scanner un courrier
                </button>
              </div>
            )}
          </header>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Fermer l’erreur" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert" role="status">
              {notice}
            </div>
          )}
          {me?.integrations.local && (
            <div className="local-banner">
              Développement local · Les traitements IA nécessitent les clés des services.
            </div>
          )}
          {view === 'settings' && me ? (
            <Preferences key={me.workspace.id} me={me} task={task} setNotice={setNotice} />
          ) : view === 'calendar' ? (
            <Calendar actions={actions} task={task} onOpen={open} />
          ) : view === 'dossiers' ? (
            <Dossiers dossiers={dossiers} task={task} />
          ) : (
            <>
              {view === 'inbox' && docs.length > 0 && (
                <section className="today" aria-labelledby="today-title">
                  <div className="today-main">
                    <h2 id="today-title">À traiter</h2>
                    {dated.length ? (
                      <ul className="due-list">
                        {dated.slice(0, 4).map((a) => (
                          <li key={a.id}>
                            <button className="due-item" onClick={() => void open(a.document_id)}>
                              <DateBlock date={a.due_date} />
                              <span className="due-body">
                                <strong>{a.label}</strong>
                                <small>{a.title}</small>
                              </span>
                              <span className={`chip ${a.confirmed ? 'ok' : 'warn'}`}>
                                {a.confirmed ? 'Confirmée' : 'À vérifier'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">
                        Aucune échéance datée pour l’instant. Les dates repérées dans vos courriers
                        apparaîtront ici.
                      </p>
                    )}
                    {(dated.length > 4 || undated > 0) && (
                      <button className="text-button" onClick={() => setView('calendar')}>
                        {dated.length > 4
                          ? `Voir les ${dated.length} échéances`
                          : `${undated} action${undated > 1 ? 's' : ''} sans date à vérifier`}
                        <ChevronRight size={15} />
                      </button>
                    )}
                  </div>
                  <dl className="today-figures">
                    <div>
                      <dd>{docs.length}</dd>
                      <dt>courrier{docs.length > 1 ? 's' : ''}</dt>
                    </div>
                    <div>
                      <dd>{unconfirmed.length}</dd>
                      <dt>action{unconfirmed.length > 1 ? 's' : ''} à vérifier</dt>
                    </div>
                    <div>
                      <dd>{pending.filter((a) => a.confirmed && a.due_date).length}</dd>
                      <dt>échéances confirmées</dt>
                    </div>
                  </dl>
                </section>
              )}
              <section className="document-section">
                <div className="section-heading">
                  <h2>{view === 'archive' ? 'Vos archives' : 'Votre courrier'}</h2>
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Rechercher un courrier"
                      placeholder="Rechercher un titre, un expéditeur…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
                {docs.length ? (
                  <div className="document-list">
                    <div className="table-head" aria-hidden="true">
                      <span>Courrier</span>
                      <span>Catégorie</span>
                      <span>Échéance</span>
                      <span>État</span>
                      <span>Reçu le</span>
                    </div>
                    {docs.map((d) => {
                      const due = nextDue.get(d.id);
                      return (
                        <button className="document-row" key={d.id} onClick={() => void open(d.id)}>
                          <span className="document-name">
                            <strong>{d.title}</strong>
                            <small>
                              {d.sender ||
                                (d.source === 'scan'
                                  ? 'Scanner mobile'
                                  : d.source === 'email'
                                    ? 'Réception email'
                                    : 'Import PDF')}
                              {d.folder && ` · ${d.folder}`}
                            </small>
                          </span>
                          <span className="category">{d.category}</span>
                          <span className="document-due">
                            {due ? (
                              <span className={`due-chip ${dueTone(due)}`}>
                                {dayMonth(due).day} {dayMonth(due).month}
                              </span>
                            ) : (
                              <span className="none">—</span>
                            )}
                          </span>
                          <span className="document-status">
                            <span className={`status ${d.status}`}>
                              {['processing', 'queued'].includes(d.status) && (
                                <Loader2 size={12} className="spin" />
                              )}
                              {statuses[d.status]}
                            </span>
                          </span>
                          <span className="document-date">{formatDate(d.created_at)}</span>
                          <ChevronRight className="document-chevron" size={17} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-art" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </div>
                    <h3>
                      {search
                        ? 'Aucun résultat pour cette recherche.'
                        : view === 'archive'
                          ? 'Vos archives vous attendent.'
                          : 'Votre premier courrier ouvre le bal.'}
                    </h3>
                    <p>
                      {search
                        ? 'Essayez le nom de l’expéditeur, un titre ou un classeur.'
                        : view === 'archive'
                          ? 'Archivez un courrier traité : il sera rangé ici.'
                          : phone
                            ? 'Prenez un courrier en photo avec ce téléphone, ou importez un PDF.'
                            : 'Scannez un courrier avec votre téléphone, ou importez un PDF.'}
                    </p>
                    {view === 'inbox' && !search && (
                      <>
                        <p className="muted">20 courriers à essayer, sans carte bancaire.</p>
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => void task(async () => setScan(await post('scans')))}
                        >
                          <ScanLine size={17} /> Scanner mon premier courrier
                        </button>
                      </>
                    )}
                  </div>
                )}
              </section>
              <p className="bottom-note">
                <ShieldCheck size={15} /> Vous gardez la main : les réponses et les échéances sont à
                valider.
              </p>
            </>
          )}
          {busy && (
            <div className="busy-indicator" role="status">
              <Loader2 className="spin" size={16} /> En cours…
            </div>
          )}
        </div>
      </main>
      {scan && (
        <div className="modal-backdrop">
          <section
            className="modal scan-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-title"
          >
            <button
              className="icon-button close"
              aria-label="Fermer le scanner"
              onClick={() => setScan(null)}
            >
              <X size={20} />
            </button>
            <p className="overline">
              {phone ? 'Avec ce téléphone' : 'De l’ordinateur au téléphone'}
            </p>
            <h2 id="scan-title">
              {phone ? 'Photographiez votre courrier.' : 'Votre téléphone devient un scanner.'}
            </h2>
            <p className="muted">
              {phone
                ? 'Prenez chaque page en photo. L’analyse démarre dès que vous avez terminé.'
                : 'Ouvrez l’appareil photo de votre téléphone et visez ce QR code.'}
            </p>
            {phone && !scan.completed_at ? (
              <>
                <a className="button large full capture-here" href={scan.url}>
                  <Camera size={19} /> Prendre en photo avec ce téléphone
                </a>
                <details className="other-device">
                  <summary>Utiliser un autre appareil</summary>
                  <ScanCode scan={scan} />
                </details>
              </>
            ) : (
              <ScanCode scan={scan} />
            )}
            {scan.completed_at ? (
              <button
                className="button full"
                onClick={() => {
                  const id = scan.document_id || scan.documentId;
                  setScan(null);
                  void open(id);
                }}
              >
                Voir le courrier <ChevronRight size={16} />
              </button>
            ) : (
              <div className="scan-links">
                {!phone && (
                  <a className="text-button" href={scan.url} target="_blank" rel="noreferrer">
                    Ouvrir la capture sur cet appareil
                  </a>
                )}
                <button
                  className="text-button"
                  onClick={() =>
                    void task(async () => {
                      await api(`scans/${scan.id}`, { method: 'DELETE' });
                      setScan(null);
                    })
                  }
                >
                  {phone ? 'Annuler' : 'Révoquer ce QR code'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      {selected && (
        <DocumentPanel
          key={`${selected.id}:${selected.status}`}
          document={selected}
          close={() => setSelected(null)}
          task={task}
          update={setSelected}
        />
      )}
    </div>
  );
}
function ScanCode({ scan }: { scan: Data }) {
  return (
    <>
      <div className="qr-wrap">
        <img src={scan.qr} alt="QR code temporaire pour scanner le courrier" />
      </div>
      <div className={`scan-status ${scan.paired ? 'on' : ''}`}>
        <span className="dot" />
        {scan.completed_at
          ? 'Courrier transmis pour analyse'
          : scan.paired
            ? `${scan.document?.files?.length || 0} page(s) reçue(s) · Téléphone connecté`
            : 'En attente de votre téléphone'}
      </div>
      <p className="subtle">
        Expire à{' '}
        {new Date(scan.expiresAt || scan.expires_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        · Un seul téléphone
      </p>
    </>
  );
}
const DOSSIER_STATUS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  cloture: 'Clôturé',
};
function Dossiers({
  dossiers,
  task,
}: {
  dossiers: Data[];
  task: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  return (
    <section className="panel dossiers-panel">
      <form
        className="dossier-create"
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await post('dossiers', { label });
            setLabel('');
          });
        }}
      >
        <input
          aria-label="Nom du nouveau dossier"
          value={label}
          minLength={1}
          maxLength={120}
          required
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom du dossier (ex : URSSAF 2027)"
        />
        <button className="button">
          <Plus size={17} /> Créer le dossier
        </button>
      </form>
      <p className="subtle">
        Chaque échéance confirmée d’un dossier reste visible dans le calendrier.
      </p>
      {!dossiers.length && <p className="muted dossier-empty">Aucun dossier pour l’instant.</p>}
      {dossiers.map((d) => (
        <article className="dossier-card" key={d.id}>
          <div className="dossier-head">
            <strong>{d.label}</strong>
            <span className={`dchip ${d.status}`}>{DOSSIER_STATUS[d.status]}</span>
          </div>
          <p className="muted">
            {d.docs} courrier{d.docs > 1 ? 's' : ''}
            {d.pending
              ? ` · ${d.pending} action${d.pending > 1 ? 's' : ''} en attente`
              : ' · aucune action en attente'}
            {d.next_due ? ` · prochaine échéance : ${formatDate(d.next_due)}` : ''}
          </p>
          <div className="dossier-actions">
            {Object.entries(DOSSIER_STATUS)
              .filter(([k]) => k !== d.status)
              .map(([k, lbl]) => (
                <button
                  key={k}
                  className="button secondary small"
                  onClick={() =>
                    void task(async () => {
                      await patch(`dossiers/${d.id}`, { status: k });
                    })
                  }
                >
                  Passer à « {lbl} »
                </button>
              ))}
            <button
              className="button danger small"
              onClick={() => {
                if (
                  !confirm(
                    `Supprimer le dossier « ${d.label} » ? Les courriers restent, sans dossier.`,
                  )
                )
                  return;
                void task(async () => {
                  await api(`dossiers/${d.id}`, { method: 'DELETE' });
                });
              }}
            >
              Supprimer
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
function Preferences({
  me,
  task,
  setNotice,
}: {
  me: Data;
  task: (fn: () => Promise<void>) => Promise<void>;
  setNotice: (s: string) => void;
}) {
  const [preferences, setPreferences] = useState(me.workspace.preferences),
    [memory, setMemory] = useState(me.workspace.memory_enabled);
  useEffect(() => {
    setPreferences(me.workspace.preferences);
    setMemory(me.workspace.memory_enabled);
  }, [me.workspace.id, me.workspace.preferences, me.workspace.memory_enabled]);
  return (
    <div className="settings-grid">
      <section className="panel">
        <h2>Le contexte de votre société</h2>
        <p className="muted">
          Ces préférences aident à préparer des réponses adaptées. Elles sont conservées dans votre
          espace.
        </p>
        <label>
          Votre contexte
          <textarea
            rows={7}
            value={preferences}
            maxLength={4000}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="Activité, ton souhaité, signature à utiliser…"
          />
        </label>
        {me.integrations.memory && (
          <>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={memory}
                onChange={(e) => setMemory(e.target.checked)}
              />{' '}
              Mémoriser ces préférences pour les prochaines réponses
            </label>
            <p className="subtle">
              Seules ces préférences sont alors partagées avec notre service de mémoire (Mem0).
              Désactiver arrête les futurs partages ; cela n’efface pas les copies déjà transmises.
            </p>
          </>
        )}
        <button
          className="button"
          onClick={() =>
            void task(async () => {
              await patch('settings', { preferences, memoryEnabled: memory });
              setNotice('Préférences enregistrées.');
            })
          }
        >
          Enregistrer
        </button>
      </section>
      <section className="panel">
        <h2>Vos services</h2>
        {(me.integrations.local
          ? [
              ['ocr', 'Lecture des courriers · Mistral OCR'],
              ['llm', 'Résumé et échéances · Mistral'],
              ['email', 'Rappels par email · Resend'],
              ['inbox', 'Réception par email · Resend'],
              ['memory', 'Mémoire · Mem0'],
            ]
          : [
              ['ocr', 'Lecture de vos courriers'],
              ['llm', 'Résumé et échéances'],
              ['email', 'Rappels par email'],
              ['inbox', 'Réception par email'],
            ]
        ).map(([key, label]) => (
          <div className="integration-row" key={key}>
            <span>{label}</span>
            <span className={`status ${me.integrations[key] ? 'ready' : ''}`}>
              {me.integrations[key] ? 'Actif' : 'Indisponible'}
            </span>
          </div>
        ))}
        {me.integrations.local && (
          <div className="integration-row">
            <span>Stockage</span>
            <small>{me.integrations.storage}</small>
          </div>
        )}
        {me.integrationJobs?.some((j: Data) => j.state === 'failed') && (
          <p className="alert error">
            Un email reçu ou une synchronisation n’a pas abouti. Renvoyez l’email ou importez sa
            pièce jointe en PDF.
          </p>
        )}
        <h3>Recevoir vos courriers par email</h3>
        {me.workspace.inbox_address ? (
          <>
            <p className="subtle">
              Transférez un email ou une facture à cette adresse : il arrive ici comme un courrier.
            </p>
            <p className="inbox-address">{me.workspace.inbox_address}</p>
            <button
              className="button secondary small"
              onClick={() => {
                if (
                  !confirm(
                    'Changer cette adresse ? Les emails envoyés à l’ancienne adresse seront ignorés.',
                  )
                )
                  return;
                void task(async () => {
                  await post('inbox', { rotate: true });
                  setNotice('Nouvelle adresse de réception créée. L’ancienne est ignorée.');
                });
              }}
            >
              Changer cette adresse
            </button>
          </>
        ) : (
          <>
            <p className="subtle">
              {me.integrations.inbox
                ? 'Créez une adresse dédiée : chaque email que vous y transférez arrive ici comme un courrier.'
                : 'Bientôt disponible : une adresse dédiée pour transférer vos emails et factures.'}
            </p>
            <button
              disabled={!me.integrations.inbox}
              className="button secondary"
              onClick={() =>
                void task(async () => {
                  await post('inbox');
                  setNotice('Adresse de réception créée.');
                })
              }
            >
              Créer mon adresse
            </button>
          </>
        )}
      </section>
    </div>
  );
}
function Calendar({
  actions,
  task,
  onOpen,
}: {
  actions: Data[];
  task: (fn: () => Promise<void>) => Promise<void>;
  onOpen: (id: string) => Promise<void>;
}) {
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const start = new Date(`${month}-01T12:00:00`),
    offset = (start.getDay() + 6) % 7,
    days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(),
    now = today();
  const shift = (step: number) => {
    const d = new Date(`${month}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + step);
    setMonth(d.toISOString().slice(0, 7));
  };
  const monthLabel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T12:00:00Z`));
  return (
    <>
      <section className="panel calendar-panel">
        <div className="section-heading">
          <h2>Votre calendrier</h2>
          <div className="calendar-nav">
            <button className="icon-button" aria-label="Mois précédent" onClick={() => shift(-1)}>
              <ChevronLeft size={19} />
            </button>
            <strong aria-live="polite">{monthLabel}</strong>
            <button className="icon-button" aria-label="Mois suivant" onClick={() => shift(1)}>
              <ChevronRight size={19} />
            </button>
            <input
              aria-label="Mois du calendrier"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="calendar-grid">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`empty-${i}`} className="day blank" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`,
              items = actions.filter((a) => a.due_date === date && !a.done);
            return (
              <div
                className={`day ${items.length ? 'has-action' : ''} ${date === now ? 'is-today' : ''}`}
                key={date}
              >
                <span>{i + 1}</span>
                {items.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => void onOpen(a.document_id)}
                    className={a.confirmed ? '' : 'unconfirmed'}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <p className="calendar-legend">
          <span className="legend confirmed" /> Confirmée
          <span className="legend unconfirmed" /> À vérifier
        </p>
      </section>
      <section className="panel actions-panel">
        <h2>Actions à suivre</h2>
        {!actions.length && (
          <p className="muted">Les actions extraites de vos courriers apparaîtront ici.</p>
        )}
        {actions.map((a) => (
          <Action key={a.id} action={a} task={task} showSource />
        ))}
      </section>
    </>
  );
}
function Action({
  action,
  task,
  showSource = false,
}: {
  action: Data;
  task: (fn: () => Promise<void>) => Promise<void>;
  showSource?: boolean;
}) {
  const [label, setLabel] = useState(action.label),
    [date, setDate] = useState(action.due_date || '');
  return (
    <div
      className={`action-card ${action.done ? 'done' : action.confirmed ? 'confirmed' : 'to-check'}`}
    >
      <div className="action-top">
        <input
          className="action-label"
          aria-label="Action"
          value={label}
          maxLength={300}
          onChange={(e) => setLabel(e.target.value)}
        />
        <span className={`chip ${action.done ? '' : action.confirmed ? 'ok' : 'warn'}`}>
          {action.done ? 'Terminée' : action.confirmed ? 'Confirmée' : 'À vérifier'}
        </span>
      </div>
      {showSource && action.title && <p className="action-source">{action.title}</p>}
      {action.evidence && (
        <blockquote>
          <mark>«&nbsp;{action.evidence}&nbsp;»</mark>
        </blockquote>
      )}
      <div className="action-controls">
        <label>
          Échéance
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button
          className={action.confirmed ? 'button secondary small' : 'button small'}
          onClick={() =>
            void task(async () => {
              await patch(`actions/${action.id}`, {
                label,
                dueDate: date || null,
                confirmed: true,
                done: action.done,
              });
            })
          }
        >
          <Check size={15} />
          {action.confirmed ? 'Enregistrer la date' : 'Confirmer l’action'}
        </button>
        <button
          className="text-button"
          onClick={() =>
            void task(async () => {
              await patch(`actions/${action.id}`, {
                label,
                dueDate: date || null,
                confirmed: action.confirmed,
                done: !action.done,
              });
            })
          }
        >
          {action.done ? 'Rouvrir' : 'Marquer terminée'}
        </button>
      </div>
      <small>
        {action.done
          ? 'Terminée'
          : action.confirmed
            ? 'Action confirmée · rappel si une date est définie'
            : 'Proposition IA · à vérifier avant activation des rappels'}
      </small>
    </div>
  );
}
// The quoted sentence that justifies a deadline is highlighted in the letter itself.
// Apostrophes and spacing differ between the OCR text and the quote: match loosely.
function highlight(text: string, quotes: string[]) {
  const ranges: [number, number][] = [];
  for (const quote of quotes) {
    const q = (quote || '').trim();
    if (q.length < 4) continue;
    const pattern = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/(?:\s|['’`])+/g, "[\\s'’`]+");
    try {
      const m = new RegExp(pattern, 'i').exec(text);
      if (m) ranges.push([m.index, m.index + m[0].length]);
    } catch {
      // An unusual quote simply stays unhighlighted.
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (const [from, to] of ranges) {
    if (from < at) continue;
    if (from > at) parts.push({ text: text.slice(at, from), hit: false });
    parts.push({ text: text.slice(from, to), hit: true });
    at = to;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return parts;
}
function LetterText({ text, quotes }: { text: string; quotes: string[] }) {
  // One sheet per scanned page; markdown marks left by the reader are noise here.
  const pages = useMemo(
    () =>
      text
        .split(/\n\n--- (?:PAGE|FICHIER) ---\n\n/)
        .map((page) => page.replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, ''))
        .filter((page) => page.trim())
        .map((page) => highlight(page, quotes)),
    [text, quotes],
  );
  return (
    <>
      {pages.map((parts, n) => (
        <div className="letter-text" key={n}>
          {parts.map((part, i) =>
            part.hit ? <mark key={i}>{part.text}</mark> : <span key={i}>{part.text}</span>,
          )}
        </div>
      ))}
    </>
  );
}
function DocumentPanel({
  document: d,
  close,
  task,
  update,
}: {
  document: Data;
  close: () => void;
  task: (fn: () => Promise<void>) => Promise<void>;
  update: (d: Data) => void;
}) {
  const [title, setTitle] = useState(d.title),
    [category, setCategory] = useState(d.category),
    [folder, setFolder] = useState(d.folder),
    [draft, setDraft] = useState(d.draft),
    [approved, setApproved] = useState(Boolean(d.draft_approved_at)),
    [copied, setCopied] = useState(false),
    [dossiers, setDossiers] = useState<Data[]>([]);
  const images: Data[] = d.files.filter((f: Data) => String(f.mime).startsWith('image/'));
  const [pane, setPane] = useState<'pages' | 'text'>(images.length ? 'pages' : 'text');
  const quotes = useMemo(
    () => (d.actions || []).map((a: Data) => a.evidence as string),
    [d.actions],
  );
  useEffect(() => {
    api('dossiers')
      .then(setDossiers)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  const reload = async () => update(await api(`documents/${d.id}`));
  // Follow a capture or an analysis in progress without asking for a click.
  const pending = ['capturing', 'queued', 'processing'].includes(d.status);
  useEffect(() => {
    if (!pending) return;
    let open = true;
    const id = setInterval(() => {
      if (document.hidden) return;
      api(`documents/${d.id}`)
        .then((fresh) => open && update(fresh))
        .catch(() => {});
    }, 3000);
    return () => {
      open = false;
      clearInterval(id);
    };
  }, [pending, d.id, update]);
  const localTask = (fn: () => Promise<void>) =>
    task(async () => {
      await fn();
      await reload();
    });
  async function save(archived = d.archived) {
    await patch(`documents/${d.id}`, { title, category, folder, draft, approved, archived });
  }
  const hasText = Boolean(d.ocr_text?.trim());
  return (
    <div className="drawer-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <section
        className="document-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Détails du courrier"
      >
        <header className="doc-head">
          <div>
            <span className={`status ${d.status}`}>{statuses[d.status]}</span>
            <h2>{d.title}</h2>
            <p className="muted">
              {d.sender || 'Expéditeur à identifier'} · reçu le {formatDate(d.created_at)}
            </p>
          </div>
          <button className="icon-button" aria-label="Fermer le courrier" onClick={close}>
            <X size={22} />
          </button>
        </header>
        <div className="doc-body">
          <div className="doc-source">
            <div className="doc-source-bar">
              <h3>Le courrier</h3>
              {images.length > 0 && hasText && (
                <div className="segmented" role="group" aria-label="Affichage du courrier">
                  <button
                    className={pane === 'pages' ? 'active' : ''}
                    aria-pressed={pane === 'pages'}
                    onClick={() => setPane('pages')}
                  >
                    Original
                  </button>
                  <button
                    className={pane === 'text' ? 'active' : ''}
                    aria-pressed={pane === 'text'}
                    onClick={() => setPane('text')}
                  >
                    Texte lu
                  </button>
                </div>
              )}
            </div>
            {pane === 'pages' && images.length > 0 ? (
              images.map((f) => (
                <img
                  className="page-image"
                  key={f.id}
                  src={`/api/files/${f.id}`}
                  alt={`Page ${f.ordinal} du courrier`}
                  loading="lazy"
                />
              ))
            ) : hasText ? (
              <LetterText text={d.ocr_text} quotes={quotes} />
            ) : (
              <p className="doc-source-empty">
                Le texte du courrier s’affichera ici, avec les passages qui justifient chaque
                échéance surlignés.
              </p>
            )}
            <div className="file-links">
              {d.files.map((f: Data) => (
                <a className="button secondary small" key={f.id} href={`/api/files/${f.id}`}>
                  <Download size={14} /> Original {f.ordinal}
                </a>
              ))}
            </div>
          </div>
          <div className="doc-analysis">
            {d.error && <p className="alert error">{d.error}</p>}
            {d.status === 'failed' && (
              <button
                className="button"
                onClick={() =>
                  void localTask(async () => {
                    await post(`documents/${d.id}/retry`);
                  })
                }
              >
                Relancer l’analyse
              </button>
            )}
            {['queued', 'processing'].includes(d.status) && (
              <p className="alert analysing" role="status">
                <Loader2 size={16} className="spin" /> Analyse en cours. Le résultat s’affichera ici
                dans un instant.
              </p>
            )}
            {d.status === 'capturing' && (
              <>
                <p className="alert">
                  Capture non terminée. Les pages déjà reçues sont conservées.
                </p>
                <button
                  className="button"
                  disabled={!d.files.length}
                  onClick={() =>
                    void localTask(async () => {
                      await post(`documents/${d.id}/complete`);
                    })
                  }
                >
                  Analyser les pages reçues
                </button>
              </>
            )}
            {d.status === 'ready' && (
              <>
                <section className="summary-card">
                  <h3>L’essentiel</h3>
                  <p>{d.summary}</p>
                </section>
                <section className="doc-block">
                  <h3>À faire</h3>
                  {d.actions.length ? (
                    d.actions.map((a: Data) => (
                      <Action
                        key={`${a.id}:${a.confirmed}:${a.done}`}
                        action={a}
                        task={localTask}
                      />
                    ))
                  ) : (
                    <p className="muted">Aucune action identifiée dans ce courrier.</p>
                  )}
                </section>
                <section className="doc-block">
                  <h3>Votre réponse, à votre main</h3>
                  <p className="subtle">
                    Relisez les faits et les engagements avant de valider. Aucun envoi automatique.
                  </p>
                  <textarea
                    aria-label="Brouillon de réponse"
                    className="draft"
                    rows={9}
                    value={draft}
                    maxLength={12000}
                    placeholder="Aucun brouillon proposé pour ce courrier. Vous pouvez rédiger ici."
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setApproved(false);
                    }}
                  />
                  <div className="draft-actions">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={approved}
                        onChange={(e) => setApproved(e.target.checked)}
                      />{' '}
                      J’ai relu et validé cette réponse.
                    </label>
                    <button
                      className="button secondary small"
                      disabled={!approved}
                      onClick={() =>
                        void localTask(async () => {
                          await save();
                          await navigator.clipboard.writeText(draft);
                          setCopied(true);
                        })
                      }
                    >
                      <Copy size={15} />
                      {copied ? 'Copié' : 'Copier la réponse'}
                    </button>
                  </div>
                </section>
                <section className="doc-block">
                  <h3>Classement</h3>
                  <div className="form-row">
                    <label>
                      Titre
                      <input
                        value={title}
                        maxLength={200}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      Catégorie
                      <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        {[
                          'Facture',
                          'Administratif',
                          'Assurance',
                          'Banque',
                          'Juridique',
                          'Autre',
                          'À classer',
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form-row even">
                    <label>
                      Dossier suivi
                      <select
                        aria-label="Rattacher ce courrier à un dossier"
                        value={d.dossier?.id || ''}
                        onChange={(e) =>
                          void task(async () => {
                            const updated = await api(`documents/${d.id}/dossier`, {
                              method: 'PUT',
                              body: JSON.stringify({ dossierId: e.target.value || null }),
                            });
                            update(updated);
                          })
                        }
                      >
                        <option value="">Aucun dossier</option>
                        {dossiers.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Classeur
                      <input
                        value={folder}
                        maxLength={100}
                        onChange={(e) => setFolder(e.target.value)}
                        placeholder="Ex. Comptabilité / 2026"
                      />
                    </label>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
        <footer className="drawer-actions">
          {d.status === 'ready' && (
            <>
              <button className="button" onClick={() => void localTask(() => save())}>
                Enregistrer
              </button>
              <button
                className="button secondary"
                onClick={() => void localTask(() => save(!d.archived))}
              >
                <Archive size={16} />
                {d.archived ? 'Désarchiver' : 'Archiver'}
              </button>
            </>
          )}
          <button
            className="button danger"
            onClick={() => {
              if (!confirm('Supprimer ce courrier et tous ses fichiers ? Action définitive.'))
                return;
              void task(async () => {
                await api(`documents/${d.id}`, { method: 'DELETE' });
                close();
              });
            }}
          >
            <Trash2 size={16} />
            Supprimer ce courrier
          </button>
        </footer>
      </section>
    </div>
  );
}

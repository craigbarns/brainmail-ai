'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Mail,
  LayoutDashboard,
  ScanLine,
  CalendarDays,
  Archive,
  Settings,
  Plus,
  Search,
  ArrowUpRight,
  FileText,
  Upload,
  Check,
  ChevronRight,
  X,
  LogOut,
  ShieldCheck,
  Clock3,
  Loader2,
  FolderOpen,
  Download,
  Copy,
  Trash2,
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
    [name, setName] = useState('');
  const refresh = useCallback(async () => {
    const [m, d, a] = await Promise.all([
      api('me'),
      api(`documents?archived=${view === 'archive'}&q=${encodeURIComponent(search)}`),
      api('actions'),
    ]);
    setMe(m);
    setDocs(d);
    setActions(a);
  }, [view, search]);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const id = setInterval(() => {
      // A hidden tab does not need live data; skip the round-trips.
      if (document.hidden) return;
      void refresh().catch((e) => setError(e.message));
    }, 15000);
    return () => clearInterval(id);
  }, [refresh]);
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
      for (const file of all) {
        const d = await post('documents');
        await api(`documents/${d.id}/files`, { method: 'POST', body: file });
        await post(`documents/${d.id}/complete`);
      }
      setNotice('Import terminé. L’analyse va démarrer.');
    });
  }
  const pending = actions.filter((a) => !a.done),
    unconfirmed = pending.filter((a) => !a.confirmed);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Mail size={22} />
          </span>
          BRAINMAIL<span className="brand-ai">.ai</span>
        </a>
        <label className="workspace-label">
          VOTRE ESPACE
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
        <nav>
          {[
            ['inbox', LayoutDashboard, 'Vue d’ensemble'],
            ['calendar', CalendarDays, 'Calendrier & actions'],
            ['archive', Archive, 'Archives'],
            ['settings', Settings, 'Préférences'],
          ].map(([key, Icon, label]) => {
            const I = Icon as typeof Mail;
            return (
              <button
                className={view === key ? 'active' : ''}
                key={key as string}
                onClick={() => {
                  setView(key as string);
                  setSelected(null);
                }}
              >
                <I size={19} />
                {label as string}
                {key === 'calendar' && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={18} />
            <div>
              Votre espace privé<small>Documents stockés chiffrés</small>
            </div>
          </div>
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
            <span>
              {me?.user.email || 'Connexion…'}
              <small>Se déconnecter</small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <main className="workspace-main">
        <header className="topbar">
          <span>
            {me?.workspace.name || 'Votre espace'} <ChevronRight size={14} />{' '}
            {view === 'inbox'
              ? 'Vue d’ensemble'
              : view === 'calendar'
                ? 'Calendrier'
                : view === 'archive'
                  ? 'Archives'
                  : 'Préférences'}
          </span>
          <span className="pilot">VERSION PILOTE</span>
        </header>
        <div className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }).format(new Date())}
              </p>
              <h1>
                {view === 'inbox'
                  ? 'L’esprit libre commence ici.'
                  : view === 'calendar'
                    ? 'Une longueur d’avance.'
                    : view === 'archive'
                      ? 'Chaque courrier, à sa place.'
                      : 'Un assistant qui vous ressemble.'}
              </h1>
              <p className="muted">
                {view === 'inbox'
                  ? 'Vos courriers, leurs échéances et la suite à donner.'
                  : view === 'calendar'
                    ? 'Vérifiez les dates proposées et gardez le fil de vos actions.'
                    : view === 'archive'
                      ? 'Retrouvez les documents que vous avez archivés.'
                      : 'Choisissez le contexte de votre société et vos intégrations.'}
              </p>
            </div>
            {view !== 'settings' && (
              <button
                className="button"
                disabled={busy}
                onClick={() => void task(async () => setScan(await post('scans')))}
              >
                <ScanLine size={18} /> Scanner un courrier
              </button>
            )}
          </div>
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
          ) : (
            <>
              <section className="stats">
                <article>
                  <span>Courriers dans cet espace</span>
                  <strong>{docs.length.toString().padStart(2, '0')}</strong>
                  <small>
                    <FileText size={14} />{' '}
                    {view === 'archive' ? 'Courriers archivés' : 'Une boîte de réception organisée'}
                  </small>
                </article>
                <article>
                  <span>Actions à suivre</span>
                  <strong>{pending.length.toString().padStart(2, '0')}</strong>
                  <small>
                    <Clock3 size={14} /> {unconfirmed.length} à vérifier
                  </small>
                </article>
                <article className="stat-accent">
                  <span>Vos prochaines étapes</span>
                  <strong>
                    {pending
                      .filter((a) => a.confirmed && a.due_date)
                      .length.toString()
                      .padStart(2, '0')}
                  </strong>
                  <small>
                    <CalendarDays size={14} /> Échéances confirmées
                  </small>
                </article>
              </section>
              {view === 'inbox' && (
                <section className="capture-strip">
                  <div className="capture-mark">
                    <ScanLine size={30} />
                  </div>
                  <div>
                    <h2>Le papier entre. La clarté suit.</h2>
                    <p>Scannez le QR code avec votre téléphone. Vos pages arrivent ici.</p>
                  </div>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void task(async () => setScan(await post('scans')))}
                  >
                    Ouvrir le scanner <ArrowUpRight size={16} />
                  </button>
                </section>
              )}
              <section className="document-section">
                <div className="section-heading">
                  <h2>{view === 'archive' ? 'Vos archives' : 'Votre courrier'}</h2>
                  <div className="document-tools">
                    <label className="search">
                      <Search size={16} />
                      <input
                        aria-label="Rechercher un courrier"
                        placeholder="Rechercher…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <label className="button secondary small">
                      <Upload size={15} /> Importer un PDF
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
                  </div>
                </div>
                {docs.length ? (
                  <div className="document-list">
                    <div className="table-head">
                      <span>DOCUMENT</span>
                      <span>CATÉGORIE</span>
                      <span>STATUT</span>
                      <span>REÇU LE</span>
                    </div>
                    {docs.map((d) => (
                      <button className="document-row" key={d.id} onClick={() => void open(d.id)}>
                        <div className="document-name">
                          <span className="file-icon">
                            <FileText size={20} />
                          </span>
                          <span>
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
                        </div>
                        <span className="category">{d.category}</span>
                        <span className={`status ${d.status}`}>
                          {['processing', 'queued'].includes(d.status) && (
                            <Loader2 size={12} className="spin" />
                          )}
                          {statuses[d.status]}
                        </span>
                        <span className="document-date">
                          {formatDate(d.created_at)} <ChevronRight size={16} />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-art">
                      <Mail size={38} />
                      <span>
                        <Check size={16} />
                      </span>
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
                        ? 'Essayez le nom de l’expéditeur, un titre ou un dossier.'
                        : 'Scannez un courrier ou importez un PDF pour commencer.'}
                    </p>
                  </div>
                )}
              </section>
              <p className="bottom-note">
                <ShieldCheck size={14} /> Vous gardez la main : les réponses et les échéances sont à
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
            <button className="close" aria-label="Fermer le scanner" onClick={() => setScan(null)}>
              <X />
            </button>
            <p className="eyebrow">DE L’ORDINATEUR AU TÉLÉPHONE</p>
            <h2 id="scan-title">Votre téléphone devient un scanner.</h2>
            <p className="muted">Ouvrez l’appareil photo de votre téléphone et visez ce QR code.</p>
            <div className="qr-wrap">
              <img src={scan.qr} alt="QR code temporaire pour scanner le courrier" />
            </div>
            <div className="scan-status">
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
              <>
                <a className="text-button" href={scan.url} target="_blank" rel="noreferrer">
                  Ouvrir la capture sur cet appareil
                </a>
                <button
                  className="text-button"
                  onClick={() =>
                    void task(async () => {
                      await api(`scans/${scan.id}`, { method: 'DELETE' });
                      setScan(null);
                    })
                  }
                >
                  Révoquer ce QR code
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {selected && (
        <DocumentPanel
          document={selected}
          close={() => setSelected(null)}
          task={task}
          update={setSelected}
        />
      )}
    </div>
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
        <label className="checkbox-label">
          <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} />{' '}
          Synchroniser ces préférences avec Mem0
        </label>
        <p className="subtle">
          Seules ces préférences sont partagées. La base de BRAINMAIL reste la référence. Désactiver
          arrête les futures synchronisations ; cela n’efface pas les copies déjà transmises.
        </p>
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
        <h2>Connexions</h2>
        <p className="muted">
          État de configuration. Une clé présente ne garantit pas que le service est opérationnel.
        </p>
        {[
          ['ocr', 'Mistral OCR'],
          ['llm', 'OpenRouter'],
          ['email', 'Resend · rappels'],
          ['memory', 'Mem0'],
          ['inbox', 'Resend · réception'],
        ].map(([key, label]) => (
          <div className="integration-row" key={key}>
            <span>{label}</span>
            <span className={`status ${me.integrations[key] ? 'ready' : 'capturing'}`}>
              {me.integrations[key] ? 'Configuré' : 'À connecter'}
            </span>
          </div>
        ))}
        <div className="integration-row">
          <span>Stockage</span>
          <small>{me.integrations.storage}</small>
        </div>
        {me.integrationJobs?.some((j: Data) => j.state === 'failed') && (
          <p className="alert error">
            Une synchronisation mémoire ou réception email a échoué. Vérifiez la configuration et
            les tâches du worker.
          </p>
        )}
        <h3>Votre adresse de réception</h3>
        {me.workspace.inbox_address ? (
          <>
            <p className="inbox-address">{me.workspace.inbox_address}</p>
            <button
              className="button secondary small"
              onClick={() => {
                if (!confirm('Changer cette adresse ? Les emails envoyés à l’ancienne adresse seront ignorés.')) return;
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
              À activer après validation du domaine de réception dans Resend.
            </p>
            <button
              disabled={!me.integrations.inbox}
              className="button secondary"
              onClick={() =>
                void task(async () => {
                  await post('inbox');
                  setNotice('Boîte de réception créée.');
                })
              }
            >
              Activer ma boîte
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
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const start = new Date(`${month}-01T12:00:00`),
    offset = (start.getDay() + 6) % 7,
    days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return (
    <>
      <section className="panel calendar-panel">
        <div className="section-heading">
          <h2>Votre calendrier</h2>
          <input
            aria-label="Mois du calendrier"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
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
              <div className={`day ${items.length ? 'has-action' : ''}`} key={date}>
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
      </section>
      <section className="panel actions-panel">
        <h2>Actions à suivre</h2>
        {!actions.length && (
          <p className="muted">Les actions extraites de vos courriers apparaîtront ici.</p>
        )}
        {actions.map((a) => (
          <Action key={a.id} action={a} task={task} />
        ))}
      </section>
    </>
  );
}
function Action({
  action,
  task,
}: {
  action: Data;
  task: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [label, setLabel] = useState(action.label),
    [date, setDate] = useState(action.due_date || '');
  return (
    <div className={`action-card ${action.done ? 'done' : ''}`}>
      <label>
        Action
        <input value={label} maxLength={300} onChange={(e) => setLabel(e.target.value)} />
      </label>
      {action.evidence && <blockquote>« {action.evidence} »</blockquote>}
      <div className="action-controls">
        <label>
          Échéance
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button
          className="button secondary small"
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
    [copied, setCopied] = useState(false);
  const reload = async () => update(await api(`documents/${d.id}`));
  const localTask = (fn: () => Promise<void>) =>
    task(async () => {
      await fn();
      await reload();
    });
  async function save(archived = d.archived) {
    await patch(`documents/${d.id}`, { title, category, folder, draft, approved, archived });
  }
  return (
    <div className="drawer-backdrop">
      <section
        className="document-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Détails du courrier"
      >
        <header>
          <span className={`status ${d.status}`}>{statuses[d.status]}</span>
          <button aria-label="Fermer le courrier" onClick={close}>
            <X />
          </button>
        </header>
        <h2>{d.title}</h2>
        <p className="muted">
          {d.sender || 'Expéditeur à identifier'} · {formatDate(d.created_at)}
        </p>
        <div className="file-links">
          {d.files.map((f: Data) => (
            <a className="button secondary small" key={f.id} href={`/api/files/${f.id}`}>
              <Download size={14} /> Original {f.ordinal}
            </a>
          ))}
        </div>
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
          <p className="alert">
            L’analyse est en cours.{' '}
            <button className="text-button" onClick={() => void localTask(async () => {})}>
              Actualiser
            </button>
          </p>
        )}
        {d.status === 'capturing' && (
          <>
            <p className="alert">Capture non terminée. Les pages déjà reçues sont conservées.</p>
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
              <p className="eyebrow">L’ESSENTIEL</p>
              <p>{d.summary}</p>
            </section>
            <div className="form-row">
              <label>
                Titre
                <input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
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
            <label>
              Dossier
              <input
                value={folder}
                maxLength={100}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="Ex. Comptabilité / 2026"
              />
            </label>
            <h3>Actions & échéances</h3>
            {d.actions.length ? (
              d.actions.map((a: Data) => (
                <Action key={`${a.id}:${a.confirmed}:${a.done}`} action={a} task={localTask} />
              ))
            ) : (
              <p className="muted">Aucune action identifiée.</p>
            )}
            <h3>Votre réponse, à votre main</h3>
            <p className="subtle">
              Relisez les faits et les engagements avant de valider. Aucun envoi automatique.
            </p>
            <textarea
              aria-label="Brouillon de réponse"
              rows={10}
              value={draft}
              maxLength={12000}
              onChange={(e) => {
                setDraft(e.target.value);
                setApproved(false);
              }}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />{' '}
              J’ai relu et validé cette réponse.
            </label>
            <div className="drawer-actions">
              <button className="button" onClick={() => void localTask(() => save())}>
                Enregistrer
              </button>
              <button
                className="button secondary"
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
              <button
                className="button secondary"
                onClick={() => void localTask(() => save(!d.archived))}
              >
                <Archive size={15} />
                {d.archived ? 'Désarchiver' : 'Archiver'}
              </button>
            </div>
            <details>
              <summary>Texte extrait du document</summary>
              <pre className="ocr-text">{d.ocr_text}</pre>
            </details>
          </>
        )}
        <button
          className="button secondary"
          onClick={() => {
            if (!confirm('Supprimer ce courrier et tous ses fichiers ? Action définitive.'))
              return;
            void task(async () => {
              await api(`documents/${d.id}`, { method: 'DELETE' });
              close();
            });
          }}
        >
          <Trash2 size={15} />
          Supprimer ce courrier
        </button>
      </section>
    </div>
  );
}

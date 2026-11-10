'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Mail, Plus, Send } from 'lucide-react';
import { api, post } from '@/components/client';
export default function Scan() {
  const [ready, setReady] = useState(false),
    [pages, setPages] = useState(0),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState(''),
    [previews, setPreviews] = useState<string[]>([]),
    [member, setMember] = useState(false);
  const started = useRef(false);
  const urls = useRef<string[]>([]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = location.hash.slice(1);
    history.replaceState(null, '', '/scan');
    (token ? post('mobile/pair', { token }) : Promise.resolve())
      .then(() => api('mobile/status'))
      .then((r) => {
        setPages(r.pages);
        setReady(true);
      })
      .catch((e) => setError(e.message));
    // Signed in on this very phone? Then the mail can be opened here, no computer needed.
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => setMember(r.ok))
      .catch(() => {});
    return () => {
      urls.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        await api('mobile/pages', { method: 'POST', body: file });
        setPages((p) => p + 1);
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          urls.current.push(url);
          setPreviews((p) => [...p, url]);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="scan-page">
      <div className="brand">
        <span className="brand-icon">
          <Mail />
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </div>
      <div className="scan-card">
        {done ? (
          <>
            <div className="success-icon">
              <CheckCircle2 size={36} />
            </div>
            <h1>C’est dans la boîte.</h1>
            <p>
              {pages > 1 ? `Vos ${pages} pages ont été transmises.` : 'Votre page a été transmise.'}{' '}
              {member
                ? 'L’analyse démarre : le résultat arrive dans votre espace.'
                : 'Retrouvez l’analyse sur votre ordinateur.'}
            </p>
            {member && (
              <a className="button full" href="/app">
                Voir mes courriers
              </a>
            )}
          </>
        ) : (
          <>
            <p className="overline">Capture sécurisée · 15 minutes</p>
            <h1>
              Un courrier,
              <br />
              quelques photos.
            </h1>
            <p className="muted">
              Posez vos pages à plat, dans un endroit lumineux. Elles apparaissent automatiquement
              sur votre ordinateur.
            </p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            {ready && (
              <>
                <label className={`capture-button ${busy ? 'disabled' : ''}`}>
                  <Camera size={30} />
                  <strong>
                    {busy
                      ? 'Transfert en cours…'
                      : pages
                        ? 'Ajouter une page'
                        : 'Photographier la première page'}
                  </strong>
                  <input
                    aria-label="Photographier une page"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    disabled={busy}
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <label className="button secondary full">
                  <Plus size={16} /> Choisir plusieurs photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    disabled={busy}
                    onChange={(e) => {
                      void upload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div className="page-count">{pages} / 20 pages transmises</div>
                <div className="thumbnails">
                  {previews.map((p, i) => (
                    <img alt={`Page ${i + 1}`} src={p} key={p} />
                  ))}
                </div>
                <button
                  className="button full"
                  disabled={busy || !pages}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await post('mobile/complete');
                      setDone(true);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Terminer et analyser <Send size={16} />
                </button>
                <small>Le lien ne donne accès qu’à ce nouveau courrier.</small>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

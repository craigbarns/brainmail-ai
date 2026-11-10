'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { post } from '@/components/client';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
export default function Login() {
  const [mode, setMode] = useState<Mode>('login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [resetToken, setResetToken] = useState('');
  useEffect(() => {
    setMode(new URLSearchParams(location.search).has('register') ? 'register' : 'login');
    const token = new URLSearchParams(location.hash.slice(1)).get('verify');
    if (token) {
      history.replaceState(null, '', '/login');
      post('auth/verify', { token })
        .then(() => setNotice('Adresse vérifiée. Vous pouvez vous connecter.'))
        .catch((e) => setError(e.message));
    }
    // The token travels in the fragment; links already sent used the query string.
    const reset =
      new URLSearchParams(location.hash.slice(1)).get('reset') ||
      new URLSearchParams(location.search).get('reset');
    if (reset) {
      history.replaceState(null, '', '/login');
      setResetToken(reset);
      setMode('reset');
      setNotice('Choisissez un nouveau mot de passe (12 caractères minimum).');
    }
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const name = new FormData(e.currentTarget).get('name');
      if (mode === 'forgot') {
        const r = await post('auth/forgot', { email });
        setNotice(r.message);
        setMode('login');
        return;
      }
      if (mode === 'reset') {
        await post('auth/reset', { token: resetToken, password });
        setNotice('Mot de passe modifié. Connectez-vous avec le nouveau.');
        setMode('login');
        return;
      }
      if (mode === 'register') {
        const result = await post('auth/register', { email, password, name });
        if (result.verificationRequired) {
          setNotice(
            result.verificationSent
              ? 'Consultez votre boîte email pour vérifier votre adresse.'
              : 'Compte créé. La vérification email nécessite la configuration de Resend.',
          );
          setMode('login');
          return;
        }
      }
      await post('auth/login', { email, password });
      location.href = '/app';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<Mode, [string, string]> = {
    login: ['Heureux de vous retrouver.', 'Retrouvez vos courriers et vos prochaines actions.'],
    register: ['Un espace pour vous.', 'Commencez par votre première société.'],
    forgot: [
      'Mot de passe oublié ?',
      'Indiquez votre adresse : un lien de réinitialisation part par email, valable 2 heures.',
    ],
    reset: ['Nouveau mot de passe.', 'Toutes vos sessions actives seront déconnectées.'],
  };
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span className="brand-icon">
          <Mail />
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </Link>
      <section className="auth-card">
        <p className="overline">Votre courrier, l’esprit libre</p>
        <h1>{titles[mode][0]}</h1>
        <p className="muted">{titles[mode][1]}</p>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="alert">
            {notice}
          </p>
        )}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Nom de votre espace
              <input name="name" required minLength={2} maxLength={80} placeholder="Ma société" />
            </label>
          )}
          {mode !== 'reset' && (
            <label>
              Adresse email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="vous@entreprise.fr"
              />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              {mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}
              <input
                type="password"
                required
                minLength={mode === 'login' ? undefined : 12}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode !== 'login' && <small>12 caractères minimum.</small>}
            </label>
          )}
          <button disabled={busy} className="button full">
            {busy
              ? 'Un instant…'
              : mode === 'register'
                ? 'Créer mon espace'
                : mode === 'forgot'
                  ? 'Envoyer le lien'
                  : mode === 'reset'
                    ? 'Enregistrer le mot de passe'
                    : 'Se connecter'}
            <ArrowRight size={17} />
          </button>
        </form>
        {mode === 'login' && (
          <>
            <button
              className="text-button"
              onClick={() => {
                setMode('forgot');
                setError('');
                setNotice('');
              }}
            >
              Mot de passe oublié ?
            </button>
            <button
              className="text-button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Créer un compte
            </button>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await post('auth/resend-verification', { email, password });
                  setNotice('Si les identifiants sont corrects, un nouveau lien a été demandé.');
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Renvoyer le lien de vérification
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button
            className="text-button"
            onClick={() => {
              setMode('login');
              setError('');
              setNotice('');
            }}
          >
            Retour à la connexion
          </button>
        )}
      </section>
      <p className="security-note">
        <ShieldCheck size={16} /> Un accès privé à vos documents.
      </p>
    </main>
  );
}

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { post } from '@/components/client';
export default function Login() {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  useEffect(() => {
    setRegister(new URLSearchParams(location.search).has('register'));
    const token = new URLSearchParams(location.hash.slice(1)).get('verify');
    if (token) {
      history.replaceState(null, '', '/login');
      post('auth/verify', { token })
        .then(() => setNotice('Adresse vérifiée. Vous pouvez vous connecter.'))
        .catch((e) => setError(e.message));
    }
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const name = new FormData(e.currentTarget).get('name');
      if (register) {
        const result = await post('auth/register', { email, password, name });
        if (result.verificationRequired) {
          setNotice(
            result.verificationSent
              ? 'Consultez votre boîte email pour vérifier votre adresse.'
              : 'Compte créé. La vérification email nécessite la configuration de Resend.',
          );
          setRegister(false);
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
  return (
    <main className="auth-page">
      <Link href="/" className="brand">
        <span className="brand-icon">
          <Mail />
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </Link>
      <section className="auth-card">
        <p className="eyebrow">VOTRE COURRIER, L’ESPRIT LIBRE</p>
        <h1>{register ? 'Un espace pour vous.' : 'Heureux de vous retrouver.'}</h1>
        <p className="muted">
          {register
            ? 'Commencez par votre première société.'
            : 'Retrouvez vos courriers et vos prochaines actions.'}
        </p>
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
          {register && (
            <label>
              Nom de votre espace
              <input name="name" required minLength={2} maxLength={80} placeholder="Ma société" />
            </label>
          )}
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
          <label>
            Mot de passe
            <input
              type="password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
            <small>12 caractères minimum.</small>
          </label>
          <button disabled={busy} className="button full">
            {busy ? 'Un instant…' : register ? 'Créer mon espace' : 'Se connecter'}
            <ArrowRight size={17} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register ? 'J’ai déjà un compte' : 'Créer un compte'}
        </button>
        {!register && (
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
        )}
      </section>
      <p className="security-note">
        <ShieldCheck size={16} /> Un accès privé à vos documents.
      </p>
    </main>
  );
}

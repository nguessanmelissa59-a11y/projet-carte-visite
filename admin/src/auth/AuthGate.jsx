import { useEffect, useState } from 'react';
import { fetchMe } from '../api/client.js';
import LoginHint from '../pages/LoginHint.jsx';

export default function AuthGate({ children }) {
  const [state, setState] = useState({
    loading: true,
    user: null,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchMe();
        if (cancelled) return;
        setState({ loading: false, user: data.user || null, error: null });
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401) {
          setState({ loading: false, user: null, error: null });
          return;
        }
        setState({
          loading: false,
          user: null,
          error: err.message || 'Impossible de vérifier la session'
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="app-shell">
        <div className="status-banner">
          <p className="eyebrow">Admin</p>
          <h1>Chargement…</h1>
          <p>Vérification de la session.</p>
        </div>
      </div>
    );
  }

  if (!state.user) {
    return <LoginHint error={state.error} />;
  }

  if (state.user.role !== 'admin') {
    return (
      <div className="app-shell">
        <div className="status-banner">
          <p className="eyebrow">Accès refusé</p>
          <h1>Réservé aux administrateurs</h1>
          <p>
            Connecté en tant que {state.user.email}. Ce compte n’a pas le rôle
            admin. Ajoutez votre e-mail dans ADMIN_EMAILS puis reconnectez-vous.
          </p>
          <a className="btn" href="/">
            Retour à l’éditeur
          </a>
        </div>
      </div>
    );
  }

  return children(state.user);
}

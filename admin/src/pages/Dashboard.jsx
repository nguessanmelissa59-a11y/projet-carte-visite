import { useEffect, useState } from 'react';
import { fetchAdminStats } from '../api/client.js';

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return String(value);
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchAdminStats();
        if (!cancelled) setStats(data.stats || null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <p className="eyebrow">Vue d’ensemble</p>
      <h2 className="page-title">Tableau de bord</h2>
      <p className="page-lead">
        Indicateurs globaux des comptes, cartes et scans.
      </p>

      {loading ? <p className="message">Chargement des stats…</p> : null}
      {error ? <p className="message is-error">{error}</p> : null}

      {stats ? (
        <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
          <article className="stat-card">
            <p className="stat-label">Utilisateurs</p>
            <p className="stat-value">{stats.usersTotal}</p>
            <p className="stat-meta">{stats.adminsTotal} admin(s)</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Cartes</p>
            <p className="stat-value">{stats.cardsTotal}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Scans</p>
            <p className="stat-value">{stats.scansTotal}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Dernière MAJ carte</p>
            <p className="stat-value" style={{ fontSize: '1rem' }}>
              {formatDate(stats.latestCardUpdate)}
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}

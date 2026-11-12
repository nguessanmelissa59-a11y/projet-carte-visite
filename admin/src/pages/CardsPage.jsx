import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { deleteAdminCard, fetchAdminCards } from '../api/client.js';

function cardTitle(card) {
  const name = `${card.firstName || ''} ${card.lastName || ''}`.trim();
  return name || card.slug;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  } catch {
    return String(value);
  }
}

export default function CardsPage() {
  const [cards, setCards] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminCards();
      setCards(data.cards || []);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(card) {
    const ok = window.confirm(
      `Supprimer la carte « ${cardTitle(card)} » (${card.slug}) ?`
    );
    if (!ok) return;
    setBusySlug(card.slug);
    setMessage('');
    setError('');
    try {
      await deleteAdminCard(card.slug);
      setMessage(`Carte ${card.slug} supprimée.`);
      await load();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    } finally {
      setBusySlug('');
    }
  }

  return (
    <section>
      <p className="eyebrow">Contenu</p>
      <h2 className="page-title">Cartes</h2>
      <p className="page-lead">
        Toutes les fiches enregistrées, avec scans et propriétaire.
      </p>

      {loading ? <p className="message">Chargement…</p> : null}
      {error ? <p className="message is-error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}

      {!loading && !cards.length ? (
        <p className="empty" style={{ marginTop: '1rem' }}>
          Aucune carte pour le moment.
        </p>
      ) : null}

      <div className="list" style={{ marginTop: '1.25rem' }}>
        {cards.map((card) => (
          <article key={card.slug} className="list-item">
            <div>
              <h3 className="item-title">{cardTitle(card)}</h3>
              <p className="item-meta">
                {card.slug} · {card.scans} scan(s) · {formatDate(card.updatedAt)}
              </p>
              <p className="item-meta">
                {card.ownerEmail || 'Sans compte lié'}
                {card.organization ? ` · ${card.organization}` : ''}
              </p>
            </div>
            <div className="item-actions">
              <a
                className="btn"
                href={`/c/${encodeURIComponent(card.slug)}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} strokeWidth={1.75} />
                Voir
              </a>
              <a
                className="btn"
                href={`/?id=${encodeURIComponent(card.slug)}`}
              >
                <Pencil size={16} strokeWidth={1.75} />
                Éditer
              </a>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busySlug === card.slug}
                onClick={() => onDelete(card)}
              >
                <Trash2 size={16} strokeWidth={1.75} />
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminUsers, updateUserRole } from '../api/client.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRoleChange(user, role) {
    if (role === user.role) return;
    setBusyId(user.id);
    setMessage('');
    setError('');
    try {
      await updateUserRole(user.id, role);
      setMessage(`Rôle mis à jour pour ${user.email}.`);
      await load();
    } catch (err) {
      setError(err.message || 'Mise à jour du rôle impossible');
    } finally {
      setBusyId('');
    }
  }

  return (
    <section>
      <p className="eyebrow">Comptes</p>
      <h2 className="page-title">Utilisateurs & rôles</h2>
      <p className="page-lead">
        Promouvoir ou rétrograder un compte. Au moins un admin doit rester.
      </p>

      {loading ? <p className="message">Chargement…</p> : null}
      {error ? <p className="message is-error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}

      {!loading && !users.length ? (
        <p className="empty" style={{ marginTop: '1rem' }}>
          Aucun utilisateur.
        </p>
      ) : null}

      <div className="list" style={{ marginTop: '1.25rem' }}>
        {users.map((user) => {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          return (
            <article key={user.id} className="list-item">
              <div>
                <h3 className="item-title">{name || user.email}</h3>
                <p className="item-meta">{user.email}</p>
                <p className="item-meta">
                  {user.cardsCount} carte(s)
                  {user.emailVerified ? ' · vérifié' : ' · non vérifié'}
                </p>
              </div>
              <div className="item-actions">
                <label className="sr-only" htmlFor={`role-${user.id}`}>
                  Rôle de {user.email}
                </label>
                <select
                  id={`role-${user.id}`}
                  className="role-select"
                  value={user.role}
                  disabled={busyId === user.id}
                  onChange={(event) => onRoleChange(user, event.target.value)}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

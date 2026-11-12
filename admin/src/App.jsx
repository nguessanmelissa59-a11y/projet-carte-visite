import { useState } from 'react';
import { LogOut } from 'lucide-react';
import AuthGate from './auth/AuthGate.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CardsPage from './pages/CardsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import { logout } from './api/client.js';

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'cards', label: 'Cartes' },
  { id: 'users', label: 'Utilisateurs' }
];

function AdminShell({ user }) {
  const [tab, setTab] = useState('dashboard');
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await logout();
      window.location.href = '/auth?next=/admin';
    } catch {
      window.location.href = '/auth?next=/admin';
    }
  }

  return (
    <div className="app-shell">
      <header className="admin-header">
        <a className="brand" href="/admin">
          <span className="brand-mark" aria-hidden="true">
            EM
          </span>
          <span className="brand-title">EVC Admin</span>
        </a>
        <div className="header-actions">
          <span className="user-chip" title={user.email}>
            {user.email}
          </span>
          <a className="btn" href="/">
            Éditeur
          </a>
          <button
            type="button"
            className="btn"
            onClick={onLogout}
            disabled={busy}
          >
            <LogOut size={16} strokeWidth={1.75} />
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="nav-tabs" aria-label="Sections admin">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'dashboard' ? <Dashboard /> : null}
        {tab === 'cards' ? <CardsPage /> : null}
        {tab === 'users' ? <UsersPage /> : null}
      </main>
    </div>
  );
}

export default function App() {
  return <AuthGate>{(user) => <AdminShell user={user} />}</AuthGate>;
}

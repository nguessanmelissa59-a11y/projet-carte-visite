export default function LoginHint({ error }) {
  return (
    <div className="app-shell">
      <div className="status-banner">
        <p className="eyebrow">Admin EVC</p>
        <h1>Connexion requise</h1>
        <p>
          Connectez-vous avec un compte administrateur pour gérer les cartes,
          les utilisateurs et les rôles.
        </p>
        {error ? <p className="message is-error">{error}</p> : null}
        <a className="btn btn-primary" href="/auth?next=/admin">
          Se connecter
        </a>
      </div>
    </div>
  );
}

import { useState } from 'react'
import { deleteAccount } from '../api'

// onClose: sulkee komponentin (palaa chatiin)
// onDeleted: kutsutaan kun tili on poistettu (kirjaa ulos App:ssa)
function DeleteAccount({ onClose, onDeleted }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError('');

    if (!password) {
      setError('Anna salasana vahvistukseksi.');
      return;
    }

    setLoading(true);
    try {
      await deleteAccount(password);
      // Onnistui → kerrotaan App:lle että tili poistettiin
      onDeleted();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2 className="modal-title">Poista tili</h2>
        <p className="modal-text">
          Tämä poistaa tilisi ja kaikki keskustelusi pysyvästi.
          Tätä ei voi perua.
        </p>

        <input
          type="password"
          placeholder="Vahvista salasanalla"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          autoComplete="current-password"
        />

        {error && <p className="login-error">{error}</p>}

        <div className="modal-buttons">
          <button className="modal-cancel" onClick={onClose} disabled={loading}>
            Peruuta
          </button>
          <button className="modal-delete" onClick={handleDelete} disabled={loading}>
            {loading ? 'Poistetaan...' : 'Poista tili'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccount;
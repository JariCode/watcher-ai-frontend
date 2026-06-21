import { useState, useEffect } from 'react'
import { getAllUsers, adminDeleteUser, adminSetRole } from '../api'

// onClose: sulkee paneelin
// currentUserId: kirjautuneen adminin oma id (ettei näytetä poista-nappia itselle)
function AdminPanel({ onClose, currentUserId }) {
  // Käyttäjälista
  const [users, setUsers] = useState([]);

  // Virheviesti
  const [error, setError] = useState('');

  // Vahvistusta odottava poisto (käyttäjän id, tai null)
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Vahvistusta odottava roolin vaihto (käyttäjän id, tai null)
  const [confirmRole, setConfirmRole] = useState(null);

  // Ladataan käyttäjät kun paneeli avautuu
  useEffect(() => {
    loadUsers();
  }, []);

  // Hakee käyttäjälistan backendista
  async function loadUsers() {
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err) {
      setError(err.message);
    }
  }

  // Vaihtaa käyttäjän roolin (user <-> admin)
  async function handleToggleRole(u) {
    setError('');
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await adminSetRole(u._id, newRole);
      setConfirmRole(null);   // nollataan vahvistus
      await loadUsers();      // päivitetään lista
    } catch (err) {
      setError(err.message);
    }
  }

  // Poistaa käyttäjän (vahvistuksen jälkeen)
  async function handleDelete(id) {
    setError('');
    try {
      await adminDeleteUser(id);
      setConfirmDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal admin-modal">
        <h2 className="modal-title admin-title">Käyttäjien hallinta</h2>

        {error && <p className="login-error">{error}</p>}

        {/* Käyttäjälista */}
        <div className="admin-list">
          {users.map((u) => (
            <div key={u._id} className="admin-row">
              <div className="admin-info">
                <span className="admin-name">{u.username}</span>
                <span className={`admin-role admin-role-${u.role}`}>{u.role}</span>
              </div>

              {/* Omalle tilille ei näytetä toimintoja */}
              {u._id !== currentUserId && (
                <div className="admin-actions">
                 {/* Roolin vaihto — kaksivaiheinen vahvistus */}
                  {confirmRole === u._id ? (
                    <button
                      className="admin-btn"
                      onClick={() => handleToggleRole(u)}
                    >
                      {u.role === 'admin' ? 'Vahvista: poista oikeudet' : 'Vahvista: anna oikeudet'}
                    </button>
                  ) : (
                    <button
                      className="admin-btn"
                      onClick={() => setConfirmRole(u._id)}
                    >
                      {u.role === 'admin' ? 'Poista admin-oikeudet' : 'Anna admin-oikeudet'}
                    </button>
                  )}

                  {/* Poisto — kaksivaiheinen vahvistus */}
                  {confirmDelete === u._id ? (
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleDelete(u._id)}
                    >
                      Vahvista poisto
                    </button>
                  ) : (
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => setConfirmDelete(u._id)}
                    >
                      Poista
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="modal-cancel" onClick={onClose}>
          Sulje
        </button>
      </div>
    </div>
  );
}

export default AdminPanel;
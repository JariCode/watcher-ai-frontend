// Sivupalkki: uusi keskustelu + lista + käyttäjän napit alhaalla
function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, user, onLogout, onDeleteAccount, onClose, onAdmin }) {
  return (
    <aside className="sidebar">
      {/* Sulkunappi — näkyy vain mobiilissa */}
      <button className="sidebar-close" onClick={onClose}>
        ×
      </button>

      {/* Uusi keskustelu */}
      <button className="sidebar-new" onClick={onNew}>
        + Uusi keskustelu
      </button>

      {/* Lista keskusteluista */}
      <div className="sidebar-list">
        {conversations.length === 0 && (
          <p className="sidebar-empty">Ei keskusteluja vielä.</p>
        )}

        {conversations.map((conv) => (
          <div
            key={conv._id}
            className={`sidebar-item ${conv._id === activeId ? 'is-active' : ''}`}
            onClick={() => onSelect(conv._id)}
          >
            <span className="sidebar-item-title">{conv.title}</span>
            <button
              className="sidebar-item-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv._id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Alaosa: käyttäjä ja napit */}
      <div className="sidebar-footer">
        <div className="sidebar-user">{user?.username}</div>

        {/* Admin-nappi näkyy vain adminille */}
        {user?.role === 'admin' && (
          <button className="sidebar-footer-btn sidebar-footer-admin" onClick={onAdmin}>
            Käyttäjien hallinta
          </button>
        )}

        <button className="sidebar-footer-btn" onClick={onLogout}>
          Kirjaudu ulos
        </button>
        <button className="sidebar-footer-btn sidebar-footer-danger" onClick={onDeleteAccount}>
          Poista tili
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
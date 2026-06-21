import { useState, useEffect } from 'react'
import watcherImg from '../assets/watcher.png'
import { logout } from '../api'
import DeleteAccount from './DeleteAccount'
import Sidebar from './Sidebar'

function Chat({ user, onLogout }) {
  // Pupillin siirtymä keskeltä (x ja y pikseleinä)
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  // Kaikki keskustelun viestit
  const [messages, setMessages] = useState([
    { sender: 'watcher', text: 'Näen sinut. Mitä etsit pimeydestä?' },
  ]);

  // Syöttökentän nykyinen sisältö
  const [input, setInput] = useState('');

  // Näytetäänkö tilin poisto -ikkuna
  const [showDelete, setShowDelete] = useState(false);

  // Onko sivupalkki auki (mobiilissa)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // VÄLIAIKAINEN esimerkkilista (korvataan backend-datalla seuraavaksi)
  const [conversations] = useState([
    { _id: '1', title: 'Ensimmäinen keskustelu' },
    { _id: '2', title: 'Kysymyksiä pimeydestä' },
    { _id: '3', title: 'Uusi keskustelu' },
  ]);
  const [activeId, setActiveId] = useState('1');

  // Seurataan hiirtä, jotta silmät katsovat kursoria
  useEffect(() => {
    function handleMouseMove(e) {
      const eyesX = window.innerWidth / 2;
      const eyesY = 60;
      const dx = e.clientX - eyesX;
      const dy = e.clientY - eyesY;
      const angle = Math.atan2(dy, dx);
      const distance = Math.min(6, Math.hypot(dx, dy) / 40);
      setPupil({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      });
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Lähettää käyttäjän viestin
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'watcher', text: 'Kuulen sanasi. Pian vastaan oikeasti...' },
      ]);
    }, 600);
  }

  // Uloskirjautuminen
  async function handleLogout() {
    try {
      await logout();        // poistaa tokenin backendissä
      onLogout();            // kertoo App:lle → palataan login-sivulle
    } catch (err) {
      console.error('Uloskirjautuminen epäonnistui:', err.message);
    }
  }

  return (
    <div className="layout">
      {/* Tumma peite mobiilissa kun sivupalkki auki — klikkaus sulkee */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sivupalkin kääre — mobiilissa liukuu päälle */}
      <div className={`sidebar-wrap ${sidebarOpen ? 'is-open' : ''}`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);   // sulkee sivupalkin mobiilissa valinnan jälkeen
          }}
          onNew={() => console.log('uusi keskustelu')}
          onDelete={(id) => console.log('poista', id)}
          user={user}
          onLogout={handleLogout}
          onDeleteAccount={() => setShowDelete(true)}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="app">
        {/* Taustakuva chatin takana, vahvasti himmennetty */}
        <img src={watcherImg} alt="" className="chat-bg" />

        {/* Hampurilaisnappi — näkyy vain mobiilissa */}
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>

        <header className="header">
          <div className="eyes">
            <div className="eye eye-left">
              <div
                className="pupil"
                style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
              ></div>
            </div>
            <div className="eye eye-right">
              <div
                className="pupil"
                style={{ transform: `translate(${pupil.x}px, ${pupil.y}px)` }}
              ></div>
            </div>
          </div>
          <h1>Watcher AI</h1>
        </header>

        <main className="messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message message-${msg.sender === 'user' ? 'user' : 'watcher'}`}
            >
              <p>{msg.text}</p>
            </div>
          ))}
        </main>

        <footer className="composer">
          <input
            type="text"
            placeholder="Kysy jotain..."
            className="composer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="composer-send" onClick={handleSend}>
            Lähetä
          </button>
        </footer>

        {/* Tilin poisto -ikkuna, näkyy vain kun showDelete on tosi */}
        {showDelete && (
          <DeleteAccount
            onClose={() => setShowDelete(false)}
            onDeleted={onLogout}
          />
        )}
      </div>
    </div>
  );
}

export default Chat;
import { useState, useEffect } from 'react'
import watcherImg from '../assets/watcher.png'
import {
  logout,
  getConversations,
  getConversation,
  createConversation,
  deleteConversation,
  sendMessage,
} from '../api'
import DeleteAccount from './DeleteAccount'
import Sidebar from './Sidebar'

function Chat({ user, onLogout }) {
  // Pupillin siirtymä keskeltä (x ja y pikseleinä)
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  // Keskustelulista sivupalkkiin
  const [conversations, setConversations] = useState([]);

  // Avoinna olevan keskustelun id ja sen viestit
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);

  // Syöttökenttä
  const [input, setInput] = useState('');

  // Odottaako Watcherin vastausta
  const [sending, setSending] = useState(false);

  // Tilin poisto -ikkuna ja sivupalkin tila (mobiili)
  const [showDelete, setShowDelete] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Ladataan keskustelulista kun komponentti avautuu
  useEffect(() => {
    loadConversations();
  }, []);

  // Hakee keskustelulistan backendista
  async function loadConversations() {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Keskustelujen lataus epäonnistui:', err.message);
    }
  }

  // Avaa keskustelun: hakee sen viestit backendista
  async function openConversation(id) {
    try {
      const conv = await getConversation(id);
      setActiveId(id);
      // Muunnetaan backendin 'role' frontendin 'sender'-muotoon
      setMessages(conv.messages.map((m) => ({ sender: m.role, text: m.text })));
      setSidebarOpen(false);
    } catch (err) {
      console.error('Keskustelun avaus epäonnistui:', err.message);
    }
  }

  // Luo uuden keskustelun ja avaa sen
  async function handleNew() {
    try {
      const conv = await createConversation();
      await loadConversations();      // päivitä lista
      setActiveId(conv._id);
      setMessages([]);                // uusi keskustelu on tyhjä
      setSidebarOpen(false);
    } catch (err) {
      console.error('Uuden keskustelun luonti epäonnistui:', err.message);
    }
  }

  // Poistaa keskustelun
  async function handleDelete(id) {
    try {
      await deleteConversation(id);
      // Jos poistettiin avoinna oleva, tyhjennetään näkymä
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (err) {
      console.error('Keskustelun poisto epäonnistui:', err.message);
    }
  }

  // Lähettää viestin Watcherille
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Jos ei ole avointa keskustelua, luodaan ensin uusi
    let convId = activeId;
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv._id;
        setActiveId(convId);
      } catch (err) {
        console.error('Keskustelun luonti epäonnistui:', err.message);
        return;
      }
    }

    // Näytetään käyttäjän viesti heti
    setMessages((prev) => [...prev, { sender: 'user', text: trimmed }]);
    setInput('');
    setSending(true);

    try {
      // Lähetetään backendille, joka kutsuu OpenAI:ta ja tallentaa
      const data = await sendMessage(convId, trimmed);
      // Näytetään Watcherin vastaus
      setMessages((prev) => [...prev, { sender: 'watcher', text: data.reply }]);
      // Päivitetään lista (otsikko voi olla muuttunut)
      await loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'watcher', text: 'Watcher vaikenee. Yhteys katkesi.' },
      ]);
      console.error('Viestin lähetys epäonnistui:', err.message);
    } finally {
      setSending(false);
    }
  }

  // Uloskirjautuminen
  async function handleLogout() {
    try {
      await logout();
      onLogout();
    } catch (err) {
      console.error('Uloskirjautuminen epäonnistui:', err.message);
    }
  }

  return (
    <div className="layout">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className={`sidebar-wrap ${sidebarOpen ? 'is-open' : ''}`}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={openConversation}
          onNew={handleNew}
          onDelete={handleDelete}
          user={user}
          onLogout={handleLogout}
          onDeleteAccount={() => setShowDelete(true)}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <div className="app">
        <img src={watcherImg} alt="" className="chat-bg" />

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
          {/* Jos ei viestejä, näytetään tervehdys */}
          {messages.length === 0 && (
            <div className="message message-watcher">
              <p>Näen sinut. Mitä etsit pimeydestä?</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message message-${msg.sender === 'user' ? 'user' : 'watcher'}`}
            >
              <p>{msg.text}</p>
            </div>
          ))}

          {/* Watcher kirjoittaa -ilmaisin */}
          {sending && (
            <div className="message message-watcher">
              <p className="typing">Watcher tarkkailee...</p>
            </div>
          )}
        </main>

        <footer className="composer">
          <input
            type="text"
            placeholder="Kysy jotain..."
            className="composer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={sending}
          />
          <button className="composer-send" onClick={handleSend} disabled={sending}>
            Lähetä
          </button>
        </footer>

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
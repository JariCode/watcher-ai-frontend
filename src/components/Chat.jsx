import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import AdminPanel from './AdminPanel'

function Chat({ user, onLogout }) {
  // Keskustelun id URL:sta (/chat/:id). Tyhjällä etusivulla undefined.
  const { id } = useParams();
  const navigate = useNavigate();

  // Pupillin siirtymä keskeltä (x ja y pikseleinä)
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  // Keskustelulista sivupalkkiin
  const [conversations, setConversations] = useState([]);

  // Avoinna olevan keskustelun viestit
  const [messages, setMessages] = useState([]);

  // Syöttökenttä
  const [input, setInput] = useState('');

  // Odottaako Watcherin vastausta
  const [sending, setSending] = useState(false);

  // Kuunteleeko mikrofoni juuri nyt
  const [listening, setListening] = useState(false);

  // Tilin poisto -ikkuna ja sivupalkin tila (mobiili)
  const [showDelete, setShowDelete] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Näytetäänkö admin-paneeli
  const [showAdmin, setShowAdmin] = useState(false);

  // Viittaus viestialueen loppuun (automaattista vieritystä varten)
  const messagesEndRef = useRef(null);

  // Viittaus syöttökenttään (automaattista fokusta varten)
  const inputRef = useRef(null);

  // Viittaus puheentunnistukseen (jotta voidaan pysäyttää)
  const recognitionRef = useRef(null);

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

  // Kun URL:n id muuttuu (myös sivun päivityksessä), avataan se keskustelu.
  // Jos id puuttuu (etusivu /), näytetään tyhjä näkymä.
  useEffect(() => {
    if (id) {
      openConversation(id);
    } else {
      setMessages([]);
    }
  }, [id]);

  // Vieritetään alas aina kun viestit muuttuvat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Fokusoidaan syöttökenttä kun se vapautuu tai keskustelu vaihtuu
  useEffect(() => {
    if (!sending) {
      inputRef.current?.focus();
    }
  }, [sending, id]);

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
  async function openConversation(convId) {
    try {
      const conv = await getConversation(convId);
      setMessages(conv.messages.map((m) => ({ sender: m.role, text: m.text })));
      setSidebarOpen(false);
    } catch (err) {
      console.error('Keskustelun avaus epäonnistui:', err.message);
      // Jos keskustelua ei löydy (esim. poistettu), palataan etusivulle
      navigate('/');
    }
  }

  // Sivupalkista keskustelun valinta → navigoidaan sen URL:iin
  function handleSelect(convId) {
    navigate(`/chat/${convId}`);
    setSidebarOpen(false);
  }

  // Luo uuden keskustelun → siirrytään etusivulle (tyhjä näkymä)
  function handleNew() {
    navigate('/');
    setMessages([]);
    setSidebarOpen(false);
  }

  // Poistaa keskustelun
  async function handleDelete(convId) {
    try {
      await deleteConversation(convId);
      // Jos poistettiin avoinna oleva, palataan etusivulle
      if (convId === id) {
        navigate('/');
      }
      await loadConversations();
    } catch (err) {
      console.error('Keskustelun poisto epäonnistui:', err.message);
    }
  }

  // Aloittaa tai lopettaa mikrofonikuuntelun
  function toggleListening() {
    // Jos jo kuunnellaan, lopetetaan
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    // Tarkistetaan tukeeko selain puheentunnistusta
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Selaimesi ei tue puheentunnistusta.');
      return;
    }

    // Luodaan tunnistin
    const recognition = new SpeechRecognition();
    recognition.lang = 'fi-FI';          // suomi
    recognition.interimResults = false;   // vain valmis tulos
    recognition.continuous = false;       // lopettaa kun lakkaa puhumasta

    // Kun puhe on tunnistettu, lisätään teksti syöttökenttään
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Lisätään tunnistettu teksti kentän nykyisen sisällön perään
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
      // Palautetaan fokus kenttään, jotta voi painaa heti Enteriä
      inputRef.current?.focus();
    };

    // Kun kuuntelu päättyy (syystä riippumatta)
    recognition.onend = () => {
      setListening(false);
    };

    // Virhetilanne
    recognition.onerror = () => {
      setListening(false);
    };

    // Tallennetaan viite ja käynnistetään
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  // Lähettää viestin Watcherille
  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    // Jos ei ole avointa keskustelua (etusivu), luodaan ensin uusi ja siirrytään siihen
    let convId = id;
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv._id;
        navigate(`/chat/${convId}`);   // URL vaihtuu uuteen keskusteluun
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
      const data = await sendMessage(convId, trimmed);
      setMessages((prev) => [...prev, { sender: 'watcher', text: data.reply }]);
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
          activeId={id}
          onSelect={handleSelect}
          onNew={handleNew}
          onDelete={handleDelete}
          user={user}
          onLogout={handleLogout}
          onDeleteAccount={() => setShowDelete(true)}
          onClose={() => setSidebarOpen(false)}
          onAdmin={() => setShowAdmin(true)}
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

          {sending && (
            <div className="message message-watcher">
              <p className="typing">Watcher tarkkailee...</p>
            </div>
          )}

          <div ref={messagesEndRef}></div>
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
            ref={inputRef}
          />
          <button
            className={`composer-mic ${listening ? 'is-listening' : ''}`}
            onClick={toggleListening}
            disabled={sending}
            title="Puhu"
          >
            🎤
          </button>
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

        {showAdmin && (
          <AdminPanel
            onClose={() => setShowAdmin(false)}
            currentUserId={user.id}
          />
        )}
      </div>
    </div>
  );
}

export default Chat;
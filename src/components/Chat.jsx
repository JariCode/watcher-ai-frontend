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
  transcribeAudio,
} from '../api'
import DeleteAccount from './DeleteAccount'
import Sidebar from './Sidebar'
import AdminPanel from './AdminPanel'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// PDF.js tarvitsee worker-tiedoston taustakäsittelyyn (Vite antaa sille URLin)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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

  // Liitetyn tiedoston tiedot (teksti tai kuva, tai null)
  const [attachedFile, setAttachedFile] = useState(null);

  // Odottaako Watcherin vastausta
  const [sending, setSending] = useState(false);

  // Nauhoittaako mikrofoni juuri nyt
  const [listening, setListening] = useState(false);

  // Käännetäänkö puhetta tekstiksi juuri nyt (Whisper-kutsu kesken)
  const [transcribing, setTranscribing] = useState(false);

  // Onko tiedostoa raahaamassa alueen päälle (näyttöä varten)
  const [dragging, setDragging] = useState(false);

  // Tilin poisto -ikkuna ja sivupalkin tila (mobiili)
  const [showDelete, setShowDelete] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Näytetäänkö admin-paneeli
  const [showAdmin, setShowAdmin] = useState(false);

  // Viittaus viestialueen loppuun (automaattista vieritystä varten)
  const messagesEndRef = useRef(null);

  // Viittaus syöttökenttään (automaattista fokusta varten)
  const inputRef = useRef(null);

  // Viittaukset nauhoitukseen: itse nauhoitin ja kerätyt äänipalat
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Viittaus piilotettuun tiedosto-inputtiin
  const fileInputRef = useRef(null);

  // Muistaa keskustelun id:n jonka juuri loimme, jotta openConversation
  // ei ylikirjoita näytöllä olevia viestejä heti luonnin jälkeen
  const justCreatedId = useRef(null);

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
      // Jos tämä id luotiin juuri (ensimmäinen viesti), ei haeta uudelleen
      // backendista, koska viestit ovat jo näytöllä. Muuten ne vilahtaisivat pois.
      if (justCreatedId.current === id) {
        justCreatedId.current = null;   // nollataan, jotta jatkossa haku toimii normaalisti
        return;
      }
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
      // Muunnetaan backendin viestit frontendin muotoon (mukaan myös mahdollinen kuva)
      setMessages(conv.messages.map((m) => ({
        sender: m.role,
        text: m.text,
        image: m.image || '',
      })));
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

  // Aloittaa tai lopettaa mikrofonin nauhoituksen.
  // Nauhoittaa äänen selaimessa (MediaRecorder, toimii kaikissa selaimissa) ja
  // lähettää sen backendin kautta Whisperille tekstiksi muutettavaksi.
  async function toggleListening() {
    // Jos nauhoitetaan jo, lopetetaan. onstop-käsittelijä hoitaa loput.
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    // Tarkistetaan että selain tukee mikrofonin käyttöä
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('Selaimesi ei tue äänen nauhoitusta.');
      return;
    }

    try {
      // Pyydetään lupa mikrofoniin paremmilla laatuasetuksilla.
      // Kohinanpoisto ja kaikuvaimennus parantavat tunnistustarkkuutta.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Valitaan nauhoitusmuoto: webm/opus jos selain tukee (Chrome ja Firefox
      // tukevat molemmat). Yhtenäinen muoto parantaa Whisperin tunnistusta.
      let recorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        recorderOptions = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        recorderOptions = { mimeType: 'audio/webm' };
      }

      // Luodaan nauhoitin valitulla muodolla ja nollataan kerätyt äänipalat
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      // Kerätään äänidata palasina sitä mukaa kun sitä tulee
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      // Kun nauhoitus loppuu: kootaan ääni, muunnetaan base64:ksi ja lähetetään
      recorder.onstop = async () => {
        // Suljetaan mikrofoni (sammuttaa selaimen nauhoitusmerkin)
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);

        // Kootaan kerätyt palat yhdeksi äänitiedostoksi
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });

        // Jos ääntä ei kertynyt (esim. heti lopetettu), ei tehdä mitään
        if (audioBlob.size === 0) return;

        setTranscribing(true);
        try {
          // Muunnetaan ääni base64 data-URL:ksi (sama tapa kuin kuvilla)
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Äänen luku epäonnistui.'));
            reader.readAsDataURL(audioBlob);
          });

          // Lähetetään backendille, joka palauttaa tunnistetun tekstin
          const data = await transcribeAudio(dataUrl);

          // Lisätään tunnistettu teksti syöttökentän nykyisen sisällön perään
          if (data.text && data.text.trim()) {
            setInput((prev) => (prev ? prev + ' ' + data.text.trim() : data.text.trim()));
          }
          inputRef.current?.focus();
        } catch (err) {
          console.error('Puheentunnistus epäonnistui:', err.message);
          alert('Puheentunnistus epäonnistui. Yritä uudelleen.');
        } finally {
          setTranscribing(false);
        }
      };

      // Käynnistetään nauhoitus
      recorder.start();
      setListening(true);
    } catch (err) {
      // Yleisin syy: käyttäjä ei antanut lupaa mikrofoniin
      console.error('Mikrofonin avaus epäonnistui:', err.message);
      setListening(false);
      if (err.name === 'NotAllowedError') {
        alert('Mikrofonin käyttö estettiin. Salli mikrofoni selaimen asetuksista.');
      } else {
        alert('Mikrofonia ei voitu avata.');
      }
    }
  }

  // Tiedoston valinta input-kentästä → luetaan yhteisellä processFile-funktiolla
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';   // jotta saman tiedoston voi valita uudelleen
  }

  // Lukee tiedoston tekstiksi tai kuvan base64:ksi (yhteinen valinnalle ja raahaukselle)
  async function processFile(file) {
    if (!file) return;

    // Rajataan koko (5 Mt — riittää PDF:ille, Office-tiedostoille ja kuville)
    if (file.size > 5 * 1024 * 1024) {
      alert('Tiedosto on liian suuri (max 5 Mt).');
      return;
    }

    // Tarkistetaan onko tiedosto Word-dokumentti (.docx)
    const isWord =
      file.name.toLowerCase().endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Tarkistetaan onko tiedosto Excel-taulukko (.xlsx tai .xls)
    const isExcel =
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls');

    // Tarkistetaan onko tiedosto PDF
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/pdf';

    // Tarkistetaan onko tiedosto kuva
    const isImage = file.type.startsWith('image/');

    try {
      let content;

      // Kuva luetaan base64-muotoon (data-URL), ei tekstiksi
      if (isImage) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Kuvan luku epäonnistui.'));
          reader.readAsDataURL(file);
        });
        // Tallennetaan kuva erikseen (ei content-tekstiin)
        setAttachedFile({
          name: file.name,
          content: '',          // kuvalla ei ole tekstisisältöä
          image: dataUrl,       // base64 data-URL
        });
        return;   // kuva käsitelty, ei jatketa tekstihaaroihin
      }

      if (isWord) {
        // Word: puretaan teksti mammothilla (lukee tiedoston ArrayBufferina)
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;   // pelkkä teksti, ilman muotoilua
      } else if (isExcel) {
        // Excel: luetaan taulukko ja muunnetaan jokainen välilehti CSV-tekstiksi
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        // Käydään läpi kaikki välilehdet (sheets)
        const parts = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          // Otsikoidaan jokainen välilehti nimellään
          return `--- Välilehti: ${name} ---\n${csv}`;
        });
        content = parts.join('\n\n');
      } else if (isPdf) {
        // PDF: puretaan teksti sivu sivulta.
        // isEvalSupported: false estää haitallisen PDF:n koodin ajamisen (turvallisuus)
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          isEvalSupported: false,
        }).promise;

        const pages = [];
        // Käydään läpi jokainen sivu
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // Yhdistetään sivun tekstipalat välilyönnein
          const pageText = textContent.items.map((item) => item.str).join(' ');
          pages.push(pageText);
        }
        content = pages.join('\n\n');

        // Jos teksti jäi tyhjäksi, PDF on todennäköisesti skannattu (kuva, ei tekstiä)
        if (!content || !content.trim()) {
          alert('PDF:stä ei löytynyt tekstiä. Se voi olla skannattu kuva-PDF.');
          return;
        }
      } else {
        // Tavallinen teksti/koodi: luetaan suoraan tekstinä
        content = await file.text();
      }

      // Jos sisältö jäi tyhjäksi (esim. tyhjä Word-dokumentti)
      if (!content || !content.trim()) {
        alert('Tiedostosta ei löytynyt tekstiä.');
        return;
      }

      setAttachedFile({
        name: file.name,
        content: content,
        image: '',          // tekstitiedostolla ei kuvaa
      });
    } catch (err) {
      console.error('Tiedoston luku epäonnistui:', err.message);
      alert('Tiedoston luku epäonnistui.');
    }
  }

  // Raahaus alueen päälle: estetään selaimen oletus ja näytetään raahaustila
  function handleDragOver(e) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  // Raahaus poistuu alueelta
  function handleDragLeave(e) {
    e.preventDefault();
    // Vain jos hiiri poistuu koko alueelta (ei lapsielementtien välillä)
    if (e.currentTarget === e.target) setDragging(false);
  }

  // Tiedosto pudotetaan: luetaan ensimmäinen tiedosto
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // Poistaa liitetyn tiedoston
  function removeAttachedFile() {
    setAttachedFile(null);
  }

  // Lataa kuvan käyttäjän koneelle
  function downloadImage(dataUrl) {
    // Luodaan väliaikainen linkki ja klikataan sitä
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `watcher-kuva-${Date.now()}.png`;   // tiedostonimi aikaleimalla
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Lähettää viestin Watcherille
  async function handleSend() {
    const trimmed = input.trim();
    // Lähetys vaatii joko tekstin tai liitetyn tiedoston/kuvan
    if ((!trimmed && !attachedFile) || sending) return;

    // Rakennetaan lähetettävä teksti: käyttäjän viesti + mahdollinen tekstitiedoston sisältö
    let messageText = trimmed;
    if (attachedFile && attachedFile.content) {
      messageText += `\n\n[Tiedosto: ${attachedFile.name}]\n${attachedFile.content}`;
    }

    // Mahdollinen kuva (base64 data-URL)
    const messageImage = attachedFile?.image || '';

    // Jos ei ole avointa keskustelua (etusivu), luodaan ensin uusi ja siirrytään siihen
    let convId = id;
    if (!convId) {
      try {
        const conv = await createConversation();
        convId = conv._id;
        justCreatedId.current = convId;   // merkitään juuri luoduksi, ettei openConversation hae sitä
        navigate(`/chat/${convId}`);      // URL vaihtuu uuteen keskusteluun
      } catch (err) {
        console.error('Keskustelun luonti epäonnistui:', err.message);
        return;
      }
    }

    // Näytetään käyttäjän viesti heti (sisältää tiedoston/kuvan jos liitetty)
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: messageText || '(kuva)', image: messageImage },
    ]);
    setInput('');
    setAttachedFile(null);   // tyhjennetään liite lähetyksen jälkeen
    setSending(true);

    try {
      const data = await sendMessage(convId, messageText, messageImage);
      setMessages((prev) => [...prev, { sender: 'watcher', text: data.reply, image: data.image || '' }]);
      await loadConversations();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'watcher', text: 'Watcher vaikenee. Yhteys katkesi.', image: '' },
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

      <div
        className="app"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <img src={watcherImg} alt="" className="chat-bg" />

        {/* Raahausnäkymä — näkyy kun tiedostoa raahataan alueen päälle */}
        {dragging && (
          <div className="drop-overlay">
            <p>Pudota tiedosto tähän</p>
          </div>
        )}

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
          {!id && messages.length === 0 && !sending && (
            <div className="message message-watcher">
              <p>Näen sinut. Mitä etsit pimeydestä?</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message message-${msg.sender === 'user' ? 'user' : 'watcher'}`}
            >
              <div>
                {msg.image && (
                  <div className="message-image-wrap">
                    <img src={msg.image} alt="liite" className="message-image" />
                    {msg.sender === 'watcher' && (
                      <button
                        className="message-image-download"
                        onClick={() => downloadImage(msg.image)}
                        title="Lataa kuva"
                      >
                        Lataa kuva
                      </button>
                    )}
                  </div>
                )}
                <p>{msg.text}</p>
              </div>
            </div>
          ))}

          {sending && (
            <div className="message message-watcher">
              <p className="typing">Watcher tarkkailee...</p>
            </div>
          )}

          <div ref={messagesEndRef}></div>
        </main>

        <footer className="composer-wrap">
          {/* Liitetyn tiedoston/kuvan näkymä (jos jotain valittu) */}
          {attachedFile && (
            <div className="attached-file">
              {attachedFile.image ? (
                <img src={attachedFile.image} alt="" className="attached-thumb" />
              ) : (
                <span className="attached-file-icon">📄</span>
              )}
              <span className="attached-file-name">{attachedFile.name}</span>
              <button
                className="attached-file-remove"
                onClick={removeAttachedFile}
                title="Poista liite"
              >
                ×
              </button>
            </div>
          )}

          <div className="composer">
            {/* Piilotettu tiedostovalitsin */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".txt,.md,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.html,.css,.json,.xml,.csv,.docx,.xlsx,.xls,.pdf,text/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msword,application/pdf,image/*"
              style={{ display: 'none' }}
            />

            {/* Liite-nappi */}
            <button
              className="composer-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              title="Liitä tiedosto"
            >
              📎
            </button>

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
              disabled={sending || transcribing}
              title="Puhu"
            >
              {transcribing ? '...' : '🎤'}
            </button>
            <button className="composer-send" onClick={handleSend} disabled={sending}>
              Lähetä
            </button>
          </div>
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
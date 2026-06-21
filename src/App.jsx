import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // Pupillin siirtymä keskeltä (x ja y pikseleinä)
  const [pupil, setPupil] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e) {
      // Hiiren sijainti suhteessa silmien kohtaan (ruudun keskellä ylhäällä)
      const eyesX = window.innerWidth / 2;
      const eyesY = 60;
      const dx = e.clientX - eyesX;
      const dy = e.clientY - eyesY;

      // Kulma säilyy, matka rajataan silmän sisälle
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

  return (
    <div className="app">
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
        {/* Tähän tulevat viestit myöhemmin */}
      </main>

      <footer className="composer">
        <input
          type="text"
          placeholder="Kysy jotain..."
          className="composer-input"
        />
        <button className="composer-send">Lähetä</button>
      </footer>
    </div>
  );
}

export default App;
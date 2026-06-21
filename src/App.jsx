import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { getMe } from './api'
import Login from './components/Login'
import Chat from './components/Chat'

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading">Watcher herää...</div>;
  }

  // Ei kirjautunut → Login kaikilla reiteillä
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Kirjautunut → reitit chatille
  return (
    <Routes>
      {/* Tyhjä chat (uusi keskustelu) */}
      <Route path="/" element={<Chat user={user} onLogout={() => setUser(null)} />} />

      {/* Tietty keskustelu id:llä URL:ssa */}
      <Route path="/chat/:id" element={<Chat user={user} onLogout={() => setUser(null)} />} />

      {/* Tuntematon osoite → etusivulle */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
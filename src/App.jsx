import { useState, useEffect } from 'react'
import './App.css'
import { getMe } from './api'
import Login from './components/Login'
import Chat from './components/Chat'

function App() {
  // Kirjautunut käyttäjä (null = ei kirjautunut)
  const [user, setUser] = useState(null);

  // Ladataanko vielä tietoa kirjautumisesta
  const [loading, setLoading] = useState(true);

  // Tarkistetaan heti latautuessa onko käyttäjä jo kirjautunut
  useEffect(() => {
    getMe()
      .then((data) => setUser(data))   // token voimassa → käyttäjä kirjautunut
      .catch(() => setUser(null))      // ei tokenia / vanhentunut → ei kirjautunut
      .finally(() => setLoading(false));
  }, []);

  // Odotetaan kunnes tiedetään onko kirjautunut
  if (loading) {
    return <div className="loading">Watcher herää...</div>;
  }

  // Jos ei kirjautunut → näytetään Login-sivu
  // onLogin-funktio kertoo App:lle kun kirjautuminen onnistui
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Kirjautunut → näytetään chat
  return <Chat user={user} onLogout={() => setUser(null)} />;
}

export default App;
import { useState } from 'react'
import { login, register } from '../api'
import watcherImg from '../assets/watcher.png'

// onLogin: funktio jota kutsutaan kun kirjautuminen/rekisteröinti onnistuu
function Login({ onLogin }) {
  // Ollaanko kirjautumis- vai rekisteröintitilassa
  const [isRegister, setIsRegister] = useState(false);

  // Lomakkeen kentät
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Virheviesti käyttäjälle
  const [error, setError] = useState('');

  // Estää tuplalähetyksen kun pyyntö on kesken
  const [loading, setLoading] = useState(false);

  // Lomakkeen lähetys
  async function handleSubmit(e) {
    e.preventDefault();   // estetään sivun uudelleenlataus
    setError('');

    // Rekisteröinnissä tarkistetaan salasanan pituus jo täällä
    if (isRegister && password.length < 8) {
      setError('Salasanan on oltava vähintään 8 merkkiä.');
      return;
    }

    setLoading(true);
    try {
      // Valitaan oikea kutsu tilan mukaan
      const data = isRegister
        ? await register(username, password)
        : await login(username, password);

      // Onnistui → kerrotaan App:lle kuka kirjautui
      onLogin(data);
    } catch (err) {
      // Backendin virheviesti näytetään käyttäjälle
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Taustakuva */}
      <img src={watcherImg} alt="" className="login-bg" />

      {/* Lomakekortti */}
      <div className="login-card">
        <h1 className="login-title">Watcher AI</h1>
        <p className="login-subtitle">
          {isRegister ? 'Luo tili' : 'Kirjaudu sisään'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Käyttäjätunnus"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
            autoComplete="username"
          />

          <input
            type="password"
            placeholder="Salasana"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />

          {/* Virheviesti vain jos sellainen on */}
          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Hetki...' : isRegister ? 'Rekisteröidy' : 'Kirjaudu'}
          </button>
        </form>

        {/* Vaihto kirjautumisen ja rekisteröinnin välillä */}
        <button
          className="login-switch"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister
            ? 'Onko sinulla jo tili? Kirjaudu'
            : 'Ei tiliä? Rekisteröidy'}
        </button>
      </div>
    </div>
  );
}

export default Login;
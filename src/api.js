// Kehityksessä paikallinen backend, tuotannossa (julkaistu sivu) Render envistä
const API_URL = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : import.meta.env.VITE_API_URL;

// Yhteinen apufunktio kaikille kutsuille.
// credentials: 'include' on PAKOLLINEN — se lähettää evästeen (JWT-tokenin) mukana.
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // lähettää ja vastaanottaa evästeet
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Luetaan vastaus JSONina
  const data = await response.json();

  // Jos backend palautti virheen (esim. 401, 400), heitetään se eteenpäin
  if (!response.ok) {
    throw new Error(data.error || 'Tapahtui virhe.');
  }

  return data;
}

// --- AUTENTIKOINTI ---

// Rekisteröinti
export function register(username, password) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Kirjautuminen
export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Uloskirjautuminen
export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// Kuka on kirjautunut (tai virhe jos ei kukaan)
export function getMe() {
  return request('/auth/me');
}

// Tilin poisto (vaatii salasanan)
export function deleteAccount(password) {
  return request('/auth/delete', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

// --- KESKUSTELUT ---

// Hae kaikki käyttäjän keskustelut (lista)
export function getConversations() {
  return request('/conversations');
}

// Hae yksi keskustelu viesteineen
export function getConversation(id) {
  return request(`/conversations/${id}`);
}

// Luo uusi keskustelu
export function createConversation() {
  return request('/conversations', { method: 'POST' });
}

// Poista keskustelu
export function deleteConversation(id) {
  return request(`/conversations/${id}`, { method: 'DELETE' });
}

// Lähetä viesti Watcherille keskustelussa (teksti ja/tai kuva)
export function sendMessage(id, text, image) {
  return request(`/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, image }),
  });
}

// Muunna puhe tekstiksi (Whisper). Ottaa äänileikkeen base64-muodossa
// (data:audio/webm;base64,...) ja palauttaa tunnistetun tekstin.
export function transcribeAudio(audio) {
  return request('/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audio }),
  });
}

// --- ADMIN ---

// Hae kaikki käyttäjät (vain admin)
export function getAllUsers() {
  return request('/admin/users');
}

// Poista käyttäjä (vain admin)
export function adminDeleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}

// Vaihda käyttäjän rooli (vain admin)
export function adminSetRole(id, role) {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}
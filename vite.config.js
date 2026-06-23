import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Sovellus julkaistaan alikansioon jaricode.fi/watcherai/, joten polut
  // rakennetaan sen mukaisiksi. Ilman tätä CSS- ja JS-tiedostoja ei löytyisi.
  base: '/watcherai/',
  plugins: [react()],
})
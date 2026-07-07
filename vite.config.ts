import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Necessario para o signInWithPopup do Firebase Auth funcionar sem
      // o navegador bloquear a comunicacao entre a janela principal e o popup do Google.
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})

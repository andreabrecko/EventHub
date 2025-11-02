import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Configura il proxy per reindirizzare le richieste API al backend (porta 3000)
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // L'URL del tuo server Node.js/Express
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
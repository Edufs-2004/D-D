// supabase.js

// 1. Tus credenciales oficiales
const SUPABASE_URL = 'https://pnbtlgocsylapwuwqnwj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u4MzN0dIb0a9LfkJG68rKg_ZMr63uXn';

// 2. Creamos la conexión y la guardamos en una variable global llamada "db"
// Usamos "window.db" para que cualquier otro archivo (login o app) pueda usarla sin problemas.
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Conexión a Supabase inicializada correctamente.");

// =========================================
// REGISTRO DEL SERVICE WORKER (Para que sea App Instalable)
// =========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registrado con éxito', reg))
      .catch((err) => console.error('Error al registrar Service Worker', err));
  });
}
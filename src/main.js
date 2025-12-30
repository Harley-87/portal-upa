// Importa os estilos CSS (O Vite injeta isso no HTML automaticamente)
import './styles/global.css';
import './styles/header.css';

// Importa os módulos JS
import { initBanner } from './modules/banner.js';

// Executa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initBanner();
  // Futuramente: initCalendar(), initShifts(), etc.
});
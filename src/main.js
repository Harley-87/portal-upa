// Importa os estilos CSS (O Vite injeta isso no HTML automaticamente)
import './styles/global.css';
import './styles/header.css';
import './styles/components.css';
import { initNotices } from './modules/notices.js';

// Importa os módulos JS
import { initBanner } from './modules/banner.js';
import { initCalendar } from './modules/calendar.js';
import { initQuickLinks } from './modules/quick-links.js';

// Executa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initBanner();
  initCalendar();
  initQuickLinks();
  initNotices();
  // Futuramente: initShifts(), etc.
});
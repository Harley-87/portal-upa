/**
 * Módulo de Calendário (VERSÃO FINAL FASE 4)
 * Integra: Renderização do Grid + Feriados Móveis (Carnaval PF) + Escalas de Trabalho
 */

// 1. IMPORTAÇÃO NOVA: Traz a lógica matemática das escalas
import { isShiftDay, calculateWorkload } from './shifts.js'; 
// importações do Firebase
import { db } from './firebase-config.js';
import { collection, getDocs } from "firebase/firestore";

let currentDate = new Date(); 
let holidaysCache = {}; 
let currentTeam = ''; // Nova variável para saber qual escala mostrar
let eventsCache = {}; // Cache para guardar eventos: { '2025-12-25': [ {titulo, desc} ] }

// Feriados Fixos Municipais (Cascavel-PR)
const MUNICIPAL_HOLIDAYS = {
  '14-11': 'Aniv. Cascavel',
  '28-10': 'Dia do Servidor (PF)'
};

// --- Função Auxiliar para Buscar Eventos ---
async function fetchEvents() {
  const querySnapshot = await getDocs(collection(db, "events"));
  eventsCache = {}; // Limpa cache
  
  querySnapshot.forEach((doc) => {
    const data = doc.data(); 
    // data.date deve ser YYYY-MM-DD
    if (!eventsCache[data.date]) {
      eventsCache[data.date] = [];
    }
    eventsCache[data.date].push(data);
  });
}

export async function initCalendar() {
  const prevBtn = document.getElementById('btnPrevMonth');
  const nextBtn = document.getElementById('btnNextMonth');
  
  // NOVO: Pegamos o seletor de equipe do HTML
  const teamSelector = document.getElementById('teamSelector'); 

  if(prevBtn && nextBtn) {
    prevBtn.addEventListener('click', () => changeMonth(-1));
    nextBtn.addEventListener('click', () => changeMonth(1));
  }

  // NOVO: Ouvinte de evento para quando o usuário mudar a escala
  if(teamSelector) {
    teamSelector.addEventListener('change', (e) => {
      currentTeam = e.target.value; // Atualiza a variável de estado
      renderCalendar(); // Redesenha o calendário com as novas cores
    });
  }

  // MODAL LOGIC
  const modal = document.getElementById('eventModal');
  const closeBtn = document.getElementById('closeModalBtn');
  if(closeBtn) closeBtn.onclick = () => modal.close();
  // Fecha se clicar fora
  if(modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  }

  await fetchEvents();
  await renderCalendar();
  console.log('✅ Calendário + Escalas iniciados.');
}

async function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const monthDisplay = document.getElementById('currentMonthDisplay');
  const footer = document.getElementById('calendarFooter'); // NOVO: Para o resumo de horas
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Título
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentDate);
  monthDisplay.textContent = `${monthName} ${year}`;

  // Busca Feriados
  const holidays = await getHolidays(year);

  // Limpeza
  const daysToRemove = grid.querySelectorAll('.calendar-day');
  daysToRemove.forEach(day => day.remove());

  // Cálculos de datas
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  // Padding (Dias vazios antes do dia 1)
  for (let i = 0; i < firstDayIndex; i++) {
    const paddingDiv = document.createElement('div');
    paddingDiv.classList.add('calendar-day', 'padding-day');
    grid.appendChild(paddingDiv);
  }

  // Loop dos Dias
  const today = new Date();
  
  for (let day = 1; day <= lastDayOfMonth; day++) {
    const dayDiv = document.createElement('div');
    dayDiv.classList.add('calendar-day');
    
    // Objeto Data completo para cálculos
    const currentDayDate = new Date(year, month, day);

    // Verifica Hoje
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayDiv.classList.add('today');
    }

    // --- NOVO: LÓGICA DE ESCALA ---
    // Se houver uma equipe selecionada, verifica se é dia de plantão
    if (currentTeam && isShiftDay(currentDayDate, currentTeam)) {
      dayDiv.classList.add('shift-day'); // Adiciona a classe que deixa verde
    }
    // -----------------------------

    // Lógica de Feriados
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const shortDateKey = `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}`;
    
    let holidayName = holidays[dateKey] || MUNICIPAL_HOLIDAYS[shortDateKey];

    if (holidayName) {
      dayDiv.classList.add('is-holiday');
      dayDiv.innerHTML = `${day} <span class="holiday-name">${holidayName}</span>`;
    } else {
      // Se não for feriado, apenas mostra o número
      dayDiv.textContent = day; 
    }

    // --- LÓGICA NOVA DE EVENTOS ---
    // O dateKey é algo como '2025-12-05'
    if (eventsCache[dateKey]) {
      dayDiv.classList.add('has-event'); // Coloca a bolinha vermelha
        
      // Adiciona evento de clique para abrir o Modal
      dayDiv.addEventListener('click', () => openEventModal(dateKey, eventsCache[dateKey]));
    }
    // ------------------------------

    // Importante para depuração futura
    dayDiv.dataset.date = dateKey; 
    grid.appendChild(dayDiv);
  }

  // Função para abrir o modal
  function openEventModal(dateStr, eventsList) {
    const modal = document.getElementById('eventModal');
    const title = document.getElementById('modalDateTitle');
    const body = document.getElementById('modalBody');
    
    // Formata a data para BR (ex: 25/12/2025)
    const [y, m, d] = dateStr.split('-');
    title.textContent = `Eventos em ${d}/${m}/${y}`;
    
    body.innerHTML = ''; // Limpa anterior
    
    eventsList.forEach(evt => {
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `<h4>${evt.title}</h4><p>${evt.description}</p>`;
      body.appendChild(div);
    });
    
    modal.showModal(); // Abre o dialog nativo
  }

  // --- NOVO: CÁLCULO DE RODAPÉ ---
  if (currentTeam) {
    // Chama a função do arquivo shifts.js para calcular saldo
    const stats = calculateWorkload(year, month, holidays, currentTeam);
    
    if (stats) {
        const saldoText = stats.balance >= 0 
            ? `Saldo Positivo: +${stats.balance}h` 
            : `Saldo Devedor: ${stats.balance}h`;
        const colorStyle = stats.balance >= 0 ? 'color: var(--cor-primaria);' : 'color: var(--cor-destaque-vermelho);';

        footer.innerHTML = `
        <div class="workload-summary">
            <div class="workload-item">Plantões: <strong>${stats.shifts}</strong></div>
            <div class="workload-item">Carga Real: <strong>${stats.realHours}h</strong></div>
            <div class="workload-item">Meta: <strong>${stats.targetHours}h</strong></div>
            <div class="workload-item" style="${colorStyle} font-weight: bold;">
            ${saldoText}
            </div>
        </div>
        `;
    }
  } else {
    footer.innerHTML = '<p>Selecione uma escala acima para ver os dias de trabalho.</p>';
  }
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

/**
 * --- LÓGICA DE FERIADOS (Mantida igual à Fase 3) ---
 */
async function getHolidays(year) {
  if (holidaysCache[year]) return holidaysCache[year];

  let holidaysMap = {};

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
    if (response.ok) {
      const data = await response.json();
      data.forEach(h => {
        // Ignora Carnaval da API para usar nosso cálculo (PF)
        if (!h.name.toLowerCase().includes('carnaval')) {
           holidaysMap[h.date] = h.name;
        }
      });
    }
  } catch (error) {
    console.warn('API Offline, usando apenas cálculos locais.');
  }

  const movable = calculateMovableHolidays(year);
  holidaysMap = { ...holidaysMap, ...movable };

  holidaysCache[year] = holidaysMap;
  return holidaysMap;
}

function calculateMovableHolidays(year) {
  const easter = getEasterDate(year);
  
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const holidays = {};

  const carnavalMonday = addDays(easter, -48);
  const carnavalTuesday = addDays(easter, -47);
  holidays[formatDate(carnavalMonday)] = 'Carnaval (PF)';
  holidays[formatDate(carnavalTuesday)] = 'Carnaval (PF)';

  const goodFriday = addDays(easter, -2);
  holidays[formatDate(goodFriday)] = 'Paixão de Cristo';

  const corpusChristi = addDays(easter, 60);
  holidays[formatDate(corpusChristi)] = 'Corpus Christi';

  return holidays;
}

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}
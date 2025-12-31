/**
 * Módulo de Escalas (Lógica Pura)
 * Realiza os cálculos de projeção de plantões e carga horária.
 */

// Configuração das Equipes e Datas Base (Marcos Zero)
// ATENÇÃO: Os meses em JS começam em 0 (Jan) até 11 (Dez).
// Portanto: 01/12/2025 -> new Date(2025, 11, 1)
const TEAMS_CONFIG = {
  // Escala 12x36 (Ciclo de 2 dias)
  '12x36-1': { 
    cycle: 2, 
    baseDate: new Date(2025, 11, 2), // 02/12/2025
    workHours: 12,
    targetMultiplier: 8 // Multiplica dias úteis por 8h
  },
  '12x36-2': { 
    cycle: 2, 
    baseDate: new Date(2025, 11, 1), // 01/12/2025
    workHours: 12,
    targetMultiplier: 8
  },
  
  // Escala 12x60 (Ciclo de 3 dias - 12h trab + 60h folga = 72h totais)
  '12x60-1': { 
    cycle: 3, 
    baseDate: new Date(2025, 11, 1), // 01/12/2025
    workHours: 12,
    targetMultiplier: 6 // Multiplica dias úteis por 6h
  },
  '12x60-2': { 
    cycle: 3, 
    baseDate: new Date(2025, 11, 2), // 02/12/2025
    workHours: 12,
    targetMultiplier: 6
  },
  '12x60-3': { 
    cycle: 3, 
    baseDate: new Date(2025, 11, 3), // 03/12/2025
    workHours: 12,
    targetMultiplier: 6
  }
};

/**
 * Verifica se uma data específica é dia de plantão para a equipe selecionada.
 * @param {Date} targetDate A data do calendário a ser verificada.
 * @param {string} teamId O ID da equipe (ex: '12x36-1').
 * @returns {boolean} True se for plantão.
 */
export function isShiftDay(targetDate, teamId) {
  const config = TEAMS_CONFIG[teamId];
  if (!config) return false;

  // Normaliza as datas para meia-noite (evita erros de fuso horário/horas)
  const t = new Date(targetDate); t.setHours(0,0,0,0);
  const b = new Date(config.baseDate); b.setHours(0,0,0,0);

  // Diferença em milissegundos
  const diffTime = t - b;
  // Converte para dias
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // A MÁGICA DO MÓDULO (%):
  // Se a divisão da diferença de dias pelo tamanho do ciclo tiver resto 0,
  // significa que completou um ciclo exato e caiu no dia de trabalho.
  // Math.abs garante que funcione para datas no passado também.
  return (diffDays >= 0) && (diffDays % config.cycle === 0);
}

/**
 * Calcula o resumo da Carga Horária do mês.
 */
export function calculateWorkload(year, month, holidaysMap, teamId) {
  const config = TEAMS_CONFIG[teamId];
  if (!config) return null;

  let totalShifts = 0;
  let businessDays = 0; // Dias úteis para a meta (Seg-Sex - Feriados NÃO PF)
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDay = new Date(year, month, d);
    const dayOfWeek = currentDay.getDay(); // 0=Dom, 6=Sab
    
    // 1. Contar Plantões (Carga Real)
    if (isShiftDay(currentDay, teamId)) {
      totalShifts++;
    }

    // 2. Calcular Meta (Carga Devida)
    // Regra: Fim de semana não conta.
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    
    // Verifica feriado
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const holidayName = holidaysMap[dateKey];
    
    // Lógica da Meta:
    // Conta se NÃO for fim de semana E (não for feriado OU for Ponto Facultativo)
    // Ou seja: Feriado Nacional/Municipal em dia de semana ABATE da meta.
    // Ponto Facultativo (PF) NÃO ABATE da meta (conta como dia útil normal para o cálculo).
    
    let isDeductibleHoliday = false;
    if (holidayName && !holidayName.includes('(PF)')) {
      isDeductibleHoliday = true; // É feriado "obrigatório", desconta da meta
    }

    if (!isWeekend && !isDeductibleHoliday) {
      businessDays++;
    }
  }

  const hoursDone = totalShifts * config.workHours;
  const hoursTarget = businessDays * config.targetMultiplier;
  const balance = hoursDone - hoursTarget;

  return {
    shifts: totalShifts,
    realHours: hoursDone,
    targetHours: hoursTarget,
    balance: balance
  };
}
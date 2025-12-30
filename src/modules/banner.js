/**
 * Módulo responsável pelo carrossel do Banner Principal.
 * Objetivo: Alternar imagens a cada 5 segundos com efeito de fade.
 */

export function initBanner() {
  const bannerCarousel = document.getElementById('welcomeBanner');
  
  // Guard clause: Se o elemento não existir na página, para a execução (evita erros)
  if (!bannerCarousel) return;

  const bannerImages = bannerCarousel.querySelectorAll('img');
  let currentBannerIndex = 0;
  const INTERVAL_MS = 5000; // 5 segundos

  function showNextBanner() {
    // 1. Remove a classe 'active' da imagem atual
    bannerImages[currentBannerIndex].classList.remove('active');
    
    // 2. Calcula o próximo índice (loop infinito usando resto da divisão %)
    currentBannerIndex = (currentBannerIndex + 1) % bannerImages.length;
    
    // 3. Adiciona a classe 'active' na nova imagem
    bannerImages[currentBannerIndex].classList.add('active');
  }

  // Inicia o intervalo
  setInterval(showNextBanner, INTERVAL_MS);
  
  console.log('✅ Módulo Banner iniciado com sucesso.');
}
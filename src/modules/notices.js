import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "firebase/firestore";

let slideIndex = 1;
let slidesData = []; // Armazena os dados buscados
let autoSlideInterval;

export async function initNotices() {
  const container = document.getElementById('muralContainer');
  const dotsContainer = document.getElementById('muralDots');
  
  if (!container) return;

  try {
    // 1. Busca no Firebase (Coleção 'avisos', ordenado por ordem)
    // Dica: Usamos 'desc' para mostrar os avisos mais recentes primeiro, se preferir use 'asc' para ordem manual
    const q = query(collection(db, "avisos"), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);

    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    slidesData = [];

    if (querySnapshot.empty) {
      container.innerHTML = '<p style="text-align:center">Nenhum aviso no momento.</p>';
      return;
    }

    // 2. Gera o HTML dos Slides
    let index = 0;
    querySnapshot.forEach((doc) => {
      index++;
      const data = doc.data();
      slidesData.push(data);

      // Cria o Slide
      const slideDiv = document.createElement('div');
      slideDiv.className = 'mural-slide'; // Começam ocultos pelo CSS
      
      // Monta o conteúdo (Titulo + Texto + Observação se houver)
      let htmlContent = `
        <div class="aviso-conteudo">
          <p><strong>${data.title}</strong></p>
          <div class="texto-aviso">${data.content}</div>
      `;

      if (data.obs) {
        htmlContent += `<div class="obs-texto"><strong>Obs:</strong> ${data.obs}</div>`;
      }
      
      htmlContent += `</div>`;
      slideDiv.innerHTML = htmlContent;
      container.appendChild(slideDiv);

      // Cria a Bolinha (Dot)
      const dot = document.createElement('span');
      dot.className = 'mural-dot';
      // Adiciona evento de clique na bolinha (closure para capturar o índice correto)
      dot.addEventListener('click', () => currentSlide(index));
      dotsContainer.appendChild(dot);
    });

    // 3. Ativa os Botões de Navegação
    document.getElementById('muralPrev').addEventListener('click', () => plusSlides(-1));
    document.getElementById('muralNext').addEventListener('click', () => plusSlides(1));

    // 4. Inicia o Carrossel
    showSlides(slideIndex);
    startAutoSlide();

  } catch (error) {
    console.error("Erro ao carregar avisos:", error);
    container.innerHTML = '<p class="loading-text" style="color:red">Erro ao carregar mural.</p>';
  }
}

// --- LÓGICA DO CARROSSEL ---

function plusSlides(n) {
  showSlides(slideIndex += n);
  resetTimer();
}

function currentSlide(n) {
  showSlides(slideIndex = n);
  resetTimer();
}

function showSlides(n) {
  const slides = document.getElementsByClassName("mural-slide");
  const dots = document.getElementsByClassName("mural-dot");
  
  if (slides.length === 0) return;

  if (n > slides.length) { slideIndex = 1 }
  if (n < 1) { slideIndex = slides.length }

  // Esconde todos
  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.remove('active');
  }
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.remove('active');
  }

  // Mostra o atual
  slides[slideIndex - 1].classList.add('active');
  dots[slideIndex - 1].classList.add('active');
}

function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    plusSlides(1);
  }, 8000); // 8 segundos por aviso
}

function resetTimer() {
  clearInterval(autoSlideInterval);
  startAutoSlide();
}
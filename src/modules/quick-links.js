import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "firebase/firestore";

/**
 * Busca os links no Firestore e renderiza na tela
 */
export async function initQuickLinks() {
  const container = document.getElementById('quickLinksContainer');
  if (!container) return;

  try {
    // 1. Cria a consulta (Busca na coleção 'links', ordenado por 'order')
    const q = query(collection(db, "links"), orderBy("order"));
    
    // 2. Executa a busca
    const querySnapshot = await getDocs(q);
    
    // 3. Limpa o texto de "Carregando..."
    container.innerHTML = '';

    if (querySnapshot.empty) {
      container.innerHTML = '<p class="loading-text">Nenhum link cadastrado.</p>';
      return;
    }

    // 4. Para cada documento encontrado, cria um botão HTML
    querySnapshot.forEach((doc) => {
      const data = doc.data(); // Pega os dados { title: "...", url: "..." }
      
      const linkEl = document.createElement('a');
      linkEl.href = data.url;
      linkEl.target = "_blank"; // Abre em nova aba
      linkEl.className = 'btn-quick-link';
      
      // Ícone opcional (usando emoji por enquanto para simplicidade)
      const icon = data.icon ? data.icon : '🔗'; 
      
      linkEl.innerHTML = `<span>${icon}</span> ${data.title}`;
      
      container.appendChild(linkEl);
    });

  } catch (error) {
    console.error("Erro ao buscar links:", error);
    container.innerHTML = '<p class="loading-text" style="color:red">Erro ao carregar links.</p>';
  }
}
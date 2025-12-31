import { db, auth } from './firebase-config.js';
// [ATUALIZADO] Adicionamos setDoc e getDoc para gerenciar permissões de usuários
import { 
    collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc 
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

// [NOVO] Variável para guardar quem é o usuário atual e o que ele pode fazer
let currentUserRole = {}; 

// --- 1. VERIFICAÇÃO DE SEGURANÇA E PERMISSÕES ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/admin.html";
    } else {
        console.log("Usuário logado:", user.email);
        // [ATUALIZADO] Antes de carregar os dados, verificamos as permissões
        await checkPermissions(user.email);
        startDashboard(); // Inicia os listeners
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth);
});

// [NOVO] Função que busca as permissões no Firestore
async function checkPermissions(email) {
    const docRef = doc(db, "users", email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        currentUserRole = docSnap.data(); 
    } else {
        // Fallback: Se não tiver registro, o primeiro acesso assume admin total
        // (Isso garante que seu email principal funcione de primeira)
        currentUserRole = { permissions: ['admin', 'links', 'avisos', 'events'] };
    }
    
    applyInterfacePermissions();
}

// [NOVO] Função que esconde/mostra os Cards HTML baseado na permissão
function applyInterfacePermissions() {
    const perms = currentUserRole.permissions || [];
    const isAdmin = perms.includes('admin');

    // Função auxiliar para manipular o CSS display
    const show = (id, canShow) => {
        const el = document.getElementById(id);
        // Só tenta alterar se o elemento existir na tela
        if(el) {
            // Se for cardUsers (Gestão de equipe), display block, senão display default (block/grid)
            el.style.display = canShow ? 'block' : 'none';
        }
    };

    // Aplica as regras visuais
    // Nota: Estamos escondendo os Formulários ou os Cards inteiros
    show('formLink', isAdmin || perms.includes('links')); 
    show('formAviso', isAdmin || perms.includes('avisos'));
    show('cardEvents', isAdmin || perms.includes('events'));
    show('cardUsers', isAdmin); // Só Admin vê a gestão de equipe
}

// --- 2. INICIALIZAÇÃO DOS DADOS E LISTAGEM ---
function startDashboard() {
    
    // Define variáveis auxiliares de permissão para usar dentro dos loops
    const perms = currentUserRole.permissions || [];
    const isAdmin = perms.includes('admin');
    const canEditLinks = isAdmin || perms.includes('links');
    const canEditAvisos = isAdmin || perms.includes('avisos');
    const canEditEvents = isAdmin || perms.includes('events');

    // === LINKS ===
    const qLinks = query(collection(db, "links"), orderBy("order"));
    onSnapshot(qLinks, (snapshot) => {
        const linksList = document.getElementById('linksList');
        // Segurança extra: se o elemento não existir na tela (usuário sem acesso), para aqui.
        if (!linksList) return;

        linksList.innerHTML = ''; 
        if (snapshot.empty) linksList.innerHTML = '<p style="text-align:center; padding:10px;">Nenhum link.</p>';

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            
            // LÓGICA DE PROTEÇÃO: Só adiciona o botão se tiver permissão
            const deleteButtonHTML = canEditLinks 
                ? `<button class="btn-delete" data-id="${docSnap.id}">Excluir</button>` 
                : '';

            div.innerHTML = `
                <div class="item-info"><strong>${data.icon} ${data.title}</strong><small>${data.url}</small></div>
                ${deleteButtonHTML}
            `;
            
            // Só adiciona o listener se o botão existir
            if (canEditLinks) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('links', docSnap.id));
            }
            
            linksList.appendChild(div);
        });
    });

    // === AVISOS ===
    const qAvisos = query(collection(db, "avisos"), orderBy("order"));
    onSnapshot(qAvisos, (snapshot) => {
        const avisosList = document.getElementById('avisosList');
        if (!avisosList) return;

        avisosList.innerHTML = '';
        if (snapshot.empty) avisosList.innerHTML = '<p style="text-align:center; padding:10px;">Nenhum aviso.</p>';

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            
            const deleteButtonHTML = canEditAvisos 
                ? `<button class="btn-delete">Excluir</button>` 
                : '';

            div.innerHTML = `
                <div class="item-info"><strong>${data.order}. ${data.title}</strong><small>${data.content.substring(0,25)}...</small></div>
                ${deleteButtonHTML}
            `;
            
            if (canEditAvisos) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('avisos', docSnap.id));
            }

            avisosList.appendChild(div);
        });
    });

    // === EVENTOS ===
    const qEvents = query(collection(db, "events"), orderBy("date"));
    onSnapshot(qEvents, (snapshot) => {
        const eventsList = document.getElementById('eventsList');
        if (!eventsList) return; 
        
        eventsList.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            const dateFormatted = data.date.split('-').reverse().join('/');
            
            const deleteButtonHTML = canEditEvents 
                ? `<button class="btn-delete">X</button>` 
                : '';

            div.innerHTML = `
                <div class="item-info"><strong>${dateFormatted} - ${data.title}</strong><small>${data.description || ''}</small></div>
                ${deleteButtonHTML}
            `;

            if (canEditEvents) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('events', docSnap.id));
            }

            eventsList.appendChild(div);
        });
    });

    // === GESTÃO DE USUÁRIOS (Só carrega se for Admin) ===
    if (isAdmin) {
        initUserManagement();
    }
}

// --- 3. FORMULÁRIOS DE ADIÇÃO ---

// Links
document.getElementById('formLink').addEventListener('submit', async (e) => {
    e.preventDefault();
    saveData('links', {
        title: document.getElementById('linkTitle').value,
        url: document.getElementById('linkUrl').value,
        icon: document.getElementById('linkIcon').value,
        order: Number(document.getElementById('linkOrder').value)
    }, e.target);
});

// Avisos
document.getElementById('formAviso').addEventListener('submit', async (e) => {
    e.preventDefault();
    saveData('avisos', {
        title: document.getElementById('avisoTitle').value,
        content: document.getElementById('avisoContent').value,
        obs: document.getElementById('avisoObs').value,
        order: Number(document.getElementById('avisoOrder').value)
    }, e.target);
});

// [NOVO] Eventos
const formEvent = document.getElementById('formEvent');
if(formEvent) {
    formEvent.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveData('events', {
            date: document.getElementById('eventDate').value,
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDesc').value
        }, e.target);
    });
}

// --- [NOVO] LÓGICA DE USUÁRIOS ---
function initUserManagement() {
    const formUser = document.getElementById('formUser');
    
    // Adicionar/Editar Permissões
    formUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('userEmail').value.trim();
        if(!email) return;

        const checkboxes = formUser.querySelectorAll('input[type="checkbox"]:checked');
        const perms = Array.from(checkboxes).map(cb => cb.value);

        try {
            // Usamos setDoc para criar ou sobrescrever o documento com ID = email
            await setDoc(doc(db, "users", email), {
                email: email,
                permissions: perms
            });
            formUser.reset();
            alert("Permissões salvas!");
        } catch(err) { console.error(err); alert("Erro ao salvar usuário."); }
    });

    // Listar Usuários
    onSnapshot(collection(db, "users"), (snapshot) => {
        const list = document.getElementById('usersList');
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            div.innerHTML = `
                <div class="item-info"><strong>${data.email}</strong><small>${data.permissions.join(', ')}</small></div>
                ${!data.permissions.includes('admin') ? `<button class="btn-delete">X</button>` : ''}
            `;
            
            // Só permite excluir se não for admin (pra você não se apagar sem querer)
            if(!data.permissions.includes('admin')) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('users', docSnap.id));
            }
            list.appendChild(div);
        });
    });
}

// --- FUNÇÕES AUXILIARES GENÉRICAS ---

// Função unificada para salvar dados (Links, Avisos, Eventos)
async function saveData(collectionName, dataObj, formElement) {
    const btn = formElement.querySelector('button');
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = "Salvando...";

    try {
        await addDoc(collection(db, collectionName), dataObj);
        formElement.reset();
        alert("Salvo com sucesso!");
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar.");
    } finally {
        btn.disabled = false; btn.textContent = originalText;
    }
}

// Função unificada para deletar
async function handleDelete(collectionName, id) {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    try {
        await deleteDoc(doc(db, collectionName, id));
    } catch (err) { alert("Erro ao apagar: " + err.message); }
}
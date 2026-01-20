import { db, auth } from './firebase-config.js';
import { 
    collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc 
} from "firebase/firestore";
import { signOut, onAuthStateChanged } from "firebase/auth";

let currentUserRole = {};

// ESTADO DE EDIÇÃO (Guarda os IDs que estão sendo editados)
let editState = {
    links: null,
    avisos: null,
    events: null,
    users: null
};

// --- 1. VERIFICAÇÃO DE SEGURANÇA ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "/admin.html";
    } else {
        await checkPermissions(user.email);
        startDashboard();
    }
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

async function checkPermissions(email) {
    const docRef = doc(db, "users", email);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        currentUserRole = docSnap.data();
    } else {
        currentUserRole = { permissions: ['admin', 'links', 'avisos', 'events'] };
    }
    applyInterfacePermissions();
}

function applyInterfacePermissions() {
    const perms = currentUserRole.permissions || [];
    const isAdmin = perms.includes('admin');
    const show = (id, canShow) => {
        const el = document.getElementById(id);
        if(el) el.style.display = canShow ? 'block' : 'none';
    };
    show('formLink', isAdmin || perms.includes('links')); 
    show('formAviso', isAdmin || perms.includes('avisos'));
    show('cardEvents', isAdmin || perms.includes('events'));
    show('cardUsers', isAdmin); // Só admin vê gestão de usuários
}

// --- 2. INICIALIZAÇÃO E LISTAGEM ---
function startDashboard() {
    const perms = currentUserRole.permissions || [];
    const isAdmin = perms.includes('admin');
    
    // Configura botões de cancelar
    setupCancelButtons();

    // === LINKS ===
    const qLinks = query(collection(db, "links"), orderBy("order"));
    onSnapshot(qLinks, (snapshot) => {
        const list = document.getElementById('linksList');
        if (!list) return;
        list.innerHTML = ''; 
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            
            // Botões de Ação (Editar e Excluir)
            let actions = '';
            if (isAdmin || perms.includes('links')) {
                // Passamos os dados como string JSON para o botão editar recuperar fácil
                const dataString = JSON.stringify(data).replace(/"/g, '&quot;');
                actions = `
                    <div style="display:flex; gap:5px;">
                        <button class="btn-edit" onclick='startEdit("links", "${docSnap.id}", ${dataString})' style="background:#ffc107; color:#333; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✎</button>
                        <button class="btn-delete" onclick="handleDelete('links', '${docSnap.id}')">X</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="item-info"><strong>${data.icon} ${data.title}</strong><small>${data.url}</small></div>
                ${actions}
            `;
            
            // Reatribui listeners para evitar uso de string onclick no modulo
            if (actions) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('links', docSnap.id));
                div.querySelector('.btn-edit').addEventListener('click', () => startEdit('links', docSnap.id, data));
            }
            list.appendChild(div);
        });
    });

    // === AVISOS ===
    const qAvisos = query(collection(db, "avisos"), orderBy("order"));
    onSnapshot(qAvisos, (snapshot) => {
        const list = document.getElementById('avisosList');
        if (!list) return;
        list.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            
            let actions = '';
            if (isAdmin || perms.includes('avisos')) {
                actions = `
                    <div style="display:flex; gap:5px;">
                        <button class="btn-edit" style="background:#ffc107; color:#333; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✎</button>
                        <button class="btn-delete">X</button>
                    </div>
                `;
            }

            // replace para limpar tags HTML da visualização da lista
            const cleanContent = data.content.replace(/<[^>]*>?/gm, ''); 
            
            div.innerHTML = `
                <div class="item-info"><strong>${data.order}. ${data.title}</strong><small>${cleanContent.substring(0,30)}...</small></div>
                ${actions}
            `;

            if(actions) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('avisos', docSnap.id));
                div.querySelector('.btn-edit').addEventListener('click', () => startEdit('avisos', docSnap.id, data));
            }
            list.appendChild(div);
        });
    });

    // === EVENTOS ===
    const qEvents = query(collection(db, "events"), orderBy("date"));
    onSnapshot(qEvents, (snapshot) => {
        const list = document.getElementById('eventsList');
        if (!list) return;
        list.innerHTML = '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            const dateFormatted = data.date.split('-').reverse().join('/');
            
            let actions = '';
            if (isAdmin || perms.includes('events')) {
                actions = `
                    <div style="display:flex; gap:5px;">
                        <button class="btn-edit" style="background:#ffc107; color:#333; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✎</button>
                        <button class="btn-delete">X</button>
                    </div>
                `;
            }

            div.innerHTML = `
                <div class="item-info"><strong>${dateFormatted} - ${data.title}</strong></div>
                ${actions}
            `;
            
            if(actions) {
                div.querySelector('.btn-delete').addEventListener('click', () => handleDelete('events', docSnap.id));
                div.querySelector('.btn-edit').addEventListener('click', () => startEdit('events', docSnap.id, data));
            }
            list.appendChild(div);
        });
    });

    if (isAdmin) initUserManagement();
}

// --- 3. LÓGICA DE EDIÇÃO (START) ---
// Essa função preenche o formulário com os dados existentes
window.startEdit = function(type, id, data) {
    // Salva o ID que estamos editando
    editState[type] = id;

    // Muda a interface para "Modo Edição"
    if (type === 'links') {
        document.getElementById('linkTitle').value = data.title;
        document.getElementById('linkUrl').value = data.url;
        document.getElementById('linkIcon').value = data.icon;
        document.getElementById('linkOrder').value = data.order;
        toggleEditMode('Link', true);
    } 
    else if (type === 'avisos') {
        document.getElementById('avisoTitle').value = data.title;
        document.getElementById('avisoContent').value = data.content;
        document.getElementById('avisoObs').value = data.obs || '';
        document.getElementById('avisoOrder').value = data.order;
        toggleEditMode('Aviso', true);
    }
    else if (type === 'events') {
        document.getElementById('eventDate').value = data.date;
        document.getElementById('eventTitle').value = data.title;
        document.getElementById('eventDesc').value = data.description || '';
        toggleEditMode('Event', true);
    }
    else if (type === 'users') {
        const emailInput = document.getElementById('userEmail');
        emailInput.value = id; // O ID é o email
        emailInput.disabled = true; // Trava o email para não editar a chave primária
        
        // 1. Limpa todos os checkboxes antes
        document.querySelectorAll('#formUser input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        // 2. Marca apenas os que o usuário tem
        if (data.permissions) {
            data.permissions.forEach(perm => {
                const cb = document.querySelector(`#formUser input[value="${perm}"]`);
                if(cb) cb.checked = true;
            });
        }
        toggleEditMode('User', true);
    }

    // Rola a página até o formulário para o usuário ver
    const formId = type === 'users' ? 'formUser' : `form${type === 'links' ? 'Link' : type === 'avisos' ? 'Aviso' : 'Event'}`;
    document.getElementById(`form${type === 'links' ? 'Link' : type === 'avisos' ? 'Aviso' : 'Event'}`).scrollIntoView({behavior: "smooth"});
};

// Funções para alternar botões (Adicionar <-> Salvar)
function toggleEditMode(suffix, isEditing) {
    const btnSubmit = document.getElementById(`btnSubmit${suffix}`);
    const btnCancel = document.getElementById(`btnCancel${suffix}`);
    
    if (isEditing) {
        btnSubmit.textContent = "Salvar Alterações";
        btnSubmit.style.backgroundColor = "#ffc107"; // Amarelo
        btnSubmit.style.color = "#333";
        btnCancel.style.display = "block";
    } else {
        // Volta o texto original dependendo do tipo
        if (suffix === 'Aviso') btnSubmit.textContent = "Publicar Aviso";
        else if (suffix === 'User') btnSubmit.textContent = "Salvar Permissões";
        else btnSubmit.textContent = `Adicionar ${suffix}`;

        btnSubmit.style.backgroundColor = suffix === 'User' ? "#333" : ""; // Mantém cinza se for user
        btnSubmit.style.color = "";
        btnCancel.style.display = "none";

        // Se for User, destrava o campo de e-mail ao sair da edição
        if (suffix === 'User') {
            const emailInput = document.getElementById('userEmail');
            if(emailInput) emailInput.disabled = false;
        }
    }
}

function setupCancelButtons() {
    // Adicionei 'User' na lista abaixo
    ['Link', 'Aviso', 'Event', 'User'].forEach(suffix => {
        const btn = document.getElementById(`btnCancel${suffix}`);
        if(btn) {
            btn.addEventListener('click', () => {
                // Mapeia o Suffix para o nome da coleção no editState
                const type = suffix === 'Link' ? 'links' : suffix === 'Aviso' ? 'avisos' : (suffix === 'User' ? 'users' : 'events');
                
                editState[type] = null; // Limpa ID da memória
                document.getElementById(`form${suffix}`).reset(); // Limpa visual do form
                toggleEditMode(suffix, false); // Volta botões ao normal
            });
        }
    });
}


// --- 4. SUBMISSÃO DE FORMULÁRIOS (CREATE OU UPDATE) ---

document.getElementById('formLink').addEventListener('submit', async (e) => {
    e.preventDefault();
    saveData('links', {
        title: document.getElementById('linkTitle').value,
        url: document.getElementById('linkUrl').value,
        icon: document.getElementById('linkIcon').value,
        order: Number(document.getElementById('linkOrder').value)
    }, e.target, 'Link');
});

document.getElementById('formAviso').addEventListener('submit', async (e) => {
    e.preventDefault();
    saveData('avisos', {
        title: document.getElementById('avisoTitle').value,
        content: document.getElementById('avisoContent').value,
        obs: document.getElementById('avisoObs').value,
        order: Number(document.getElementById('avisoOrder').value)
    }, e.target, 'Aviso');
});

const formEvent = document.getElementById('formEvent');
if(formEvent) {
    formEvent.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveData('events', {
            date: document.getElementById('eventDate').value,
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDesc').value
        }, e.target, 'Event');
    });
}

// --- 5. FUNÇÃO MESTRE DE SALVAR (CREATE / UPDATE) ---
async function saveData(collectionName, dataObj, formElement, uiSuffix) {
    const btn = formElement.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = "Processando...";

    try {
        const editingId = editState[collectionName];

        if (editingId) {
            // MODO EDIÇÃO: Atualiza o documento existente
            await updateDoc(doc(db, collectionName, editingId), dataObj);
            alert("Atualizado com sucesso!");
            // Reseta o estado
            editState[collectionName] = null;
            toggleEditMode(uiSuffix, false);
        } else {
            // MODO CRIAÇÃO: Cria um novo
            await addDoc(collection(db, collectionName), dataObj);
            alert("Criado com sucesso!");
        }
        
        formElement.reset();

    } catch (error) {
        console.error(error);
        alert("Erro ao processar.");
    } finally {
        btn.disabled = false;
        // Se ainda estiver editando (deu erro), mantém texto de edição, senão volta ao normal
        if (!editState[collectionName]) {
            btn.textContent = originalText.includes('Adicionar') || originalText.includes('Publicar') ? originalText : (uiSuffix === 'Aviso' ? "Publicar Aviso" : `Adicionar ${uiSuffix}`);
        } else {
            btn.textContent = "Salvar Alterações";
        }
    }
}

async function handleDelete(collectionName, id) {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    try { await deleteDoc(doc(db, collectionName, id)); } catch (err) { alert("Erro ao apagar."); }
}

function initUserManagement() {
    const formUser = document.getElementById('formUser');
    if(!formUser) return;
    
    // Configura o submit do formulário
    // Removemos listener antigo clonando o elemento (para não duplicar se rodar 2x)
    const newForm = formUser.cloneNode(true);
    formUser.parentNode.replaceChild(newForm, formUser);
    
    // Como trocamos o elemento HTML, precisamos reativar o botão cancelar dele
    setupCancelButtons(); 

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('userEmail').value.trim();
        const checkboxes = newForm.querySelectorAll('input[type="checkbox"]:checked');
        const perms = Array.from(checkboxes).map(cb => cb.value);
        
        try {
            // Salva ou Atualiza (Sobrescreve permissões)
            await setDoc(doc(db, "users", email), { email, permissions: perms });
            alert("Permissões salvas!");
            
            // Limpeza pós-salvamento
            newForm.reset();
            editState.users = null;
            toggleEditMode('User', false); // Destrava email e esconde botão cancelar
            
        } catch(err) { 
            console.error(err);
            alert("Erro ao salvar usuário."); 
        }
    });

    // Configura a Lista de Usuários
    onSnapshot(collection(db, "users"), (snapshot) => {
        const list = document.getElementById('usersList');
        if(!list) return;
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = 'list-row';
            
            // Prepara os dados para o botão editar
            const dataString = JSON.stringify(data).replace(/"/g, '&quot;');
            
            // Cria os botões (Editar sempre aparece, Excluir só se não for Admin)
            const actions = `
                <div style="display:flex; gap:5px;">
                    <button class="btn-edit" onclick='startEdit("users", "${docSnap.id}", ${dataString})' style="background:#ffc107; color:#333; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">✎</button>
                    ${!data.permissions.includes('admin') ? `<button class="btn-delete" onclick="handleDelete('users', '${docSnap.id}')">X</button>` : ''}
                </div>
            `;

            div.innerHTML = `
                <div class="item-info"><strong>${data.email}</strong><small>${data.permissions.join(', ')}</small></div>
                ${actions}
            `;
            
            // Re-ativa os listeners dos botões que acabamos de criar via HTML string
            const btnEdit = div.querySelector('.btn-edit');
            const btnDel = div.querySelector('.btn-delete');
            if(btnEdit) btnEdit.onclick = () => startEdit('users', docSnap.id, data);
            if(btnDel) btnDel.onclick = () => handleDelete('users', docSnap.id);
            
            list.appendChild(div);
        });
    });
}
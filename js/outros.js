console.log("outros.js carregado.");

import { auth, db } from "../js/firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    setDoc,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ========================
// CONFIGURAÇÃO DOS GÉNEROS
// ========================

const GENEROS = [
    {
        id: "infantil",
        colecao: "livros_infantil",
        containerId: "booksInfantil"
    },
    {
        id: "fantastico",
        colecao: "livros_fantastico",
        containerId: "booksFantastico"
    },
    {
        id: "romance",
        colecao: "livros_romance",
        containerId: "booksRomance"
    },
    {
        id: "naoficcao",
        colecao: "livros_naoficcao",
        containerId: "booksNaoFiccao"
    },
    {
        id: "jovemadulto",
        colecao: "livros_jovemadulto",
        containerId: "booksJovemAdulto"
    }
];

// ========================
// VARIÁVEIS GLOBAIS
// ========================

let isAdmin = false;
let todosDados = {};

// ========================
// UTILITÁRIOS
// ========================

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function textoParaHTML(texto) {
    if (!texto) return "";
    return texto
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `<p>${p}</p>`)
        .join("\n");
}

// ========================
// CARREGAR LIVROS DE TODOS OS GÉNEROS
// ========================

async function carregarTodosGeneros() {
    for (const genero of GENEROS) {
        await carregarGenero(genero);
    }
}

async function carregarGenero(genero) {
    const container = document.getElementById(genero.containerId);

    try {
        const ref = collection(db, genero.colecao);
        const q = query(ref, orderBy("ordem"));
        const snapshot = await getDocs(q);

        todosDados[genero.id] = [];

        snapshot.forEach((docSnap) => {
            todosDados[genero.id].push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        renderizarGenero(genero);
    } catch (erro) {
        console.error(`Erro ao carregar ${genero.id}:`, erro);
        container.innerHTML = `<p class="msg-erro" style="text-align:center;">Erro ao carregar.</p>`;
    }
}

// ========================
// RENDERIZAR LIVROS DE UM GÉNERO
// ========================

function renderizarGenero(genero) {
    const container = document.getElementById(genero.containerId);
    const livros = todosDados[genero.id] || [];

    if (livros.length === 0) {
        container.innerHTML = `<p class="estado-vazio">Nenhum livro cadastrado.</p>`;
        return;
    }

    container.innerHTML = "";

    livros.forEach((livro) => {
        const sinopseHTML = textoParaHTML(livro.sinopse || "");
        const tituloSeguro = escapeHTML(livro.titulo || "Sem título");
        const imagemSegura = escapeHTML(livro.imagem || "");
        const bookDiv = document.createElement("div");
        bookDiv.classList.add("book");

        const capaHTML = livro.imagem
            ? `<img src="${imagemSegura}"
                   alt="Capa do livro ${tituloSeguro}"
                   onclick="abrirModal(this)"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="book-sem-capa" style="display:none;" onclick="abrirModal(this)">Sem capa</div>`
            : `<div class="book-sem-capa" onclick="abrirModal(this)">Sem capa</div>`;

        bookDiv.innerHTML = `
            <button type="button"
                    class="btn-editar-livro"
                    title="Editar livro"
                    data-id="${escapeHTML(livro.id)}"
                    data-genero="${escapeHTML(genero.id)}"
                    style="display: ${isAdmin ? 'inline-block' : 'none'};">
                Editar
            </button>
            <div class="book-capa-wrapper">
                ${capaHTML}
            </div>
            <h5>${tituloSeguro}</h5>
            <div class="sinopse" style="display: none;">
                <h3>${tituloSeguro}</h3>
                ${sinopseHTML}
            </div>
        `;

        const btnEditar = bookDiv.querySelector(".btn-editar-livro");
        btnEditar.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirEdicaoLivroOutros(genero.id, livro.id);
        });

        container.appendChild(bookDiv);
    });
}

// ========================
// EDIÇÃO DE LIVROS
// ========================

function abrirEdicaoLivroOutros(generoId, livroId) {
    const selectGenero = document.getElementById("editGenero");
    selectGenero.value = generoId;

    atualizarSelectLivros(generoId);

    document.getElementById("editSelect").value = livroId;

    const livro = (todosDados[generoId] || []).find(l => l.id === livroId);
    if (livro) {
        preencherFormularioEdicao(livro);
    }

    document.getElementById("editOverlay").style.display = "flex";
    document.getElementById("editMsg").style.display = "none";
    document.getElementById("notasFloat").style.display = "flex";
}

function atualizarSelectLivros(generoId) {
    const select = document.getElementById("editSelect");
    select.innerHTML = '<option value="">-- Selecione o livro --</option>';

    const livros = todosDados[generoId] || [];
    livros.forEach((l) => {
        const option = document.createElement("option");
        option.value = l.id;
        option.textContent = l.titulo;
        select.appendChild(option);
    });
}

function preencherFormularioEdicao(livro) {
    document.getElementById("editImagem").value = livro.imagem || "";
    document.getElementById("editTitulo").value = livro.titulo || "";
    document.getElementById("editSinopse").value = livro.sinopse || "";
}

document.getElementById("editGenero").addEventListener("change", (e) => {
    const generoId = e.target.value;
    if (generoId) {
        atualizarSelectLivros(generoId);
    } else {
        document.getElementById("editSelect").innerHTML =
            '<option value="">-- Selecione o livro --</option>';
    }
    document.getElementById("editImagem").value = "";
    document.getElementById("editTitulo").value = "";
    document.getElementById("editSinopse").value = "";
});

document.getElementById("editSelect").addEventListener("change", (e) => {
    const generoId = document.getElementById("editGenero").value;
    const livroId = e.target.value;

    if (generoId && livroId) {
        const livro = (todosDados[generoId] || []).find(l => l.id === livroId);
        if (livro) preencherFormularioEdicao(livro);
    }
});

// ========================
// SALVAR EDIÇÃO
// ========================

document.getElementById("salvarEdicao").addEventListener("click", async () => {
    const generoId = document.getElementById("editGenero").value;
    const livroId = document.getElementById("editSelect").value;
    const novaImagem = document.getElementById("editImagem").value.trim();
    const novoTitulo = document.getElementById("editTitulo").value.trim();
    const novaSinopse = document.getElementById("editSinopse").value.trim();
    const msgEl = document.getElementById("editMsg");
    const btnSalvar = document.getElementById("salvarEdicao");

    if (!generoId) {
        msgEl.textContent = "Selecione um género.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
        return;
    }

    if (!livroId) {
        msgEl.textContent = "Selecione um livro.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
        return;
    }

    if (!novaImagem || !novoTitulo) {
        msgEl.textContent = "Imagem e título são obrigatórios.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
        return;
    }

    btnSalvar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
        const genero = GENEROS.find(g => g.id === generoId);
        const livroAtual = (todosDados[generoId] || []).find(l => l.id === livroId);

        await setDoc(doc(db, genero.colecao, livroId), {
            imagem: novaImagem,
            titulo: novoTitulo,
            sinopse: novaSinopse,
            ordem: livroAtual ? livroAtual.ordem : 1
        });

        msgEl.textContent = "Livro salvo com sucesso.";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarGenero(genero);

        atualizarSelectLivros(generoId);
        document.getElementById("editSelect").value = livroId;
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        msgEl.textContent = "Erro ao salvar. Tente novamente.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar Alterações";
    }
});

// ========================
// LOGIN
// ========================

const entrarBtn = document.querySelector("#entrar");

entrarBtn.addEventListener("click", async () => {
    const email = document.querySelector("#email").value.trim();
    const senha = document.querySelector("#senha").value;
    const erroMsg = document.getElementById("loginErro");

    if (!email || !senha) {
        erroMsg.textContent = "Preencha todos os campos.";
        erroMsg.style.display = "block";
        return;
    }

    entrarBtn.disabled = true;
    entrarBtn.textContent = "Entrando...";

    try {
        await signInWithEmailAndPassword(auth, email, senha);
        document.getElementById("loginOverlay").style.display = "none";
        erroMsg.style.display = "none";
    } catch (erro) {
        erroMsg.textContent = "Email ou senha incorretos.";
        erroMsg.style.display = "block";
    } finally {
        entrarBtn.disabled = false;
        entrarBtn.textContent = "Entrar";
    }
});

document.getElementById("senha").addEventListener("keyup", (e) => {
    if (e.key === "Enter") entrarBtn.click();
});

document.getElementById("email").addEventListener("keyup", (e) => {
    if (e.key === "Enter") document.getElementById("senha").focus();
});

// ========================
// LOGOUT
// ========================

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (erro) {
        console.error("Erro ao sair:", erro);
    }
});

// ========================
// ESTADO DE AUTENTICAÇÃO
// ========================

onAuthStateChanged(auth, (user) => {
    const adminPanel = document.getElementById("adminPanel");
    const loginNav = document.getElementById("loginNav");

    if (user) {
        isAdmin = true;
        adminPanel.style.display = "inline-block";
        loginNav.style.display = "none";
    } else {
        isAdmin = false;
        adminPanel.style.display = "none";
        loginNav.style.display = "inline-block";
    }

    document.querySelectorAll(".btn-editar-livro").forEach(btn => {
        btn.style.display = isAdmin ? "inline-block" : "none";
    });
});

// ========================
// INICIALIZAÇÃO
// ========================

async function inicializar() {
    await carregarTodosGeneros();
}

inicializar();

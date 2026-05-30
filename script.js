console.log("🚀 SCRIPT.JS FOI CARREGADO!");

import { auth, db } from "./js/firebase.js";

console.log("🔗 Firebase importado! db:", db);
console.log("🔗 Firebase importado! auth:", auth);

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
// VARIÁVEIS GLOBAIS
// ========================

let livrosData = [];
let isAdmin = false;

console.log("📂 Tentando acessar coleção 'livros'...");
const livrosRef = collection(db, "livros");
console.log("📂 Referência criada:", livrosRef);

// ========================
// CARREGAR LIVROS DO FIRESTORE
// ========================

async function carregarLivros() {
    const container = document.getElementById("booksContainer");

    console.log("🔄 Função carregarLivros() chamada!");

    try {
        console.log("🔍 Criando query...");
        const q = query(livrosRef, orderBy("ordem"));
        console.log("🔍 Query criada, buscando documentos...");

        const snapshot = await getDocs(q);

        console.log("📦 Documentos encontrados:", snapshot.size);

        livrosData = [];

        snapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            console.log("📖 Livro:", docSnap.id, dados);

            livrosData.push({
                id: docSnap.id,
                ...dados
            });
        });

        renderizarLivros();

    } catch (erro) {
        console.error("❌ ERRO ao carregar livros:", erro);
        console.error("❌ Código do erro:", erro.code);
        console.error("❌ Mensagem:", erro.message);
        container.innerHTML = `<p style="color:red; text-align:center;">
            Erro ao carregar livros. Verifique o console (F12).
        </p>`;
    }
}

// ========================
// RENDERIZAR LIVROS NA TELA
// ========================

function renderizarLivros() {
    const container = document.getElementById("booksContainer");

    console.log("🎨 Renderizando", livrosData.length, "livros...");

    if (livrosData.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888;">
            Nenhum livro encontrado no Firestore.
        </p>`;
        return;
    }

    container.innerHTML = "";

    livrosData.forEach((livro) => {
        const sinopseHTML = textoParaHTML(livro.sinopse || "");

        const bookDiv = document.createElement("div");
        bookDiv.classList.add("book");

        bookDiv.innerHTML = `
            <button class="btn-editar-livro" 
                    title="Editar livro"
                    data-id="${livro.id}"
                    style="display: ${isAdmin ? 'block' : 'none'};">
                ✏️
            </button>
            <img src="${livro.imagem}" 
                 alt="Capa do livro ${livro.titulo}" 
                 onclick="abrirModal(this)">
            <h5>${livro.titulo}</h5>
            <div class="sinopse" style="display: none;">
                <h3>${livro.titulo}</h3>
                ${sinopseHTML}
            </div>
        `;

        const btnEditar = bookDiv.querySelector(".btn-editar-livro");
        btnEditar.addEventListener("click", () => {
            abrirEdicaoLivro(livro.id);
        });

        container.appendChild(bookDiv);
    });

    console.log("✅ Livros renderizados com sucesso!");
}

// ========================
// CONVERTER TEXTO → HTML
// ========================

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
// EDIÇÃO DE LIVROS
// ========================

function abrirEdicaoLivro(livroId) {
    const livro = livrosData.find(l => l.id === livroId);
    if (!livro) return;

    console.log("✏️ Editando livro:", livroId);

    const select = document.getElementById("editSelect");
    select.innerHTML = "";

    livrosData.forEach((l) => {
        const option = document.createElement("option");
        option.value = l.id;
        option.textContent = l.titulo;
        if (l.id === livroId) option.selected = true;
        select.appendChild(option);
    });

    preencherFormularioEdicao(livro);

    document.getElementById("editOverlay").style.display = "flex";
    document.getElementById("editMsg").style.display = "none";
}

function preencherFormularioEdicao(livro) {
    document.getElementById("editImagem").value = livro.imagem || "";
    document.getElementById("editTitulo").value = livro.titulo || "";
    document.getElementById("editSinopse").value = livro.sinopse || "";
}

document.getElementById("editSelect").addEventListener("change", (e) => {
    const livro = livrosData.find(l => l.id === e.target.value);
    if (livro) {
        preencherFormularioEdicao(livro);
    }
});

// ========================
// SALVAR EDIÇÃO
// ========================

document.getElementById("salvarEdicao").addEventListener("click", async () => {
    const livroId = document.getElementById("editSelect").value;
    const novaImagem = document.getElementById("editImagem").value.trim();
    const novoTitulo = document.getElementById("editTitulo").value.trim();
    const novaSinopse = document.getElementById("editSinopse").value.trim();
    const msgEl = document.getElementById("editMsg");
    const btnSalvar = document.getElementById("salvarEdicao");

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
        const livroAtual = livrosData.find(l => l.id === livroId);

        await setDoc(doc(db, "livros", livroId), {
            imagem: novaImagem,
            titulo: novoTitulo,
            sinopse: novaSinopse,
            ordem: livroAtual ? livroAtual.ordem : 1
        });

        console.log("✅ Livro salvo:", livroId);

        msgEl.textContent = "✅ Livro salvo com sucesso!";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarLivros();

        const select = document.getElementById("editSelect");
        select.innerHTML = "";
        livrosData.forEach((l) => {
            const option = document.createElement("option");
            option.value = l.id;
            option.textContent = l.titulo;
            if (l.id === livroId) option.selected = true;
            select.appendChild(option);
        });

    } catch (erro) {
        console.error("❌ Erro ao salvar:", erro);
        msgEl.textContent = "❌ Erro ao salvar. Tente novamente.";
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
        console.log("✅ Login bem-sucedido!");

    } catch (erro) {
        console.error("❌ Erro no login:", erro.code);
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
        console.log("👋 Logout feito");
    } catch (erro) {
        console.error("Erro ao sair:", erro);
    }
});

// ========================
// ESTADO DE AUTENTICAÇÃO
// ========================

onAuthStateChanged(auth, (user) => {
    const adminPanel = document.getElementById("adminPanel");
    const loginBtn = document.getElementById("loginBtn");

    if (user) {
        console.log("🔓 ADM logado:", user.email);
        isAdmin = true;
        adminPanel.style.display = "inline-block";
        loginBtn.style.display = "none";
    } else {
        console.log("🔒 Não logado");
        isAdmin = false;
        adminPanel.style.display = "none";
        loginBtn.style.display = "inline-block";
    }

    document.querySelectorAll(".btn-editar-livro").forEach(btn => {
        btn.style.display = isAdmin ? "block" : "none";
    });
});

// ========================
// INICIALIZAÇÃO
// ========================

console.log("🏁 Chamando carregarLivros()...");
carregarLivros();
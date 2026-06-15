console.log("🚀 SCRIPT.JS FOI CARREGADO!");

import { auth, db } from "./js/firebase.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ========================
// VARIÁVEIS GLOBAIS
// ========================

let livrosData = [];
let isAdmin = false;
let semanaAtualNumero = null;
let semanasHistorico = [];
let visualizandoHistorico = false;

const livrosRef = collection(db, "livros");

// ========================
// CARREGAR NÚMERO DA SEMANA ATUAL
// ========================

async function carregarSemanaAtual() {
    try {
        const docRef = doc(db, "semanas", "atual");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            semanaAtualNumero = docSnap.data().numero;
        } else {
            // Se não existe, cria com semana 1
            semanaAtualNumero = 1;
            await setDoc(docRef, { numero: 1 });
        }

        console.log("📅 Semana atual:", semanaAtualNumero);
        atualizarTituloSemana();

    } catch (erro) {
        console.error("❌ Erro ao carregar semana:", erro);
        semanaAtualNumero = 1;
        atualizarTituloSemana();
    }
}

function atualizarTituloSemana() {
    const titulo = document.getElementById("tituloSemana");
    const subtitulo = document.getElementById("subtituloSemana");

    if (visualizandoHistorico) return;

    titulo.innerHTML = `Semana ${semanaAtualNumero}`;
    subtitulo.textContent = "Conheça os livros da semana!";
}

// ========================
// CARREGAR HISTÓRICO DE SEMANAS
// ========================

async function carregarHistorico() {
    const dropdown = document.getElementById("semanasDropdown");

    try {
        const semanasRef = collection(db, "semanas");
        const snapshot = await getDocs(semanasRef);

        semanasHistorico = [];

        snapshot.forEach((docSnap) => {
            if (docSnap.id === "atual") return; // pula o doc "atual"
            const dados = docSnap.data();
            semanasHistorico.push({
                id: docSnap.id,
                numero: dados.numero,
                dataFim: dados.dataFim || ""
            });
        });

        // Ordena do mais recente para o mais antigo
        semanasHistorico.sort((a, b) => b.numero - a.numero);

        renderizarDropdownSemanas();

    } catch (erro) {
        console.error("❌ Erro ao carregar histórico:", erro);
        dropdown.innerHTML = `<p class="dropdown-vazio">Erro ao carregar</p>`;
    }
}

function renderizarDropdownSemanas() {
    const dropdown = document.getElementById("semanasDropdown");
    dropdown.innerHTML = "";

    // Link da semana atual sempre no topo
    const linkAtual = document.createElement("a");
    linkAtual.href = "#";
    linkAtual.textContent = `Semana ${semanaAtualNumero} (atual)`;
    linkAtual.classList.add("semana-ativa");

    if (!visualizandoHistorico) {
        linkAtual.classList.add("semana-ativa");
    } else {
        linkAtual.classList.remove("semana-ativa");
        linkAtual.addEventListener("click", (e) => {
            e.preventDefault();
            voltarParaAtual();
        });
    }

    dropdown.appendChild(linkAtual);

    if (semanasHistorico.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "dropdown-vazio";
        vazio.textContent = "Sem semanas anteriores";
        dropdown.appendChild(vazio);
        return;
    }

    // Separador
    const separador = document.createElement("div");
    separador.style.borderTop = "1px solid #b8a996";
    separador.style.margin = "4px 0";
    dropdown.appendChild(separador);

    // Semanas do histórico
    semanasHistorico.forEach((semana) => {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = `Semana ${semana.numero}`;

        if (semana.dataFim) {
            link.textContent += ` — ${semana.dataFim}`;
        }

        link.addEventListener("click", (e) => {
            e.preventDefault();
            carregarSemanaHistorico(semana.numero);
        });

        dropdown.appendChild(link);
    });
}

// ========================
// CARREGAR LIVROS DE UMA SEMANA DO HISTÓRICO
// ========================

async function carregarSemanaHistorico(numeroSemana) {
    const container = document.getElementById("booksContainer");
    const titulo = document.getElementById("tituloSemana");
    const subtitulo = document.getElementById("subtituloSemana");
    const btnVoltar = document.getElementById("voltarAtual");

    console.log(`📚 Carregando histórico da semana ${numeroSemana}...`);

    container.innerHTML = `<p style="text-align:center; color:#888;">Carregando semana ${numeroSemana}...</p>`;
    visualizandoHistorico = true;

    titulo.innerHTML = `Semana ${numeroSemana} <span class="historico-badge">histórico</span>`;
    subtitulo.textContent = "Você está vendo uma semana anterior.";
    btnVoltar.style.display = "inline-block";

    // Esconde botões de admin quando vê histórico
    document.querySelectorAll(".btn-editar-livro").forEach(btn => {
        btn.style.display = "none";
    });

    try {
        const historicoLivrosRef = collection(db, "historico", `semana_${numeroSemana}`, "livros");
        const q = query(historicoLivrosRef, orderBy("ordem"));
        const snapshot = await getDocs(q);

        livrosData = [];
        snapshot.forEach((docSnap) => {
            livrosData.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (livrosData.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#888;">Nenhum livro registrado nesta semana.</p>`;
            return;
        }

        renderizarLivros(false); // false = sem botões de edição
        renderizarDropdownSemanas(); // atualiza visual do dropdown

    } catch (erro) {
        console.error("❌ Erro ao carregar histórico:", erro);
        container.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar histórico.</p>`;
    }
}

// ========================
// VOLTAR PARA SEMANA ATUAL
// ========================

window.voltarParaAtual = function () {
    visualizandoHistorico = false;
    document.getElementById("voltarAtual").style.display = "none";
    atualizarTituloSemana();
    carregarLivros();
    renderizarDropdownSemanas();
};

// ========================
// CARREGAR LIVROS DA SEMANA ATUAL
// ========================

async function carregarLivros() {
    const container = document.getElementById("booksContainer");
    visualizandoHistorico = false;
    document.getElementById("voltarAtual").style.display = "none";

    try {
        const q = query(livrosRef, orderBy("ordem"));
        const snapshot = await getDocs(q);

        livrosData = [];
        snapshot.forEach((docSnap) => {
            livrosData.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarLivros(true);

    } catch (erro) {
        console.error("❌ ERRO ao carregar livros:", erro);
        container.innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar livros.</p>`;
    }
}

// ========================
// RENDERIZAR LIVROS
// ========================

function renderizarLivros(mostrarEdicao = true) {
    const container = document.getElementById("booksContainer");

    if (livrosData.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888;">Nenhum livro encontrado.</p>`;
        return;
    }

    container.innerHTML = "";

    livrosData.forEach((livro) => {
        const sinopseHTML = textoParaHTML(livro.sinopse || "");
        const bookDiv = document.createElement("div");
        bookDiv.classList.add("book");

        const mostrarBtn = mostrarEdicao && isAdmin && !visualizandoHistorico;

        bookDiv.innerHTML = `
            <button class="btn-editar-livro"
                    title="Editar livro"
                    data-id="${livro.id}"
                    style="display: ${mostrarBtn ? 'block' : 'none'};">
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
}

// ========================
// TEXTO → HTML
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
    
    // Mostra o painel flutuante de notas
    document.getElementById("notasFloat").style.display = "flex";
}

function preencherFormularioEdicao(livro) {
    document.getElementById("editImagem").value = livro.imagem || "";
    document.getElementById("editTitulo").value = livro.titulo || "";
    document.getElementById("editSinopse").value = livro.sinopse || "";
}

document.getElementById("editSelect").addEventListener("change", (e) => {
    const livro = livrosData.find(l => l.id === e.target.value);
    if (livro) preencherFormularioEdicao(livro);
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

        msgEl.textContent = "✅ Livro salvo com sucesso!";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarLivros();

        // Atualiza select
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
// FINALIZAR SEMANA
// ========================

document.getElementById("finalizarBtn").addEventListener("click", () => {
    const texto = document.getElementById("finalizarTexto");
    texto.innerHTML = `Tem certeza que deseja finalizar a <strong>Semana ${semanaAtualNumero}</strong>?`;
    document.getElementById("finalizarOverlay").style.display = "flex";
    document.getElementById("finalizarMsg").style.display = "none";
});

document.getElementById("confirmarFinalizar").addEventListener("click", async () => {
    const btnConfirmar = document.getElementById("confirmarFinalizar");
    const btnCancelar = document.getElementById("cancelarFinalizar");
    const msgEl = document.getElementById("finalizarMsg");

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Finalizando...";

    try {
        console.log(`🔄 Finalizando semana ${semanaAtualNumero}...`);

        // 1) Carregar todos os livros atuais
        const q = query(livrosRef, orderBy("ordem"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            msgEl.textContent = "❌ Não há livros para arquivar.";
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        // 2) Copiar cada livro para historico/semana_XX/livros/
        const semanaId = `semana_${semanaAtualNumero}`;

        for (const docSnap of snapshot.docs) {
            const dados = docSnap.data();
            const historicoDocRef = doc(db, "historico", semanaId, "livros", docSnap.id);
            await setDoc(historicoDocRef, dados);
        }

        console.log("✅ Livros copiados para o histórico");

        // 3) Salvar registro da semana em "semanas/"
        const hoje = new Date();
        const dataFormatada = hoje.toLocaleDateString("pt-BR");

        await setDoc(doc(db, "semanas", semanaId), {
            numero: semanaAtualNumero,
            dataFim: dataFormatada
        });

        console.log("✅ Registro da semana salvo");

        // 4) Avançar número da semana
        const novaSemana = semanaAtualNumero + 1;

        await setDoc(doc(db, "semanas", "atual"), {
            numero: novaSemana
        });

        semanaAtualNumero = novaSemana;
        console.log("✅ Semana avançada para:", novaSemana);

        // 5) Limpar livros atuais (resetar para placeholder)
        for (const docSnap of snapshot.docs) {
            await setDoc(doc(db, "livros", docSnap.id), {
                imagem: "",
                titulo: "Novo Livro",
                sinopse: "",
                ordem: docSnap.data().ordem || 1
            });
        }

        console.log("✅ Livros resetados para nova semana");

        msgEl.textContent = `✅ Semana finalizada! Agora estamos na Semana ${novaSemana}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        // Recarregar tudo
        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        // Fechar modal após 2 segundos
        setTimeout(() => {
            fecharFinalizarBox();
        }, 2000);

    } catch (erro) {
        console.error("❌ Erro ao finalizar semana:", erro);
        msgEl.textContent = "❌ Erro ao finalizar. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";

    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Confirmar";
    }
});

// ========================
// DESFAZER FINALIZAÇÃO
// ========================

document.getElementById("desfazerBtn").addEventListener("click", () => {
    const semanaAnterior = (semanaAtualNumero || 2) - 1;

    if (semanaAnterior < 1) {
        alert("Não há semana anterior para restaurar.");
        return;
    }

    const texto = document.getElementById("desfazerTexto");
    texto.innerHTML = `Restaurar a <strong>Semana ${semanaAnterior}</strong> e voltar de <strong>Semana ${semanaAtualNumero}</strong> para <strong>Semana ${semanaAnterior}</strong>?`;

    document.getElementById("desfazerOverlay").style.display = "flex";
    document.getElementById("desfazerMsg").style.display = "none";
});

document.getElementById("confirmarDesfazer").addEventListener("click", async () => {
    const btnConfirmar = document.getElementById("confirmarDesfazer");
    const btnCancelar = document.getElementById("cancelarDesfazer");
    const msgEl = document.getElementById("desfazerMsg");

    const semanaAnterior = (semanaAtualNumero || 2) - 1;
    const semanaAnteriorId = `semana_${semanaAnterior}`;

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Restaurando...";

    try {
        console.log(`⟲ Desfazendo... Restaurando semana ${semanaAnterior}`);

        // 1) Verificar se o histórico da semana anterior existe
        const historicoRef = collection(db, "historico", semanaAnteriorId, "livros");
        const historicoSnapshot = await getDocs(historicoRef);

        if (historicoSnapshot.empty) {
            msgEl.textContent = ` Histórico da Semana ${semanaAnterior} não encontrado.`;
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        console.log(`📦 Encontrados ${historicoSnapshot.size} livros no histórico`);

        // 2) Apagar os livros atuais
        const livrosAtualSnapshot = await getDocs(livrosRef);
        for (const docSnap of livrosAtualSnapshot.docs) {
            await deleteDoc(doc(db, "livros", docSnap.id));
        }
        console.log("🗑 Livros atuais apagados");

        // 3) Copiar livros do histórico de volta para "livros/"
        for (const docSnap of historicoSnapshot.docs) {
            const dados = docSnap.data();
            await setDoc(doc(db, "livros", docSnap.id), dados);
        }
        console.log("✅ Livros restaurados do histórico");

        // 4) Apagar os livros do histórico dessa semana
        for (const docSnap of historicoSnapshot.docs) {
            await deleteDoc(doc(db, "historico", semanaAnteriorId, "livros", docSnap.id));
        }
        console.log("🗑 Histórico da semana apagado");

        // 5) Apagar o registro da semana em "semanas/"
        await deleteDoc(doc(db, "semanas", semanaAnteriorId));
        console.log("🗑 Registro da semana removido");

        // 6) Voltar o número da semana atual
        semanaAtualNumero = semanaAnterior;
        await setDoc(doc(db, "semanas", "atual"), {
            numero: semanaAnterior
        });
        console.log(`✅ Semana revertida para ${semanaAnterior}`);

        msgEl.textContent = ` Restaurado! Voltamos para a Semana ${semanaAnterior}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        // Recarregar tudo
        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        setTimeout(() => {
            fecharDesfazerBox();
        }, 2500);

    } catch (erro) {
        console.error(" Erro ao desfazer:", erro);
        msgEl.textContent = " Erro ao restaurar. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Desfazer";
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
    const finalizarNav = document.getElementById("finalizarNav");
    const desfazerNav = document.getElementById("desfazerNav");

    if (user) {
        console.log("🔓 ADM logado:", user.email);
        isAdmin = true;
        adminPanel.style.display = "inline-block";
        loginBtn.style.display = "none";
        finalizarNav.style.display = "inline-block";
        desfazerNav.style.display = "inline-block";
    } else {
        console.log("🔒 Não logado");
        isAdmin = false;
        adminPanel.style.display = "none";
        loginBtn.style.display = "inline-block";
        finalizarNav.style.display = "none";
        desfazerNav.style.display = "none";
    }

    if (!visualizandoHistorico) {
        document.querySelectorAll(".btn-editar-livro").forEach(btn => {
            btn.style.display = isAdmin ? "block" : "none";
        });
    }
});

// ========================
// INICIALIZAÇÃO
// ========================

async function inicializar() {
    console.log("🏁 Inicializando...");
    await carregarSemanaAtual();
    await carregarHistorico();
    await carregarLivros();
    console.log("✅ Tudo carregado!");
}

inicializar();
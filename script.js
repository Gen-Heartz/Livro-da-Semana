console.log("script.js carregado.");

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
let visualizandoProxima = false;
let semanaVisualizadaId = null;
let semanaVisualizadaObj = null;
let proximaConfig = null;
let promocaoPendenteVirtual = false;
let proximaTimerId = null;
let inicializacaoConcluida = false;
const anosAbertos = new Set();

const livrosRef = collection(db, "livros");
const proximaLivrosRef = collection(db, "historico", "proxima_semana", "livros");

let resolveAuthInicial;
const authInicialPromise = new Promise((resolve) => {
    resolveAuthInicial = resolve;
});
let authInicialResolvida = false;

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

function formatarDataHoraBR(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return "";
    const data = d.toLocaleDateString("pt-BR");
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${data} às ${hora}`;
}

function timestampParaInputLocal(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function numeroSemanaExibida() {
    if (promocaoPendenteVirtual) {
        return (semanaAtualNumero || 1) + 1;
    }
    return semanaAtualNumero;
}

function atualizarControlesAdmin() {
    const editarSemanaBtn = document.getElementById("editarSemanaBtn");
    const removerSemanaBtn = document.getElementById("removerSemanaBtn");
    const desfazerAnoNav = document.getElementById("desfazerAnoNav");
    const proximaPainel = document.getElementById("proximaPainel");
    const proximaResumoAdmin = document.getElementById("proximaResumoAdmin");

    if (desfazerAnoNav) {
        const temAnoArquivado = semanasHistorico.some(s => Boolean(s.ano));
        desfazerAnoNav.style.display = (isAdmin && temAnoArquivado) ? "inline-block" : "none";
    }

    if (editarSemanaBtn) {
        editarSemanaBtn.style.display = (isAdmin && !visualizandoHistorico && !visualizandoProxima)
            ? "inline-block"
            : "none";
    }

    if (removerSemanaBtn) {
        const podeRemover = isAdmin && visualizandoHistorico && semanaVisualizadaObj && semanaVisualizadaObj.historicoId !== "__livros_atual__";
        removerSemanaBtn.style.display = podeRemover ? "inline-block" : "none";
    }

    if (proximaPainel) {
        proximaPainel.style.display = (isAdmin && visualizandoProxima) ? "block" : "none";
    }

    if (proximaResumoAdmin) {
        if (isAdmin && !visualizandoHistorico && !visualizandoProxima && proximaConfig && proximaConfig.ativo) {
            const numProx = (semanaAtualNumero || 1) + 1;
            if (proximaConfig.ativarEm) {
                proximaResumoAdmin.textContent = `Próxima semana (Semana ${numProx}) agendada para ativação automática em ${formatarDataHoraBR(proximaConfig.ativarEm)}.`;
            } else {
                proximaResumoAdmin.textContent = `Próxima semana (Semana ${numProx}) salva como rascunho (sem data automática).`;
            }
            proximaResumoAdmin.style.display = "block";
        } else {
            proximaResumoAdmin.style.display = "none";
        }
    }

    if (!visualizandoHistorico) {
        document.querySelectorAll(".btn-editar-livro").forEach(btn => {
            btn.style.display = isAdmin ? "inline-block" : "none";
        });
    }
}

// ========================
// DROPDOWN DE SEMANAS (CLICK + HOVER)
// ========================

const semanasNavWrapper = document.getElementById("semanasNavWrapper");
const semanasNavBtn = document.getElementById("semanasNav");

if (semanasNavBtn && semanasNavWrapper) {
    semanasNavBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        semanasNavWrapper.classList.toggle("dropdown-aberto");
    });

    document.addEventListener("click", (e) => {
        if (!semanasNavWrapper.contains(e.target)) {
            semanasNavWrapper.classList.remove("dropdown-aberto");
        }
    });
}

// ========================
// CARREGAR NÚMERO DA SEMANA ATUAL E PRÓXIMA SEMANA
// ========================

async function carregarSemanaAtual() {
    try {
        const docRef = doc(db, "semanas", "atual");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            semanaAtualNumero = docSnap.data().numero;
        } else {
            semanaAtualNumero = 1;
            if (isAdmin) {
                await setDoc(docRef, { numero: 1 });
            }
        }
    } catch (erro) {
        console.error("Erro ao carregar semana:", erro);
        semanaAtualNumero = 1;
    }
}

async function carregarProximaSemanaConfig() {
    try {
        const docRef = doc(db, "semanas", "proxima");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().ativo) {
            const dados = docSnap.data();
            proximaConfig = {
                ativo: true,
                numero: Number(dados.numero) || ((semanaAtualNumero || 1) + 1),
                ativarEm: dados.ativarEm ? Number(dados.ativarEm) : null
            };
        } else {
            proximaConfig = null;
        }
    } catch (erro) {
        console.error("Erro ao carregar próxima semana:", erro);
        proximaConfig = null;
    }
}

function agendarTimerProxima() {
    if (proximaTimerId) {
        clearTimeout(proximaTimerId);
        proximaTimerId = null;
    }

    if (!proximaConfig || !proximaConfig.ativo || !proximaConfig.ativarEm) {
        return;
    }

    const restante = proximaConfig.ativarEm - Date.now();
    if (restante > 0 && restante <= 86400000) {
        proximaTimerId = setTimeout(async () => {
            await verificarEAtivarProximaSeVencida();
            if (!visualizandoHistorico) {
                visualizandoProxima = false;
                await carregarHistorico();
                await carregarLivros();
                atualizarTituloSemana();
            }
        }, restante + 200);
    }
}

async function verificarEAtivarProximaSeVencida() {
    if (!proximaConfig || !proximaConfig.ativo || !proximaConfig.ativarEm) {
        promocaoPendenteVirtual = false;
        return;
    }

    if (Date.now() < proximaConfig.ativarEm) {
        promocaoPendenteVirtual = false;
        agendarTimerProxima();
        return;
    }

    if (isAdmin) {
        await promoverProximaSemanaNoFirestore(proximaConfig.ativarEm);
        promocaoPendenteVirtual = false;
    } else {
        promocaoPendenteVirtual = true;
    }
}

async function promoverProximaSemanaNoFirestore(timestampFim = null) {
    const qAtual = query(livrosRef, orderBy("ordem"));
    const atualSnap = await getDocs(qAtual);

    const qProxima = query(proximaLivrosRef, orderBy("ordem"));
    const proximaSnap = await getDocs(qProxima);

    if (proximaSnap.empty) {
        await deleteDoc(doc(db, "semanas", "proxima"));
        proximaConfig = null;
        return;
    }

    const semanaEncerrada = semanaAtualNumero || 1;
    const semanaEncerradaId = `semana_${semanaEncerrada}`;

    // 1) Arquiva livros atuais no histórico
    for (const docSnap of atualSnap.docs) {
        await setDoc(
            doc(db, "historico", semanaEncerradaId, "livros", docSnap.id),
            docSnap.data()
        );
    }

    const dataRef = timestampFim ? new Date(timestampFim) : new Date();
    const dataFormatada = dataRef.toLocaleDateString("pt-BR");

    await setDoc(doc(db, "semanas", semanaEncerradaId), {
        numero: semanaEncerrada,
        dataFim: dataFormatada
    });

    // 2) Substitui livros atuais pelos da próxima semana
    const proximaIds = new Set(proximaSnap.docs.map(d => d.id));
    for (const docSnap of atualSnap.docs) {
        if (!proximaIds.has(docSnap.id)) {
            await deleteDoc(doc(db, "livros", docSnap.id));
        }
    }

    for (const docSnap of proximaSnap.docs) {
        await setDoc(doc(db, "livros", docSnap.id), docSnap.data());
    }

    // 3) Avança número da semana atual
    const novaSemana = semanaEncerrada + 1;
    semanaAtualNumero = novaSemana;
    await setDoc(doc(db, "semanas", "atual"), { numero: novaSemana });

    // 4) Limpa próxima semana
    for (const docSnap of proximaSnap.docs) {
        await deleteDoc(doc(db, "historico", "proxima_semana", "livros", docSnap.id));
    }
    await deleteDoc(doc(db, "semanas", "proxima"));
    proximaConfig = null;
    promocaoPendenteVirtual = false;

    if (proximaTimerId) {
        clearTimeout(proximaTimerId);
        proximaTimerId = null;
    }
}

function atualizarTituloSemana() {
    const titulo = document.getElementById("tituloSemana");
    const subtitulo = document.getElementById("subtituloSemana");

    if (visualizandoHistorico || visualizandoProxima) {
        atualizarControlesAdmin();
        return;
    }

    titulo.textContent = `Semana ${numeroSemanaExibida()}`;
    subtitulo.textContent = "Conheça os livros da semana.";
    atualizarControlesAdmin();
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
            if (docSnap.id === "atual" || docSnap.id === "proxima" || docSnap.id === "ultimo_ano") return;
            const dados = docSnap.data();
            semanasHistorico.push({
                id: docSnap.id,
                numero: Number(dados.numero) || 0,
                dataFim: dados.dataFim || "",
                ano: dados.ano ? String(dados.ano) : null,
                historicoId: dados.historicoId || docSnap.id
            });
        });

        // Se a próxima semana já atingiu a data programada mas um visitante abriu antes do admin,
        // exibe a semana que acabou de encerrar na lista de histórico usando a coleção atual "livros".
        if (promocaoPendenteVirtual && semanaAtualNumero) {
            const jaExiste = semanasHistorico.some(s => !s.ano && s.numero === semanaAtualNumero);
            if (!jaExiste) {
                semanasHistorico.push({
                    id: `virtual_semana_${semanaAtualNumero}`,
                    numero: semanaAtualNumero,
                    dataFim: proximaConfig && proximaConfig.ativarEm
                        ? new Date(proximaConfig.ativarEm).toLocaleDateString("pt-BR")
                        : "",
                    ano: null,
                    historicoId: "__livros_atual__"
                });
            }
        }

        semanasHistorico.sort((a, b) => b.numero - a.numero);
        renderizarDropdownSemanas();
        atualizarControlesAdmin();
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        dropdown.innerHTML = `<p class="dropdown-vazio">Erro ao carregar</p>`;
    }
}

function renderizarDropdownSemanas() {
    const dropdown = document.getElementById("semanasDropdown");
    dropdown.innerHTML = "";

    const linkAtual = document.createElement("a");
    linkAtual.href = "#";
    linkAtual.textContent = `Semana ${numeroSemanaExibida()} (atual)`;

    if (!visualizandoHistorico && !visualizandoProxima) {
        linkAtual.classList.add("semana-ativa");
    } else {
        linkAtual.addEventListener("click", (e) => {
            e.preventDefault();
            semanasNavWrapper.classList.remove("dropdown-aberto");
            voltarParaAtual();
        });
    }

    dropdown.appendChild(linkAtual);

    const semanasAbertas = semanasHistorico
        .filter(s => !s.ano)
        .sort((a, b) => b.numero - a.numero);

    const anosMap = new Map();
    semanasHistorico
        .filter(s => Boolean(s.ano))
        .forEach((s) => {
            if (!anosMap.has(s.ano)) {
                anosMap.set(s.ano, []);
            }
            anosMap.get(s.ano).push(s);
        });

    if (semanasAbertas.length === 0 && anosMap.size === 0) {
        const vazio = document.createElement("p");
        vazio.className = "dropdown-vazio";
        vazio.textContent = "Sem semanas anteriores";
        dropdown.appendChild(vazio);
        return;
    }

    if (semanasAbertas.length > 0) {
        const separador = document.createElement("div");
        separador.className = "dropdown-separador";
        dropdown.appendChild(separador);

        semanasAbertas.forEach((semana) => {
            const link = criarLinkSemana(semana);
            dropdown.appendChild(link);
        });
    }

    if (anosMap.size > 0) {
        const separadorAnos = document.createElement("div");
        separadorAnos.className = "dropdown-separador";
        dropdown.appendChild(separadorAnos);

        const anosOrdenados = Array.from(anosMap.keys()).sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
                return numB - numA;
            }
            return b.localeCompare(a, "pt-BR");
        });

        anosOrdenados.forEach((ano) => {
            const semanasDoAno = anosMap.get(ano).slice().sort((a, b) => b.numero - a.numero);
            const estaAberta = anosAbertos.has(ano);

            const pastaDiv = document.createElement("div");
            pastaDiv.className = "dropdown-pasta" + (estaAberta ? " aberta" : "");

            const toggleBtn = document.createElement("button");
            toggleBtn.type = "button";
            toggleBtn.className = "pasta-toggle";
            toggleBtn.innerHTML = `
                <span class="pasta-nome">${escapeHTML(ano)}</span>
                <span class="pasta-meta">${semanasDoAno.length} ${semanasDoAno.length === 1 ? "semana" : "semanas"}</span>
            `;

            const conteudoDiv = document.createElement("div");
            conteudoDiv.className = "pasta-conteudo";

            semanasDoAno.forEach((semana) => {
                const link = criarLinkSemana(semana);
                conteudoDiv.appendChild(link);
            });

            toggleBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (anosAbertos.has(ano)) {
                    anosAbertos.delete(ano);
                    pastaDiv.classList.remove("aberta");
                } else {
                    anosAbertos.add(ano);
                    pastaDiv.classList.add("aberta");
                }
            });

            pastaDiv.appendChild(toggleBtn);
            pastaDiv.appendChild(conteudoDiv);
            dropdown.appendChild(pastaDiv);
        });
    }
}

function criarLinkSemana(semana) {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = semana.dataFim
        ? `Semana ${semana.numero} — ${semana.dataFim}`
        : `Semana ${semana.numero}`;

    if (visualizandoHistorico && semanaVisualizadaId === semana.id) {
        link.classList.add("semana-ativa");
    } else {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            semanasNavWrapper.classList.remove("dropdown-aberto");
            carregarSemanaHistorico(semana);
        });
    }

    return link;
}

// ========================
// CARREGAR LIVROS DE UMA SEMANA DO HISTÓRICO
// ========================

async function carregarSemanaHistorico(semana) {
    const container = document.getElementById("booksContainer");
    const titulo = document.getElementById("tituloSemana");
    const subtitulo = document.getElementById("subtituloSemana");
    const btnVoltar = document.getElementById("voltarAtual");

    const numeroSemana = typeof semana === "object" ? semana.numero : semana;
    const historicoId = (typeof semana === "object" && semana.historicoId)
        ? semana.historicoId
        : `semana_${numeroSemana}`;
    const anoSemana = typeof semana === "object" ? semana.ano : null;

    container.innerHTML = `<p class="estado-vazio">Carregando semana ${escapeHTML(numeroSemana)}...</p>`;
    visualizandoHistorico = true;
    visualizandoProxima = false;
    semanaVisualizadaId = typeof semana === "object" ? semana.id : `semana_${numeroSemana}`;
    semanaVisualizadaObj = typeof semana === "object"
        ? semana
        : { id: semanaVisualizadaId, numero: numeroSemana, ano: null, historicoId };

    if (anoSemana) {
        anosAbertos.add(anoSemana);
        titulo.innerHTML = `Semana ${escapeHTML(numeroSemana)} <span class="historico-badge">${escapeHTML(anoSemana)} · histórico</span>`;
    } else {
        titulo.innerHTML = `Semana ${escapeHTML(numeroSemana)} <span class="historico-badge">histórico</span>`;
    }

    subtitulo.textContent = "Você está vendo uma semana anterior.";
    btnVoltar.style.display = "inline-block";
    atualizarControlesAdmin();

    try {
        const refAlvo = historicoId === "__livros_atual__"
            ? livrosRef
            : collection(db, "historico", historicoId, "livros");

        const q = query(refAlvo, orderBy("ordem"));
        const snapshot = await getDocs(q);

        livrosData = [];
        snapshot.forEach((docSnap) => {
            livrosData.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (livrosData.length === 0) {
            container.innerHTML = `<p class="estado-vazio">Nenhum livro registrado nesta semana.</p>`;
            renderizarDropdownSemanas();
            return;
        }

        renderizarLivros(false);
        renderizarDropdownSemanas();
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        container.innerHTML = `<p class="msg-erro" style="text-align:center;">Erro ao carregar histórico.</p>`;
    }
}

// ========================
// VOLTAR PARA SEMANA ATUAL
// ========================

window.voltarParaAtual = function () {
    visualizandoHistorico = false;
    visualizandoProxima = false;
    semanaVisualizadaId = null;
    semanaVisualizadaObj = null;
    document.getElementById("voltarAtual").style.display = "none";
    atualizarTituloSemana();
    carregarLivros();
    renderizarDropdownSemanas();
};

window.addEventListener("voltarAtual", () => {
    window.voltarParaAtual();
});

// ========================
// CARREGAR LIVROS DA SEMANA ATUAL
// ========================

async function carregarLivros() {
    const container = document.getElementById("booksContainer");
    visualizandoHistorico = false;
    visualizandoProxima = false;
    semanaVisualizadaId = null;
    semanaVisualizadaObj = null;
    document.getElementById("voltarAtual").style.display = "none";

    try {
        const refAlvo = promocaoPendenteVirtual ? proximaLivrosRef : livrosRef;
        const q = query(refAlvo, orderBy("ordem"));
        const snapshot = await getDocs(q);

        livrosData = [];
        snapshot.forEach((docSnap) => {
            livrosData.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarLivros(true);
    } catch (erro) {
        console.error("Erro ao carregar livros:", erro);
        container.innerHTML = `<p class="msg-erro" style="text-align:center;">Erro ao carregar livros.</p>`;
    }
}

// ========================
// RENDERIZAR LIVROS
// ========================

function renderizarLivros(mostrarEdicao = true) {
    const container = document.getElementById("booksContainer");

    if (livrosData.length === 0) {
        container.innerHTML = `<p class="estado-vazio">Nenhum livro encontrado.</p>`;
        return;
    }

    container.innerHTML = "";

    livrosData.forEach((livro) => {
        const sinopseHTML = textoParaHTML(livro.sinopse || "");
        const tituloSeguro = escapeHTML(livro.titulo || "Sem título");
        const imagemSegura = escapeHTML(livro.imagem || "");
        const bookDiv = document.createElement("div");
        bookDiv.classList.add("book");

        const mostrarBtn = mostrarEdicao && isAdmin && !visualizandoHistorico;

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
                    style="display: ${mostrarBtn ? 'inline-block' : 'none'};">
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
            abrirEdicaoLivro(livro.id);
        });

        container.appendChild(bookDiv);
    });
}

// ========================
// EDIÇÃO DE LIVROS (ATUAL OU PRÓXIMA SEMANA)
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

    document.getElementById("editBoxTitulo").textContent = visualizandoProxima
        ? "Editar Livro (Próxima Semana)"
        : "Editar Livro";

    preencherFormularioEdicao(livro);

    document.getElementById("editOverlay").style.display = "flex";
    document.getElementById("editMsg").style.display = "none";
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
        const docDestino = visualizandoProxima
            ? doc(db, "historico", "proxima_semana", "livros", livroId)
            : doc(db, "livros", livroId);

        await setDoc(docDestino, {
            imagem: novaImagem,
            titulo: novoTitulo,
            sinopse: novaSinopse,
            ordem: livroAtual ? livroAtual.ordem : 1
        });

        msgEl.textContent = "Livro salvo com sucesso.";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        if (visualizandoProxima) {
            await carregarLivrosProximaSemana();
        } else {
            await carregarLivros();
        }

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
// MODO PRÓXIMA SEMANA
// ========================

async function abrirModoProximaSemana() {
    if (!isAdmin) return;

    const container = document.getElementById("booksContainer");
    const titulo = document.getElementById("tituloSemana");
    const subtitulo = document.getElementById("subtituloSemana");
    const btnVoltar = document.getElementById("voltarAtual");
    const inputDataHora = document.getElementById("proximaDataHora");
    const msgEl = document.getElementById("proximaMsg");

    visualizandoHistorico = false;
    visualizandoProxima = true;
    semanaVisualizadaId = null;
    semanaVisualizadaObj = null;

    const numProx = (semanaAtualNumero || 1) + 1;
    titulo.innerHTML = `Semana ${escapeHTML(numProx)} <span class="historico-badge">próxima semana</span>`;
    subtitulo.textContent = "Prepare os livros da próxima semana. Os visitantes continuam vendo a semana atual até a ativação.";
    btnVoltar.style.display = "inline-block";
    msgEl.style.display = "none";

    container.innerHTML = `<p class="estado-vazio">Carregando rascunho da próxima semana...</p>`;
    atualizarControlesAdmin();
    renderizarDropdownSemanas();

    await garantirRascunhoProximaSemana();
    await carregarLivrosProximaSemana();

    inputDataHora.value = (proximaConfig && proximaConfig.ativarEm)
        ? timestampParaInputLocal(proximaConfig.ativarEm)
        : "";
}

async function garantirRascunhoProximaSemana() {
    const qProx = query(proximaLivrosRef, orderBy("ordem"));
    const proxSnap = await getDocs(qProx);

    if (proxSnap.empty) {
        const qAtual = query(livrosRef, orderBy("ordem"));
        const atualSnap = await getDocs(qAtual);

        if (!atualSnap.empty) {
            for (const docSnap of atualSnap.docs) {
                await setDoc(
                    doc(db, "historico", "proxima_semana", "livros", docSnap.id),
                    {
                        imagem: "",
                        titulo: "Novo Livro",
                        sinopse: "",
                        ordem: docSnap.data().ordem || 1
                    }
                );
            }
        } else {
            for (let i = 1; i <= 4; i++) {
                await setDoc(
                    doc(db, "historico", "proxima_semana", "livros", `livro${i}`),
                    {
                        imagem: "",
                        titulo: "Novo Livro",
                        sinopse: "",
                        ordem: i
                    }
                );
            }
        }
    }

    if (!proximaConfig || !proximaConfig.ativo) {
        proximaConfig = {
            ativo: true,
            numero: (semanaAtualNumero || 1) + 1,
            ativarEm: null
        };
        await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
    }
}

async function carregarLivrosProximaSemana() {
    const container = document.getElementById("booksContainer");

    try {
        const q = query(proximaLivrosRef, orderBy("ordem"));
        const snapshot = await getDocs(q);

        livrosData = [];
        snapshot.forEach((docSnap) => {
            livrosData.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarLivros(true);
    } catch (erro) {
        console.error("Erro ao carregar próxima semana:", erro);
        container.innerHTML = `<p class="msg-erro" style="text-align:center;">Erro ao carregar próxima semana.</p>`;
    }
}

document.getElementById("proximaBtn").addEventListener("click", () => {
    abrirModoProximaSemana();
});

document.getElementById("salvarAgendamentoBtn").addEventListener("click", async () => {
    const input = document.getElementById("proximaDataHora");
    const msgEl = document.getElementById("proximaMsg");
    const btn = document.getElementById("salvarAgendamentoBtn");
    const valor = input.value;

    let ativarEm = null;
    if (valor) {
        const parsed = new Date(valor).getTime();
        if (Number.isNaN(parsed)) {
            msgEl.textContent = "Data e hora inválidas.";
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }
        ativarEm = parsed;
    }

    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
        proximaConfig = {
            ativo: true,
            numero: (semanaAtualNumero || 1) + 1,
            ativarEm: ativarEm
        };
        await setDoc(doc(db, "semanas", "proxima"), proximaConfig);

        if (ativarEm && Date.now() >= ativarEm) {
            await promoverProximaSemanaNoFirestore(ativarEm);
            await carregarHistorico();
            window.voltarParaAtual();
            return;
        }

        agendarTimerProxima();

        msgEl.textContent = ativarEm
            ? `Agendamento salvo para ${formatarDataHoraBR(ativarEm)}.`
            : "Rascunho salvo sem data automática.";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";
    } catch (erro) {
        console.error("Erro ao salvar agendamento:", erro);
        msgEl.textContent = "Erro ao salvar agendamento.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Salvar agendamento";
    }
});

document.getElementById("limparAgendamentoBtn").addEventListener("click", async () => {
    const input = document.getElementById("proximaDataHora");
    const msgEl = document.getElementById("proximaMsg");

    input.value = "";
    try {
        proximaConfig = {
            ativo: true,
            numero: (semanaAtualNumero || 1) + 1,
            ativarEm: null
        };
        await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
        if (proximaTimerId) {
            clearTimeout(proximaTimerId);
            proximaTimerId = null;
        }

        msgEl.textContent = "Data automática removida. A próxima semana permanece salva como rascunho.";
        msgEl.className = "sucesso";
        msgEl.style.display = "block";
    } catch (erro) {
        console.error("Erro ao limpar agendamento:", erro);
        msgEl.textContent = "Erro ao limpar agendamento.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    }
});

document.getElementById("ativarProximaAgoraBtn").addEventListener("click", async () => {
    const btn = document.getElementById("ativarProximaAgoraBtn");
    const msgEl = document.getElementById("proximaMsg");

    btn.disabled = true;
    btn.textContent = "Ativando...";

    try {
        await promoverProximaSemanaNoFirestore(Date.now());
        await carregarHistorico();
        window.voltarParaAtual();
    } catch (erro) {
        console.error("Erro ao ativar próxima semana:", erro);
        msgEl.textContent = "Erro ao ativar próxima semana.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Ativar agora";
    }
});

document.getElementById("descartarProximaBtn").addEventListener("click", async () => {
    const btn = document.getElementById("descartarProximaBtn");
    const msgEl = document.getElementById("proximaMsg");

    btn.disabled = true;
    btn.textContent = "Descartando...";

    try {
        const snap = await getDocs(proximaLivrosRef);
        for (const docSnap of snap.docs) {
            await deleteDoc(doc(db, "historico", "proxima_semana", "livros", docSnap.id));
        }
        await deleteDoc(doc(db, "semanas", "proxima"));
        proximaConfig = null;

        if (proximaTimerId) {
            clearTimeout(proximaTimerId);
            proximaTimerId = null;
        }

        window.voltarParaAtual();
    } catch (erro) {
        console.error("Erro ao descartar próxima semana:", erro);
        msgEl.textContent = "Erro ao descartar próxima semana.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Descartar";
    }
});

// ========================
// EDITAR NÚMERO DA SEMANA ATUAL
// ========================

document.getElementById("editarSemanaBtn").addEventListener("click", () => {
    if (!isAdmin || visualizandoHistorico || visualizandoProxima) return;

    const input = document.getElementById("inputNumeroSemana");
    input.value = semanaAtualNumero || 1;
    document.getElementById("editarSemanaMsg").style.display = "none";
    document.getElementById("editarSemanaOverlay").style.display = "flex";
    input.focus();
    input.select();
});

document.getElementById("inputNumeroSemana").addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        document.getElementById("confirmarEditarSemana").click();
    }
});

document.getElementById("confirmarEditarSemana").addEventListener("click", async () => {
    const input = document.getElementById("inputNumeroSemana");
    const btnSalvar = document.getElementById("confirmarEditarSemana");
    const btnCancelar = document.getElementById("cancelarEditarSemana");
    const msgEl = document.getElementById("editarSemanaMsg");

    const novoNumero = parseInt(input.value, 10);

    if (Number.isNaN(novoNumero) || novoNumero < 1) {
        msgEl.textContent = "Informe um número inteiro válido (maior ou igual a 1).";
        msgEl.className = "erro";
        msgEl.style.display = "block";
        return;
    }

    btnSalvar.disabled = true;
    btnCancelar.disabled = true;
    btnSalvar.textContent = "Salvando...";

    try {
        await setDoc(doc(db, "semanas", "atual"), {
            numero: novoNumero
        });

        semanaAtualNumero = novoNumero;

        if (proximaConfig && proximaConfig.ativo) {
            proximaConfig.numero = novoNumero + 1;
            await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
        }

        atualizarTituloSemana();
        renderizarDropdownSemanas();

        msgEl.textContent = `Número atualizado para Semana ${novoNumero}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        setTimeout(() => {
            window.fecharEditarSemanaBox();
        }, 1200);
    } catch (erro) {
        console.error("Erro ao atualizar número da semana:", erro);
        msgEl.textContent = "Erro ao atualizar número da semana.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnSalvar.disabled = false;
        btnCancelar.disabled = false;
        btnSalvar.textContent = "Salvar";
    }
});

// ========================
// REMOVER SEMANA DO HISTÓRICO E RENUMERAR SEGUINTES
// ========================

document.getElementById("removerSemanaBtn").addEventListener("click", () => {
    if (!isAdmin || !visualizandoHistorico || !semanaVisualizadaObj) return;

    const textoEl = document.getElementById("removerSemanaTexto");
    const avisoEl = document.getElementById("removerSemanaAviso");
    const msgEl = document.getElementById("removerSemanaMsg");

    if (semanaVisualizadaObj.ano) {
        textoEl.innerHTML = `Tem certeza que deseja remover a <strong>Semana ${escapeHTML(semanaVisualizadaObj.numero)}</strong> da pasta <strong>${escapeHTML(semanaVisualizadaObj.ano)}</strong>?`;
        avisoEl.textContent = `Esta semana será excluída permanentemente. As semanas posteriores dentro da pasta ${semanaVisualizadaObj.ano} serão renumeradas para baixo.`;
    } else {
        textoEl.innerHTML = `Tem certeza que deseja remover a <strong>Semana ${escapeHTML(semanaVisualizadaObj.numero)}</strong>?`;
        avisoEl.textContent = "Esta semana será excluída permanentemente. Todas as semanas posteriores da lista atual serão renumeradas para baixo e o número da semana atual será ajustado.";
    }

    msgEl.style.display = "none";
    document.getElementById("removerSemanaOverlay").style.display = "flex";
});

document.getElementById("confirmarRemoverSemana").addEventListener("click", async () => {
    if (!semanaVisualizadaObj) return;

    const btnConfirmar = document.getElementById("confirmarRemoverSemana");
    const btnCancelar = document.getElementById("cancelarRemoverSemana");
    const msgEl = document.getElementById("removerSemanaMsg");

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Removendo...";

    try {
        const alvo = semanaVisualizadaObj;
        const semanasSnapshot = await getDocs(collection(db, "semanas"));
        const todasSemanas = [];
        const idsOutrosGrupos = new Set();

        semanasSnapshot.forEach((docSnap) => {
            if (docSnap.id === "atual" || docSnap.id === "proxima" || docSnap.id === "ultimo_ano") return;
            const dados = docSnap.data();
            const item = {
                id: docSnap.id,
                numero: Number(dados.numero) || 0,
                dataFim: dados.dataFim || "",
                ano: dados.ano ? String(dados.ano) : null,
                historicoId: dados.historicoId || docSnap.id
            };
            const mesmoGrupo = alvo.ano ? item.ano === alvo.ano : !item.ano;
            if (mesmoGrupo) {
                todasSemanas.push(item);
            } else {
                idsOutrosGrupos.add(docSnap.id);
            }
        });

        const alvoAtualizado = todasSemanas.find(w => w.id === alvo.id);
        if (!alvoAtualizado) {
            msgEl.textContent = "Semana não encontrada no banco de dados.";
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        const posteriores = todasSemanas
            .filter(w => w.id !== alvoAtualizado.id && w.numero > alvoAtualizado.numero)
            .sort((a, b) => a.numero - b.numero);

        // 1) Lê em memória os livros de todas as semanas que serão renumeradas
        const posterioresComLivros = [];
        for (const w of posteriores) {
            const oldHistId = w.historicoId || w.id;
            const booksSnap = await getDocs(collection(db, "historico", oldHistId, "livros"));
            const livros = booksSnap.docs.map(d => ({ id: d.id, data: d.data() }));
            posterioresComLivros.push({ week: w, oldHistId, livros });
        }

        // 2) Exclui livros e registro da semana removida
        const alvoHistId = alvoAtualizado.historicoId || alvoAtualizado.id;
        const alvoBooksSnap = await getDocs(collection(db, "historico", alvoHistId, "livros"));
        for (const b of alvoBooksSnap.docs) {
            await deleteDoc(doc(db, "historico", alvoHistId, "livros", b.id));
        }
        await deleteDoc(doc(db, "semanas", alvoAtualizado.id));

        // 3) Exclui registros antigos das semanas posteriores antes de gravar nos novos números
        for (const item of posterioresComLivros) {
            for (const b of item.livros) {
                await deleteDoc(doc(db, "historico", item.oldHistId, "livros", b.id));
            }
            await deleteDoc(doc(db, "semanas", item.week.id));
        }

        // 4) Grava as semanas posteriores com numero - 1
        const usados = new Set(idsOutrosGrupos);
        todasSemanas
            .filter(w => w.id !== alvoAtualizado.id && w.numero <= alvoAtualizado.numero)
            .forEach(w => usados.add(w.id));

        for (const item of posterioresComLivros) {
            const novoNumero = item.week.numero - 1;
            let baseId = alvo.ano
                ? `${alvo.ano.replace(/[^a-zA-Z0-9_-]/g, "_") || "ano"}_semana_${novoNumero}`
                : `semana_${novoNumero}`;

            let novoId = baseId;
            let sufixo = 2;
            while (usados.has(novoId)) {
                novoId = `${baseId}_${sufixo}`;
                sufixo++;
            }
            usados.add(novoId);

            for (const b of item.livros) {
                await setDoc(doc(db, "historico", novoId, "livros", b.id), b.data);
            }

            const novoRegistro = {
                numero: novoNumero,
                dataFim: item.week.dataFim || ""
            };
            if (alvo.ano) {
                novoRegistro.ano = alvo.ano;
                novoRegistro.historicoId = novoId;
            }

            await setDoc(doc(db, "semanas", novoId), novoRegistro);
        }

        // 5) Se estava na lista atual (sem pasta de ano), ajusta a semana atual se for maior
        if (!alvo.ano && semanaAtualNumero > alvoAtualizado.numero) {
            semanaAtualNumero = Math.max(1, semanaAtualNumero - 1);
            await setDoc(doc(db, "semanas", "atual"), {
                numero: semanaAtualNumero
            });

            if (proximaConfig && proximaConfig.ativo) {
                proximaConfig.numero = semanaAtualNumero + 1;
                await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
            }
        }

        msgEl.textContent = `Semana ${alvoAtualizado.numero} removida. Semanas posteriores reajustadas.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarHistorico();
        window.voltarParaAtual();

        setTimeout(() => {
            window.fecharRemoverSemanaBox();
        }, 1600);
    } catch (erro) {
        console.error("Erro ao remover semana:", erro);
        msgEl.textContent = "Erro ao remover semana. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Remover e Reajustar";
    }
});

// ========================
// FINALIZAR SEMANA
// ========================

document.getElementById("finalizarBtn").addEventListener("click", () => {
    const texto = document.getElementById("finalizarTexto");
    const usarProximaWrapper = document.getElementById("usarProximaWrapper");
    const usarProximaCheckbox = document.getElementById("usarProximaAoFinalizar");

    texto.innerHTML = `Tem certeza que deseja finalizar a <strong>Semana ${escapeHTML(semanaAtualNumero)}</strong>?`;

    if (proximaConfig && proximaConfig.ativo) {
        usarProximaWrapper.style.display = "flex";
        usarProximaCheckbox.checked = true;
    } else {
        usarProximaWrapper.style.display = "none";
        usarProximaCheckbox.checked = false;
    }

    document.getElementById("finalizarOverlay").style.display = "flex";
    document.getElementById("finalizarMsg").style.display = "none";
});

document.getElementById("confirmarFinalizar").addEventListener("click", async () => {
    const btnConfirmar = document.getElementById("confirmarFinalizar");
    const btnCancelar = document.getElementById("cancelarFinalizar");
    const msgEl = document.getElementById("finalizarMsg");
    const usarProxima = document.getElementById("usarProximaAoFinalizar").checked && proximaConfig && proximaConfig.ativo;

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Finalizando...";

    try {
        if (usarProxima) {
            await promoverProximaSemanaNoFirestore(Date.now());
            msgEl.textContent = `Semana finalizada. Próxima semana ativada como Semana ${semanaAtualNumero}.`;
        } else {
            const q = query(livrosRef, orderBy("ordem"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                msgEl.textContent = "Não há livros para arquivar.";
                msgEl.className = "erro";
                msgEl.style.display = "block";
                return;
            }

            const semanaId = `semana_${semanaAtualNumero}`;

            for (const docSnap of snapshot.docs) {
                const dados = docSnap.data();
                const historicoDocRef = doc(db, "historico", semanaId, "livros", docSnap.id);
                await setDoc(historicoDocRef, dados);
            }

            const hoje = new Date();
            const dataFormatada = hoje.toLocaleDateString("pt-BR");

            await setDoc(doc(db, "semanas", semanaId), {
                numero: semanaAtualNumero,
                dataFim: dataFormatada
            });

            const novaSemana = semanaAtualNumero + 1;

            await setDoc(doc(db, "semanas", "atual"), {
                numero: novaSemana
            });

            semanaAtualNumero = novaSemana;

            if (proximaConfig && proximaConfig.ativo) {
                proximaConfig.numero = novaSemana + 1;
                await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
            }

            for (const docSnap of snapshot.docs) {
                await setDoc(doc(db, "livros", docSnap.id), {
                    imagem: "",
                    titulo: "Novo Livro",
                    sinopse: "",
                    ordem: docSnap.data().ordem || 1
                });
            }

            msgEl.textContent = `Semana finalizada. Agora estamos na Semana ${novaSemana}.`;
        }

        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        setTimeout(() => {
            window.fecharFinalizarBox();
        }, 1800);
    } catch (erro) {
        console.error("Erro ao finalizar semana:", erro);
        msgEl.textContent = "Erro ao finalizar. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Confirmar";
    }
});

// ========================
// FINALIZAR ANO
// ========================

function atualizarResumoFinalizarAno() {
    const resumoEl = document.getElementById("finalizarAnoResumo");
    const incluirAtual = document.getElementById("modoAnoArquivar").checked;
    const semanasAbertas = semanasHistorico.filter(s => !s.ano).length;
    const total = semanasAbertas + (incluirAtual ? 1 : 0);

    if (total === 0) {
        resumoEl.textContent = "Não há semanas para arquivar no momento.";
        return;
    }

    if (incluirAtual) {
        resumoEl.textContent = `${total} ${total === 1 ? "semana será arquivada" : "semanas serão arquivadas"} (incluindo a Semana ${semanaAtualNumero} atual) na pasta do ano, e uma nova Semana 1 em branco será criada.`;
    } else {
        resumoEl.textContent = `${total} ${total === 1 ? "semana finalizada da lista será movida" : "semanas finalizadas da lista serão movidas"} para a pasta do ano, e os livros atuais continuarão na tela como Semana 1.`;
    }
}

document.getElementById("modoAnoArquivar").addEventListener("change", atualizarResumoFinalizarAno);
document.getElementById("modoAnoManter").addEventListener("change", atualizarResumoFinalizarAno);

document.getElementById("finalizarAnoBtn").addEventListener("click", async () => {
    const inputAno = document.getElementById("inputNomeAno");
    const msgEl = document.getElementById("finalizarAnoMsg");
    const radioArquivar = document.getElementById("modoAnoArquivar");
    const radioManter = document.getElementById("modoAnoManter");
    const tituloEl = document.getElementById("modoAnoTitulo");
    const labelArquivar = document.getElementById("modoAnoArquivarLabel");
    const labelManter = document.getElementById("modoAnoManterLabel");

    inputAno.value = new Date().getFullYear().toString();
    msgEl.style.display = "none";

    let temConteudoAtual = false;
    try {
        const atualSnap = await getDocs(livrosRef);
        atualSnap.forEach((docSnap) => {
            const d = docSnap.data();
            const titulo = (d.titulo || "").trim();
            const imagem = (d.imagem || "").trim();
            const sinopse = (d.sinopse || "").trim();
            if (imagem || sinopse || (titulo && titulo !== "Novo Livro")) {
                temConteudoAtual = true;
            }
        });
    } catch {
        temConteudoAtual = true;
    }

    if (temConteudoAtual) {
        radioArquivar.checked = true;
    } else {
        radioManter.checked = true;
    }

    tituloEl.textContent = `O que fazer com a semana atual (Semana ${semanaAtualNumero})?`;
    labelArquivar.textContent = `Arquivar a Semana ${semanaAtualNumero} na pasta do ano e criar a Semana 1 em branco`;
    labelManter.textContent = `Manter os livros atuais (já preparados para o novo ano) e mudar o número para Semana 1`;

    atualizarResumoFinalizarAno();
    document.getElementById("finalizarAnoOverlay").style.display = "flex";
    inputAno.focus();
    inputAno.select();
});

document.getElementById("confirmarFinalizarAno").addEventListener("click", async () => {
    const inputAno = document.getElementById("inputNomeAno");
    const incluirAtual = document.getElementById("modoAnoArquivar").checked;
    const btnConfirmar = document.getElementById("confirmarFinalizarAno");
    const btnCancelar = document.getElementById("cancelarFinalizarAno");
    const msgEl = document.getElementById("finalizarAnoMsg");

    const nomeAno = inputAno.value.trim();

    if (!nomeAno) {
        msgEl.textContent = "Informe o nome do ano para a pasta.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
        return;
    }

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Arquivando...";

    try {
        const semanasSnapshot = await getDocs(collection(db, "semanas"));
        const existingIds = new Set();
        const semanasParaArquivar = [];

        semanasSnapshot.forEach((docSnap) => {
            existingIds.add(docSnap.id);
            if (docSnap.id === "atual" || docSnap.id === "proxima" || docSnap.id === "ultimo_ano") return;
            const dados = docSnap.data();
            if (!dados.ano) {
                semanasParaArquivar.push({
                    id: docSnap.id,
                    dados: dados
                });
            }
        });

        const livrosAtuaisSnap = incluirAtual
            ? await getDocs(query(livrosRef, orderBy("ordem")))
            : null;

        if (semanasParaArquivar.length === 0 && !incluirAtual) {
            msgEl.textContent = "Não há semanas finalizadas na lista para arquivar.";
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        const semanaAtualAntes = semanaAtualNumero || 1;
        const anoSlug = nomeAno.replace(/[^a-zA-Z0-9_-]/g, "_") || "ano";
        let totalArquivadas = 0;
        let semanaAtualArquivadaId = null;

        // 1) Move semanas já finalizadas da lista atual para a pasta do ano
        for (const item of semanasParaArquivar) {
            const numero = item.dados.numero;
            const oldHistoricoId = item.dados.historicoId || item.id;

            let candidateId = `${anoSlug}_semana_${numero}`;
            let suffix = 2;
            while (existingIds.has(candidateId)) {
                candidateId = `${anoSlug}_semana_${numero}_${suffix}`;
                suffix++;
            }
            existingIds.add(candidateId);

            const oldLivrosRef = collection(db, "historico", oldHistoricoId, "livros");
            const oldLivrosSnap = await getDocs(oldLivrosRef);

            for (const livroSnap of oldLivrosSnap.docs) {
                await setDoc(
                    doc(db, "historico", candidateId, "livros", livroSnap.id),
                    livroSnap.data()
                );
            }

            await setDoc(doc(db, "semanas", candidateId), {
                numero: numero,
                dataFim: item.dados.dataFim || "",
                ano: nomeAno,
                historicoId: candidateId
            });

            if (oldHistoricoId !== candidateId) {
                for (const livroSnap of oldLivrosSnap.docs) {
                    await deleteDoc(doc(db, "historico", oldHistoricoId, "livros", livroSnap.id));
                }
            }
            await deleteDoc(doc(db, "semanas", item.id));
            totalArquivadas++;
        }

        // 2) Se escolheu arquivar a semana atual, salva no histórico do ano e cria Semana 1 em branco
        if (incluirAtual) {
            let candidateId = `${anoSlug}_semana_${semanaAtualAntes}`;
            let suffix = 2;
            while (existingIds.has(candidateId)) {
                candidateId = `${anoSlug}_semana_${semanaAtualAntes}_${suffix}`;
                suffix++;
            }
            existingIds.add(candidateId);

            if (livrosAtuaisSnap && !livrosAtuaisSnap.empty) {
                for (const docSnap of livrosAtuaisSnap.docs) {
                    await setDoc(
                        doc(db, "historico", candidateId, "livros", docSnap.id),
                        docSnap.data()
                    );
                }

                for (const docSnap of livrosAtuaisSnap.docs) {
                    await setDoc(doc(db, "livros", docSnap.id), {
                        imagem: "",
                        titulo: "Novo Livro",
                        sinopse: "",
                        ordem: docSnap.data().ordem || 1
                    });
                }
            } else {
                for (let i = 1; i <= 4; i++) {
                    await setDoc(doc(db, "livros", `livro${i}`), {
                        imagem: "",
                        titulo: "Novo Livro",
                        sinopse: "",
                        ordem: i
                    });
                }
            }

            const dataFormatada = new Date().toLocaleDateString("pt-BR");
            await setDoc(doc(db, "semanas", candidateId), {
                numero: semanaAtualAntes,
                dataFim: dataFormatada,
                ano: nomeAno,
                historicoId: candidateId
            });

            semanaAtualArquivadaId = candidateId;
            totalArquivadas++;
        }

        await setDoc(doc(db, "semanas", "ultimo_ano"), {
            ano: nomeAno,
            semanaAtualAnterior: semanaAtualAntes,
            incluiuSemanaAtual: Boolean(semanaAtualArquivadaId),
            semanaAtualArquivadaId: semanaAtualArquivadaId,
            resetouSemana: true,
            arquivadoEm: Date.now()
        });

        semanaAtualNumero = 1;
        await setDoc(doc(db, "semanas", "atual"), {
            numero: 1
        });

        if (proximaConfig && proximaConfig.ativo) {
            proximaConfig.numero = 2;
            await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
        }

        anosAbertos.add(nomeAno);
        visualizandoHistorico = false;
        visualizandoProxima = false;
        semanaVisualizadaId = null;
        semanaVisualizadaObj = null;

        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        msgEl.textContent = `Ano ${nomeAno} finalizado. ${totalArquivadas} ${totalArquivadas === 1 ? "semana arquivada" : "semanas arquivadas"}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        setTimeout(() => {
            window.fecharFinalizarAnoBox();
        }, 1800);
    } catch (erro) {
        console.error("Erro ao finalizar ano:", erro);
        msgEl.textContent = "Erro ao arquivar ano. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Arquivar Ano";
    }
});

// ========================
// DESFAZER FINALIZAÇÃO DO ANO
// ========================

let ultimoAnoCache = null;

function atualizarResumoDesfazerAno() {
    const select = document.getElementById("selectAnoDesfazer");
    const wrapper = document.getElementById("restaurarSemanaAnoWrapper");
    const checkbox = document.getElementById("restaurarSemanaAnoCheck");
    const label = document.getElementById("restaurarSemanaAnoLabel");
    const resumo = document.getElementById("desfazerAnoResumo");

    const anoSelecionado = select.value;
    const semanasDoAno = semanasHistorico.filter(s => s.ano === anoSelecionado);
    const temSemanaAtualIncluida = Boolean(
        ultimoAnoCache &&
        ultimoAnoCache.ano === anoSelecionado &&
        ultimoAnoCache.incluiuSemanaAtual &&
        ultimoAnoCache.semanaAtualArquivadaId
    );

    if (temSemanaAtualIncluida) {
        resumo.textContent = `A Semana ${ultimoAnoCache.semanaAtualAnterior} voltará a ser a semana atual e as demais ${Math.max(0, semanasDoAno.length - 1)} semanas voltarão para a lista principal.`;
    } else {
        resumo.textContent = `${semanasDoAno.length} ${semanasDoAno.length === 1 ? "semana será movida" : "semanas serão movidas"} de volta para a lista principal.`;
    }

    if (ultimoAnoCache && ultimoAnoCache.ano === anoSelecionado && (ultimoAnoCache.resetouSemana || temSemanaAtualIncluida) && ultimoAnoCache.semanaAtualAnterior) {
        wrapper.style.display = "flex";
        checkbox.checked = true;
        checkbox.dataset.numeroDestino = String(ultimoAnoCache.semanaAtualAnterior);
        label.textContent = `Restaurar número da semana atual para Semana ${ultimoAnoCache.semanaAtualAnterior}`;
    } else if (semanasDoAno.length > 0) {
        const maxNumero = Math.max(...semanasDoAno.map(s => Number(s.numero) || 0));
        const sugestao = maxNumero + 1;
        if (sugestao > 1 && semanaAtualNumero !== sugestao) {
            wrapper.style.display = "flex";
            checkbox.checked = false;
            checkbox.dataset.numeroDestino = String(sugestao);
            label.textContent = `Ajustar semana atual para Semana ${sugestao}`;
        } else {
            wrapper.style.display = "none";
            checkbox.checked = false;
        }
    } else {
        wrapper.style.display = "none";
        checkbox.checked = false;
    }
}

document.getElementById("selectAnoDesfazer").addEventListener("change", atualizarResumoDesfazerAno);

document.getElementById("desfazerAnoBtn").addEventListener("click", async () => {
    const anosDisponiveis = Array.from(new Set(
        semanasHistorico.filter(s => Boolean(s.ano)).map(s => s.ano)
    )).sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numB - numA;
        return b.localeCompare(a, "pt-BR");
    });

    if (anosDisponiveis.length === 0) {
        alert("Não há pastas de anos finalizados para desfazer.");
        return;
    }

    try {
        const ultimoSnap = await getDoc(doc(db, "semanas", "ultimo_ano"));
        ultimoAnoCache = ultimoSnap.exists() ? ultimoSnap.data() : null;
    } catch {
        ultimoAnoCache = null;
    }

    const select = document.getElementById("selectAnoDesfazer");
    select.innerHTML = "";

    anosDisponiveis.forEach((ano) => {
        const option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        select.appendChild(option);
    });

    if (ultimoAnoCache && ultimoAnoCache.ano && anosDisponiveis.includes(ultimoAnoCache.ano)) {
        select.value = ultimoAnoCache.ano;
    }

    atualizarResumoDesfazerAno();
    document.getElementById("desfazerAnoMsg").style.display = "none";
    document.getElementById("desfazerAnoOverlay").style.display = "flex";
});

document.getElementById("confirmarDesfazerAno").addEventListener("click", async () => {
    const select = document.getElementById("selectAnoDesfazer");
    const checkbox = document.getElementById("restaurarSemanaAnoCheck");
    const wrapper = document.getElementById("restaurarSemanaAnoWrapper");
    const btnConfirmar = document.getElementById("confirmarDesfazerAno");
    const btnCancelar = document.getElementById("cancelarDesfazerAno");
    const msgEl = document.getElementById("desfazerAnoMsg");

    const anoAlvo = select.value;
    if (!anoAlvo) return;

    btnConfirmar.disabled = true;
    btnCancelar.disabled = true;
    btnConfirmar.textContent = "Restaurando...";

    try {
        const semanasSnapshot = await getDocs(collection(db, "semanas"));
        const existingOpenIds = new Set();
        const semanasDoAno = [];

        semanasSnapshot.forEach((docSnap) => {
            if (docSnap.id === "atual" || docSnap.id === "proxima" || docSnap.id === "ultimo_ano") return;
            const dados = docSnap.data();
            if (!dados.ano) {
                existingOpenIds.add(docSnap.id);
            } else if (String(dados.ano) === anoAlvo) {
                semanasDoAno.push({
                    id: docSnap.id,
                    dados: dados,
                    numero: Number(dados.numero) || 0,
                    historicoId: dados.historicoId || docSnap.id
                });
            }
        });

        if (semanasDoAno.length === 0) {
            msgEl.textContent = "Nenhuma semana encontrada nessa pasta.";
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        semanasDoAno.sort((a, b) => a.numero - b.numero);

        const semanaAtualArquivadaId = (
            ultimoAnoCache &&
            ultimoAnoCache.ano === anoAlvo &&
            ultimoAnoCache.incluiuSemanaAtual &&
            ultimoAnoCache.semanaAtualArquivadaId
        ) ? ultimoAnoCache.semanaAtualArquivadaId : null;

        let restauradasLista = 0;

        for (const item of semanasDoAno) {
            const oldLivrosRef = collection(db, "historico", item.historicoId, "livros");
            const oldLivrosSnap = await getDocs(oldLivrosRef);

            // Se este item era a semana atual antes de finalizar o ano, restaura direto em "livros/"
            if (semanaAtualArquivadaId && item.id === semanaAtualArquivadaId) {
                const atuaisSnap = await getDocs(livrosRef);
                const restauradosIds = new Set(oldLivrosSnap.docs.map(d => d.id));
                for (const atualDoc of atuaisSnap.docs) {
                    if (!restauradosIds.has(atualDoc.id)) {
                        await deleteDoc(doc(db, "livros", atualDoc.id));
                    }
                }
                for (const livroSnap of oldLivrosSnap.docs) {
                    await setDoc(doc(db, "livros", livroSnap.id), livroSnap.data());
                    await deleteDoc(doc(db, "historico", item.historicoId, "livros", livroSnap.id));
                }
                await deleteDoc(doc(db, "semanas", item.id));
                continue;
            }

            let novoId = `semana_${item.numero}`;
            let sufixo = 2;
            while (existingOpenIds.has(novoId)) {
                novoId = `semana_${item.numero}_${sufixo}`;
                sufixo++;
            }
            existingOpenIds.add(novoId);

            for (const livroSnap of oldLivrosSnap.docs) {
                await setDoc(
                    doc(db, "historico", novoId, "livros", livroSnap.id),
                    livroSnap.data()
                );
            }

            const novoRegistro = {
                numero: item.numero,
                dataFim: item.dados.dataFim || ""
            };
            if (novoId !== `semana_${item.numero}`) {
                novoRegistro.historicoId = novoId;
            }

            await setDoc(doc(db, "semanas", novoId), novoRegistro);

            if (item.historicoId !== novoId) {
                for (const livroSnap of oldLivrosSnap.docs) {
                    await deleteDoc(doc(db, "historico", item.historicoId, "livros", livroSnap.id));
                }
            }
            await deleteDoc(doc(db, "semanas", item.id));
            restauradasLista++;
        }

        if (wrapper.style.display !== "none" && checkbox.checked) {
            const numeroRestaurado = parseInt(checkbox.dataset.numeroDestino || "", 10);
            if (!Number.isNaN(numeroRestaurado) && numeroRestaurado >= 1) {
                semanaAtualNumero = numeroRestaurado;
                await setDoc(doc(db, "semanas", "atual"), {
                    numero: numeroRestaurado
                });

                if (proximaConfig && proximaConfig.ativo) {
                    proximaConfig.numero = numeroRestaurado + 1;
                    await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
                }
            }
        }

        if (ultimoAnoCache && ultimoAnoCache.ano === anoAlvo) {
            await deleteDoc(doc(db, "semanas", "ultimo_ano"));
            ultimoAnoCache = null;
        }

        anosAbertos.delete(anoAlvo);
        visualizandoHistorico = false;
        visualizandoProxima = false;
        semanaVisualizadaId = null;
        semanaVisualizadaObj = null;

        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        msgEl.textContent = semanaAtualArquivadaId
            ? `Pasta ${anoAlvo} desfeita. Semana atual e ${restauradasLista} semanas do histórico restauradas.`
            : `Pasta ${anoAlvo} desfeita. ${restauradasLista} ${restauradasLista === 1 ? "semana restaurada" : "semanas restauradas"}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        setTimeout(() => {
            window.fecharDesfazerAnoBox();
        }, 1800);
    } catch (erro) {
        console.error("Erro ao desfazer finalização do ano:", erro);
        msgEl.textContent = "Erro ao desfazer ano. Verifique o console.";
        msgEl.className = "erro";
        msgEl.style.display = "block";
    } finally {
        btnConfirmar.disabled = false;
        btnCancelar.disabled = false;
        btnConfirmar.textContent = "Desfazer Ano";
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
    texto.innerHTML = `Restaurar a <strong>Semana ${escapeHTML(semanaAnterior)}</strong> e voltar de <strong>Semana ${escapeHTML(semanaAtualNumero)}</strong> para <strong>Semana ${escapeHTML(semanaAnterior)}</strong>?`;

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
        const historicoRef = collection(db, "historico", semanaAnteriorId, "livros");
        const historicoSnapshot = await getDocs(historicoRef);

        if (historicoSnapshot.empty) {
            msgEl.textContent = `Histórico da Semana ${semanaAnterior} não encontrado na lista atual.`;
            msgEl.className = "erro";
            msgEl.style.display = "block";
            return;
        }

        const livrosAtualSnapshot = await getDocs(livrosRef);
        for (const docSnap of livrosAtualSnapshot.docs) {
            await deleteDoc(doc(db, "livros", docSnap.id));
        }

        for (const docSnap of historicoSnapshot.docs) {
            await setDoc(doc(db, "livros", docSnap.id), docSnap.data());
        }

        for (const docSnap of historicoSnapshot.docs) {
            await deleteDoc(doc(db, "historico", semanaAnteriorId, "livros", docSnap.id));
        }

        await deleteDoc(doc(db, "semanas", semanaAnteriorId));

        semanaAtualNumero = semanaAnterior;
        await setDoc(doc(db, "semanas", "atual"), {
            numero: semanaAnterior
        });

        if (proximaConfig && proximaConfig.ativo) {
            proximaConfig.numero = semanaAnterior + 1;
            await setDoc(doc(db, "semanas", "proxima"), proximaConfig);
        }

        msgEl.textContent = `Restaurado. Voltamos para a Semana ${semanaAnterior}.`;
        msgEl.className = "sucesso";
        msgEl.style.display = "block";

        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();

        setTimeout(() => {
            window.fecharDesfazerBox();
        }, 2000);
    } catch (erro) {
        console.error("Erro ao desfazer:", erro);
        msgEl.textContent = "Erro ao restaurar. Verifique o console.";
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
        console.error("Erro no login:", erro.code);
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
        if (visualizandoProxima) {
            window.voltarParaAtual();
        }
    } catch (erro) {
        console.error("Erro ao sair:", erro);
    }
});

// ========================
// ESTADO DE AUTENTICAÇÃO
// ========================

onAuthStateChanged(auth, async (user) => {
    const adminPanel = document.getElementById("adminPanel");
    const loginNav = document.getElementById("loginNav");
    const proximaNav = document.getElementById("proximaNav");
    const finalizarNav = document.getElementById("finalizarNav");
    const finalizarAnoNav = document.getElementById("finalizarAnoNav");
    const desfazerNav = document.getElementById("desfazerNav");

    if (user) {
        isAdmin = true;
        adminPanel.style.display = "inline-block";
        loginNav.style.display = "none";
        proximaNav.style.display = "inline-block";
        finalizarNav.style.display = "inline-block";
        finalizarAnoNav.style.display = "inline-block";
        desfazerNav.style.display = "inline-block";
    } else {
        isAdmin = false;
        adminPanel.style.display = "none";
        loginNav.style.display = "inline-block";
        proximaNav.style.display = "none";
        finalizarNav.style.display = "none";
        finalizarAnoNav.style.display = "none";
        desfazerNav.style.display = "none";
    }

    if (!authInicialResolvida) {
        authInicialResolvida = true;
        resolveAuthInicial();
    } else if (isAdmin && inicializacaoConcluida && promocaoPendenteVirtual) {
        // Se o admin acabou de logar quando já havia uma promoção vencida pendente, efetiva no Firestore
        await verificarEAtivarProximaSeVencida();
        await carregarHistorico();
        await carregarLivros();
        atualizarTituloSemana();
        return;
    }

    atualizarControlesAdmin();
});

// ========================
// INICIALIZAÇÃO
// ========================

async function inicializar() {
    await authInicialPromise;
    await carregarSemanaAtual();
    await carregarProximaSemanaConfig();
    await verificarEAtivarProximaSeVencida();
    agendarTimerProxima();
    await carregarHistorico();
    await carregarLivros();
    atualizarTituloSemana();
    inicializacaoConcluida = true;
}

inicializar();

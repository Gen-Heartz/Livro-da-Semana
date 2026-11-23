// ========================
// MODAL DA SINOPSE
// ========================

function abrirModal(elementoClicado) {
    const blocoDoLivro = elementoClicado.closest('.book');
    if (!blocoDoLivro) return;

    const sinopseDiv = blocoDoLivro.querySelector('.sinopse');
    if (!sinopseDiv) return;

    document.getElementById("textoDoModal").innerHTML = sinopseDiv.innerHTML;
    document.getElementById("meuModal").style.display = "flex";
}

function fecharModal() {
    const modal = document.getElementById("meuModal");
    if (modal) modal.style.display = "none";
}

function fecharModalFora(event) {
    if (event.target === document.getElementById("meuModal")) {
        fecharModal();
    }
}

// ========================
// MODAL DE LOGIN
// ========================

function toggleLoginBox() {
    const overlay = document.getElementById("loginOverlay");
    overlay.style.display = "flex";
    document.getElementById("email").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("loginErro").style.display = "none";
    document.getElementById("email").focus();
}

function fecharLoginBox() {
    const overlay = document.getElementById("loginOverlay");
    if (overlay) overlay.style.display = "none";
}

function fecharLoginFora(event) {
    if (event.target === document.getElementById("loginOverlay")) {
        fecharLoginBox();
    }
}

// ========================
// MODAL DE EDIÇÃO + NOTAS
// ========================

function fecharEditBox() {
    const overlay = document.getElementById("editOverlay");
    if (overlay) overlay.style.display = "none";
    const notas = document.getElementById("notasFloat");
    if (notas) notas.style.display = "none";
    const msg = document.getElementById("editMsg");
    if (msg) msg.style.display = "none";
}

function fecharEditFora(event) {
    if (event.target === document.getElementById("editOverlay")) {
        fecharEditBox();
    }
}

// ========================
// MODAL EDITAR NÚMERO DA SEMANA
// ========================

function fecharEditarSemanaBox() {
    const overlay = document.getElementById("editarSemanaOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("editarSemanaMsg");
    if (msg) msg.style.display = "none";
}

function fecharEditarSemanaFora(event) {
    if (event.target === document.getElementById("editarSemanaOverlay")) {
        fecharEditarSemanaBox();
    }
}

// ========================
// MODAL REMOVER SEMANA
// ========================

function fecharRemoverSemanaBox() {
    const overlay = document.getElementById("removerSemanaOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("removerSemanaMsg");
    if (msg) msg.style.display = "none";
}

function fecharRemoverSemanaFora(event) {
    if (event.target === document.getElementById("removerSemanaOverlay")) {
        fecharRemoverSemanaBox();
    }
}

// ========================
// MODAL FINALIZAR SEMANA
// ========================

function fecharFinalizarBox() {
    const overlay = document.getElementById("finalizarOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("finalizarMsg");
    if (msg) msg.style.display = "none";
}

function fecharFinalizarFora(event) {
    if (event.target === document.getElementById("finalizarOverlay")) {
        fecharFinalizarBox();
    }
}

// ========================
// MODAL FINALIZAR ANO
// ========================

function fecharFinalizarAnoBox() {
    const overlay = document.getElementById("finalizarAnoOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("finalizarAnoMsg");
    if (msg) msg.style.display = "none";
}

function fecharFinalizarAnoFora(event) {
    if (event.target === document.getElementById("finalizarAnoOverlay")) {
        fecharFinalizarAnoBox();
    }
}

// ========================
// MODAL DESFAZER SEMANA
// ========================

function fecharDesfazerBox() {
    const overlay = document.getElementById("desfazerOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("desfazerMsg");
    if (msg) msg.style.display = "none";
}

function fecharDesfazerFora(event) {
    if (event.target === document.getElementById("desfazerOverlay")) {
        fecharDesfazerBox();
    }
}

// ========================
// MODAL DESFAZER ANO
// ========================

function fecharDesfazerAnoBox() {
    const overlay = document.getElementById("desfazerAnoOverlay");
    if (overlay) overlay.style.display = "none";
    const msg = document.getElementById("desfazerAnoMsg");
    if (msg) msg.style.display = "none";
}

function fecharDesfazerAnoFora(event) {
    if (event.target === document.getElementById("desfazerAnoOverlay")) {
        fecharDesfazerAnoBox();
    }
}

// ========================
// FECHAR MODAIS COM ESC
// ========================

document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    fecharModal();
    fecharLoginBox();
    fecharEditBox();
    fecharEditarSemanaBox();
    fecharRemoverSemanaBox();
    fecharFinalizarBox();
    fecharFinalizarAnoBox();
    fecharDesfazerBox();
    fecharDesfazerAnoBox();
});

// ========================
// VOLTAR PARA SEMANA ATUAL
// ========================

function voltarParaAtual() {
    window.dispatchEvent(new CustomEvent('voltarAtual'));
}

// ========================
// IMPRIMIR SINOPSES (COM ESCALA AUTOMÁTICA)
// ========================

function aplicarPresetCardPrint(card, cfg) {
    card.style.setProperty("--card-p-size", `${cfg.pSize.toFixed(2)}px`);
    card.style.setProperty("--card-h3-size", `${cfg.h3Size.toFixed(2)}px`);
    card.style.setProperty("--card-h4-size", `${cfg.h4Size.toFixed(2)}px`);
    card.style.setProperty("--card-line-height", cfg.lineHeight.toFixed(3));
    card.style.setProperty("--card-p-margin", `${cfg.pMargin.toFixed(2)}px`);
    card.style.setProperty("--card-h3-margin", `${cfg.h3Margin.toFixed(2)}px`);
    card.style.setProperty("--card-padding", `${cfg.padding.toFixed(2)}px`);
}

function criarCfgEscalaPrint(t) {
    return {
        pSize: 9.5 + t * (15.5 - 9.5),
        h3Size: 11.5 + t * (19 - 11.5),
        h4Size: 9.5 + t * (15.5 - 9.5),
        lineHeight: 1.06 + t * (1.13 - 1.06),
        pMargin: 1.5 + t * (2.5 - 1.5),
        h3Margin: 3.5 + t * (6 - 3.5),
        padding: 4.5 + t * (6 - 4.5)
    };
}

function ajustarEscalaImpressao(areaPrint, container) {
    const cards = Array.from(container.querySelectorAll(".print-livro"));
    if (cards.length === 0) return;

    const sonda = document.createElement("div");
    sonda.style.position = "fixed";
    sonda.style.left = "-99999px";
    sonda.style.top = "0";
    sonda.style.width = "287mm";
    sonda.style.height = "192mm";
    sonda.style.visibility = "hidden";
    document.body.appendChild(sonda);

    const maxW = sonda.offsetWidth;
    const maxH = sonda.offsetHeight;
    document.body.removeChild(sonda);

    if (!maxW || !maxH) return;

    const totalRows = Math.ceil(cards.length / 4);
    const gapPx = totalRows > 1 ? 8 : 10;
    const maxHPerRow = totalRows === 1
        ? maxH
        : Math.floor((maxH - (totalRows - 1) * gapPx) / totalRows);

    areaPrint.classList.add("print-medindo");
    areaPrint.style.width = `${maxW}px`;
    container.style.setProperty("--print-gap", `${gapPx}px`);
    container.style.alignItems = "start";

    const cfgPadrao = {
        pSize: 16,
        h3Size: 20,
        h4Size: 16,
        lineHeight: 1.16,
        pMargin: 3.5,
        h3Margin: 8,
        padding: 8
    };

    const cfgCompacta = {
        pSize: 15.5,
        h3Size: 19,
        h4Size: 15.5,
        lineHeight: 1.12,
        pMargin: 2.5,
        h3Margin: 6,
        padding: 6
    };

    cards.forEach((card) => {
        aplicarPresetCardPrint(card, cfgPadrao);
        if (card.getBoundingClientRect().height <= maxHPerRow) {
            return;
        }

        aplicarPresetCardPrint(card, cfgCompacta);
        if (card.getBoundingClientRect().height <= maxHPerRow) {
            return;
        }

        // Busca binária para encontrar a maior escala legível (>= 9.5px) que cabe na altura da folha
        let baixo = 0;
        let alto = 1;
        let melhor = 0;

        for (let i = 0; i < 12; i++) {
            const meio = (baixo + alto) / 2;
            aplicarPresetCardPrint(card, criarCfgEscalaPrint(meio));
            if (card.getBoundingClientRect().height <= maxHPerRow) {
                melhor = meio;
                baixo = meio;
            } else {
                alto = meio;
            }
        }

        aplicarPresetCardPrint(card, criarCfgEscalaPrint(melhor));
    });

    container.style.alignItems = "";
    areaPrint.classList.remove("print-medindo");
    areaPrint.style.width = "";
}

function imprimirSinopses() {
    const areaPrint = document.getElementById("areaPrint");
    const container = document.getElementById("printContent");
    const livros = document.querySelectorAll(".book");

    container.innerHTML = "";

    if (livros.length === 0) {
        alert("Nenhum livro para imprimir.");
        return;
    }

    livros.forEach((livro) => {
        const titulo = livro.querySelector("h5").textContent;
        const sinopseDiv = livro.querySelector(".sinopse");

        let sinopseHTML = "";
        if (sinopseDiv) {
            const clone = sinopseDiv.cloneNode(true);
            const h3 = clone.querySelector("h3");
            if (h3) h3.remove();
            sinopseHTML = clone.innerHTML;
        }

        const livroDiv = document.createElement("div");
        livroDiv.classList.add("print-livro");
        livroDiv.innerHTML = `
            <h3>${titulo}</h3>
            ${sinopseHTML || "<p><em>Sinopse não disponível.</em></p>"}
        `;

        container.appendChild(livroDiv);
    });

    ajustarEscalaImpressao(areaPrint, container);

    setTimeout(() => {
        window.print();
    }, 100);
}

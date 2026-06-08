// ========================
// MODAL DA SINOPSE
// ========================

function abrirModal(elementoClicado) {
    const blocoDoLivro = elementoClicado.closest('.book');
    const sinopseDiv = blocoDoLivro.querySelector('.sinopse');
    if (!sinopseDiv) return;

    document.getElementById("textoDoModal").innerHTML = sinopseDiv.innerHTML;
    document.getElementById("meuModal").style.display = "flex";
}

function fecharModal() {
    document.getElementById("meuModal").style.display = "none";
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
}

function fecharLoginBox() {
    document.getElementById("loginOverlay").style.display = "none";
}

function fecharLoginFora(event) {
    if (event.target === document.getElementById("loginOverlay")) {
        fecharLoginBox();
    }
}

// ========================
// MODAL DE EDIÇÃO
// ========================

function fecharEditBox() {
    document.getElementById("editOverlay").style.display = "none";
    document.getElementById("editMsg").style.display = "none";
}

function fecharEditFora(event) {
    if (event.target === document.getElementById("editOverlay")) {
        fecharEditBox();
    }
}

// ========================
// MODAL DE EDIÇÃO
// ========================

function fecharEditBox() {
    document.getElementById("editOverlay").style.display = "none";
    document.getElementById("editMsg").style.display = "none";
    // Esconde o painel de notas junto
    document.getElementById("notasFloat").style.display = "none";
}

function fecharEditFora(event) {
    if (event.target === document.getElementById("editOverlay")) {
        fecharEditBox();
    }
}

// ========================
// MODAL FINALIZAR SEMANA
// ========================

function fecharFinalizarBox() {
    document.getElementById("finalizarOverlay").style.display = "none";
    document.getElementById("finalizarMsg").style.display = "none";
}

function fecharFinalizarFora(event) {
    if (event.target === document.getElementById("finalizarOverlay")) {
        fecharFinalizarBox();
    }
}

// ========================
// MODAL DESFAZER
// ========================

function fecharDesfazerBox() {
    document.getElementById("desfazerOverlay").style.display = "none";
    document.getElementById("desfazerMsg").style.display = "none";
}

function fecharDesfazerFora(event) {
    if (event.target === document.getElementById("desfazerOverlay")) {
        fecharDesfazerBox();
    }
}

// ========================
// VOLTAR PARA ATUAL
// ========================

// Essa função é definida aqui mas será sobrescrita pelo script.js
// para ter acesso ao carregarLivros()
function voltarParaAtual() {
    // será sobrescrita em script.js
}

// ========================
// IMPRIMIR SINOPSES
// ========================

function imprimirSinopses() {
    const container = document.getElementById("printContent");
    const livros = document.querySelectorAll(".book");

    // Limpa o conteúdo anterior
    container.innerHTML = "";

    // Verifica se há livros
    if (livros.length === 0) {
        alert("Nenhum livro para imprimir!");
        return;
    }

    // Percorre cada livro e cria o HTML de impressão
    livros.forEach((livro) => {
        const titulo = livro.querySelector("h5").textContent;
        const sinopseDiv = livro.querySelector(".sinopse");

        // Pega apenas os parágrafos da sinopse (sem o h3)
        let sinopseHTML = "";
        if (sinopseDiv) {
            const paragrafos = sinopseDiv.querySelectorAll("p");
            paragrafos.forEach((p) => {
                sinopseHTML += `<p>${p.textContent}</p>`;
            });
        }

        // Cria o bloco do livro para impressão
        const livroDiv = document.createElement("div");
        livroDiv.classList.add("print-livro");
        livroDiv.innerHTML = `
            <h3>${titulo}</h3>
            ${sinopseHTML || "<p><em>Sinopse não disponível.</em></p>"}
        `;

        container.appendChild(livroDiv);
    });

    // Aguarda o DOM atualizar e depois imprime
    setTimeout(() => {
        window.print();
    }, 100);
}
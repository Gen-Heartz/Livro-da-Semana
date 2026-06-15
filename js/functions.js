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

function imprimirSinopses() {
    const container = document.getElementById("printContent");
    const livros = document.querySelectorAll(".book");

    container.innerHTML = "";

    if (livros.length === 0) {
        alert("Nenhum livro para imprimir!");
        return;
    }

    livros.forEach((livro) => {
        const titulo = livro.querySelector("h5").textContent;
        const sinopseDiv = livro.querySelector(".sinopse");

        // Pega TODO o HTML interno da sinopse, mantendo formatação
        let sinopseHTML = "";
        if (sinopseDiv) {
            // Clona para não modificar o original
            const clone = sinopseDiv.cloneNode(true);

            // Remove o h3 do clone (já vamos usar o título separado)
            const h3 = clone.querySelector("h3");
            if (h3) h3.remove();

            // Pega o HTML com todas as tags de formatação
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

    setTimeout(() => {
        window.print();
    }, 100);
}
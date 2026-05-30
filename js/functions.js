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
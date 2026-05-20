function abrirModal(elementoClicado) {
    // 1. Encontra a div do livro onde a imagem foi clicada
    const blocoDoLivro = elementoClicado.closest('.book');
    
    // 2. Pega o conteúdo de texto que está escondido dentro desse livro
    const textoEscondido = blocoDoLivro.querySelector('.sinopse').innerHTML;
    
    // 3. Joga esse texto para dentro da caixinha do modal
    document.getElementById("textoDoModal").innerHTML = textoEscondido;
    
    // 4. Mostra o pop-up na tela
    document.getElementById("meuModal").style.display = "flex";
}

function fecharModal() {
    // Esconde o pop-up
    document.getElementById("meuModal").style.display = "none";
}
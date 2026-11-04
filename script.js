/* ===========================================================
   Estados do Brasil — o JavaScript
   1. Busca   2. Dados   3. Tela   4. Eventos
   =========================================================== */

/* ---------- 1. Busca ---------- */
const URL_ESTADOS = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

async function buscaEstados() {
    let resposta;
    try {
        resposta = await fetch(URL_ESTADOS);
    } catch (erro) {
        throw new Error('Não foi possível buscar os estados. Verifique sua conexão com a internet.');
    }
    if (!resposta.ok) {
        throw new Error('Não foi possível buscar os estados. O servidor retornou um erro.');
    }
    return resposta.json();
}

function montarUrlDosMunicipios(sigla) {
    return `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/municipios`;
}

async function contarMunicipios(sigla) {
    let resposta;
    try {
        resposta = await fetch(montarUrlDosMunicipios(sigla));
    } catch (erro) {
        throw new Error('Não foi possível falar com o IBGE. Tente de novo.');
    }
    if (!resposta.ok) {
        throw new Error('Não foi possível falar com o IBGE. Tente de novo.');
    }
    const municipios = await resposta.json();
    return municipios.length;
}

/* ---------- 2. Dados ---------- */
let estados = [];
let regiaoEscolhida = '';
let soFavoritos = false;
const municipiosJaBuscados = {};   // sigla -> quantidade (não busca de novo)
const CHAVE_FAVORITOS = 'estados-favoritos';

function simplificarTexto(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filtrarPorNome(lista, texto) {
    const procurado = simplificarTexto(texto);
    return lista.filter(estado => simplificarTexto(estado.nome).includes(procurado));
}

function filtrarPorRegiao(lista, regiao) {
    if (regiao === '') return lista;
    return lista.filter(estado => estado.regiao.nome === regiao);
}

function filtrarPorFavoritos(lista, ligado) {
    if (!ligado) return lista;
    const favoritos = lerFavoritos();
    return lista.filter(estado => favoritos.includes(estado.sigla));
}

function ordenar(lista, ordem) {
    return lista.toSorted((a, b) => {
        if (ordem === 'nome-invertido') {
            return b.nome.localeCompare(a.nome, 'pt-BR');
        }
        if (ordem === 'regiao') {
            const porRegiao = a.regiao.nome.localeCompare(b.regiao.nome, 'pt-BR');
            if (porRegiao !== 0) return porRegiao;   // regiões diferentes
        }
        return a.nome.localeCompare(b.nome, 'pt-BR'); // desempate / A–Z
    });
}

function contarPorRegiao(lista, regiao) {
    return filtrarPorRegiao(lista, regiao).length;
}

function lerFavoritos() {
    const salvo = localStorage.getItem(CHAVE_FAVORITOS);
    return salvo === null ? [] : JSON.parse(salvo);
}

function alternarFavorito(sigla) {
    const favoritos = lerFavoritos();
    const novos = favoritos.includes(sigla)
        ? favoritos.filter(s => s !== sigla)
        : [...favoritos, sigla];
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(novos));
}

/* ---------- 3. Tela ---------- */
const formulario = document.querySelector('form');
const campoBusca = document.querySelector('.campo-busca');
const campoOrdem = document.querySelector('.campo-ordem');
const listaDeEstados = document.querySelector('.lista-de-estados');
const telaStatus = document.querySelector('.status');
const botaoFavoritos = document.querySelector('.botao-favoritos');
const botoesRegiao = document.querySelectorAll('.botao-regiao');

function mostrarCarregando() {
    telaStatus.textContent = 'Carregando os estados...';
    telaStatus.classList.remove('erro');
    listaDeEstados.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const esqueleto = document.createElement('li');
        esqueleto.classList.add('estado', 'esqueleto');
        listaDeEstados.appendChild(esqueleto);
    }
}

function mostrarErro(mensagem) {
    listaDeEstados.innerHTML = '';
    telaStatus.textContent = mensagem;
    telaStatus.classList.add('erro');
}

function mostrarContagem(quantidade) {
    telaStatus.classList.remove('erro');
    if (quantidade === 0) {
        telaStatus.textContent = 'Nenhum estado encontrado.';
    } else if (quantidade === 1) {
        telaStatus.textContent = '1 estado encontrado.';
    } else {
        telaStatus.textContent = `${quantidade} estados encontrados.`;
    }
}

function criarCard(estado) {
    const card = document.createElement('li');
    card.classList.add('estado');
    card.dataset.regiao = estado.regiao.nome;

    const sigla = document.createElement('p');
    sigla.classList.add('estado-sigla');
    sigla.textContent = estado.sigla;

    const nome = document.createElement('h2');
    nome.classList.add('estado-nome');
    nome.textContent = estado.nome;

    const regiao = document.createElement('p');
    regiao.classList.add('estado-regiao');
    regiao.textContent = estado.regiao.nome;

    const municipios = document.createElement('p');
    municipios.classList.add('estado-municipios');
    if (municipiosJaBuscados[estado.sigla] !== undefined) {
        municipios.textContent = `${municipiosJaBuscados[estado.sigla]} municípios`;
    }

    const acoes = document.createElement('div');
    acoes.classList.add('estado-acoes');

    const botaoMunicipios = document.createElement('button');
    botaoMunicipios.type = 'button';
    botaoMunicipios.classList.add('botao-municipios');
    botaoMunicipios.textContent = 'Quantos municípios?';

    const botaoFavorito = document.createElement('button');
    botaoFavorito.type = 'button';
    botaoFavorito.classList.add('botao-favorito');
    botaoFavorito.setAttribute('aria-label', `Favoritar ${estado.nome}`);
    const ehFavorito = lerFavoritos().includes(estado.sigla);
    botaoFavorito.textContent = ehFavorito ? '★' : '☆';
    botaoFavorito.classList.toggle('favorito', ehFavorito);

    botaoMunicipios.addEventListener('click', async () => {
        municipios.classList.remove('erro');
        municipios.textContent = 'Buscando...';
        botaoMunicipios.disabled = true;
        try {
            const quantidade = await contarMunicipios(estado.sigla);
            municipiosJaBuscados[estado.sigla] = quantidade;
            municipios.textContent = `${quantidade} municípios`;
        } catch (erro) {
            municipios.classList.add('erro');
            municipios.textContent = erro.message;
        }
        botaoMunicipios.disabled = false;
    });

    botaoFavorito.addEventListener('click', () => {
        alternarFavorito(estado.sigla);
        atualizarTela();
    });

    acoes.appendChild(botaoMunicipios);
    acoes.appendChild(botaoFavorito);
    card.append(sigla, nome, regiao, municipios, acoes);
    return card;
}

function renderizarEstados(lista) {
    listaDeEstados.innerHTML = '';
    lista.forEach(estado => listaDeEstados.appendChild(criarCard(estado)));
}

function atualizarBotoesRegiao(listaParaContar) {
    botoesRegiao.forEach(botao => {
        const regiao = botao.dataset.regiao;
        botao.classList.toggle('ativo', regiao === regiaoEscolhida);
        botao.querySelector('.quantidade').textContent =
            `(${contarPorRegiao(listaParaContar, regiao)})`;
    });
}

function atualizarTela() {
    // a contagem dos botões ignora a região escolhida
    const base = filtrarPorFavoritos(filtrarPorNome(estados, campoBusca.value), soFavoritos);
    const exibidos = ordenar(filtrarPorRegiao(base, regiaoEscolhida), campoOrdem.value);
    renderizarEstados(exibidos);
    mostrarContagem(exibidos.length);
    atualizarBotoesRegiao(base);
    botaoFavoritos.classList.toggle('ativo', soFavoritos);
}

async function carregarEstados() {
    mostrarCarregando();
    try {
        estados = await buscaEstados();
        atualizarTela();
        telaStatus.textContent = `Chegaram ${estados.length} estados.`;
    } catch (erro) {
        mostrarErro(erro.message);
    }
}

/* ---------- 4. Eventos ---------- */
campoBusca.addEventListener('input', atualizarTela);
campoOrdem.addEventListener('change', atualizarTela);

formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
});

botoesRegiao.forEach(botao => {
    botao.addEventListener('click', () => {
        regiaoEscolhida = botao.dataset.regiao;
        atualizarTela();
    });
});

botaoFavoritos.addEventListener('click', () => {
    soFavoritos = !soFavoritos;
    atualizarTela();
});

carregarEstados();
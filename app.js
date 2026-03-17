// --- 1. BASE DE DATOS LOCAL ---
const baseDatosItems = [
    { id: 'arm_cuero', nombre: 'Armadura de Cuero', tipo: 'armadura', bonus: { defensa: 2 } },
    { id: 'arm_malla', nombre: 'Cota de Malla', tipo: 'armadura', bonus: { defensa: 5, velocidad: -1 } },
    { id: 'arm_placas', nombre: 'Armadura de Placas', tipo: 'armadura', bonus: { defensa: 8, velocidad: -3, destreza: -1 } },
    
    { id: 'wpn_daga', nombre: 'Daga Rápida', tipo: 'arma', bonus: { ataque: 1, velocidad: 1 } },
    { id: 'wpn_espada_corta', nombre: 'Espada Corta', tipo: 'arma', bonus: { ataque: 3 } },
    { id: 'wpn_espada_larga', nombre: 'Espada Larga', tipo: 'arma', bonus: { ataque: 5, destreza: -1 } },
    { id: 'wpn_baculo_roble', nombre: 'Báculo de Roble', tipo: 'arma', bonus: { ataque_magico: 4, inteligencia: 2 } },
    
    { id: 'shd_madera', nombre: 'Escudo de Madera', tipo: 'escudo', bonus: { defensa: 2 } },
    { id: 'shd_hierro', nombre: 'Escudo de Hierro', tipo: 'escudo', bonus: { defensa: 4, velocidad: -1 } }
];

// --- 2. VARIABLES GLOBALES ---
let modoJuego = false;
let puntosInicialesDisp = 15;
let nivelPersonaje = 1;
let puntosMejoraDisp = 0;
let hpActual = 20, hpMax = 20, manaActual = 20, manaMax = 20;

const stats = [
    { id: 'vitalidad', nombre: 'VITALIDAD', base: 20, ptsIniciales: 0, mult: 5, ptsMejora: 0, bonusEq: 0 },
    { id: 'velocidad', nombre: 'VELOCIDAD', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'ataque', nombre: 'ATAQUE', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'defensa', nombre: 'DEFENSA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'ataque_magico', nombre: 'ATAQ. MÁG.', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'defensa_magica', nombre: 'DEF. MÁG.', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'inteligencia', nombre: 'INTELIGENCIA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 },
    { id: 'destreza', nombre: 'DESTREZA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0 }
];

// --- 3. FUNCIONES DE EQUIPAMIENTO ---
function poblarSelectores() {
    const selArmadura = document.getElementById('eq-armadura');
    const selMano1 = document.getElementById('eq-mano1');
    const selMano2 = document.getElementById('eq-mano2');

    baseDatosItems.forEach(item => {
        const option = `<option value="${item.id}">${item.nombre}</option>`;
        if (item.tipo === 'armadura') selArmadura.innerHTML += option;
        else if (item.tipo === 'arma' || item.tipo === 'escudo') {
            selMano1.innerHTML += option;
            selMano2.innerHTML += option;
        }
    });
}

function actualizarEquipamiento() {
    stats.forEach(s => s.bonusEq = 0); // Resetear bonus

    const idsEquipados = [
        document.getElementById('eq-armadura').value,
        document.getElementById('eq-mano1').value,
        document.getElementById('eq-mano2').value
    ];

    idsEquipados.forEach(id => {
        if (id) {
            const item = baseDatosItems.find(i => i.id === id);
            if (item && item.bonus) {
                for (const [statId, valor] of Object.entries(item.bonus)) {
                    const statObj = stats.find(s => s.id === statId);
                    if (statObj) statObj.bonusEq += valor;
                }
            }
        }
    });
    renderizarTabla();
}

// --- 4. FUNCIONES DE STATS Y RENDERIZADO ---
function calcularNivelFinal(stat) {
    let nivelBase = stat.id === 'vitalidad' 
        ? stat.base + ((nivelPersonaje - 1) * stat.mult)
        : (stat.base + stat.ptsIniciales) + (stat.mult * stat.ptsMejora);
    
    return { puro: nivelBase, total: nivelBase + stat.bonusEq };
}

function recalcularMultiplicadores() {
    stats.forEach(stat => {
        if (stat.id !== 'vitalidad') {
            let nivelBaseYAsignado = stat.base + stat.ptsIniciales;
            if (nivelBaseYAsignado <= 2) stat.mult = 1;
            else if (nivelBaseYAsignado === 3) stat.mult = 2;
            else if (nivelBaseYAsignado <= 5) stat.mult = 3;
            else stat.mult = 4;
        }
    });
}

function renderizarTabla() {
    const tbody = document.getElementById('tabla-stats');
    tbody.innerHTML = '';

    if (!modoJuego) recalcularMultiplicadores();

    stats.forEach((stat, index) => {
        const nivel = calcularNivelFinal(stat);
        
        let textoNivel = `${nivel.puro}`;
        if (stat.bonusEq > 0) textoNivel += ` <span class="text-blue">(+${stat.bonusEq})</span>`;
        else if (stat.bonusEq < 0) textoNivel += ` <span style="color:#e74c3c;">(${stat.bonusEq})</span>`;
        
        let columnaInteractiva = '';
        if (stat.id === 'vitalidad') {
            columnaInteractiva = `<td><span class="text-muted">Auto</span></td>`;
        } else if (!modoJuego) {
            columnaInteractiva = `
                <td>
                    <button class="btn btn-blue btn-small" onclick="modificarPuntoInicial(${index}, -1)">-</button>
                    <span style="display:inline-block; width:20px; font-weight:bold;">${stat.ptsIniciales}</span>
                    <button class="btn btn-blue btn-small" onclick="modificarPuntoInicial(${index}, 1)" ${puntosInicialesDisp === 0 ? 'disabled' : ''}>+</button>
                </td>`;
        } else {
            columnaInteractiva = `
                <td>
                    <button class="btn btn-green btn-small" onclick="gastarPuntoMejora(${index})" ${puntosMejoraDisp === 0 ? 'disabled' : ''}>+ Mejorar</button>
                    <span style="font-size: 12px; color: #7f8c8d; display: block; margin-top: 3px;">Gastados: ${stat.ptsMejora}</span>
                </td>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${stat.nombre}</strong></td>
                <td style="font-size: 18px; font-weight: bold;">${textoNivel}</td>
                ${columnaInteractiva}
                <td style="color: #8e44ad; font-weight: bold;">+${stat.mult}</td>
            </tr>`;
    });

    document.getElementById('puntos-iniciales').innerText = puntosInicialesDisp;
    document.getElementById('btn-comenzar').disabled = puntosInicialesDisp > 0;
    document.getElementById('nivel-general').innerText = nivelPersonaje;
    document.getElementById('puntos-mejora').innerText = puntosMejoraDisp;

    const vitalidadNivel = calcularNivelFinal(stats[0]);
    const nuevoMax = vitalidadNivel.total;
    
    if (hpMax !== nuevoMax) {
        const dif = nuevoMax - hpMax;
        hpMax = nuevoMax;
        manaMax = nuevoMax;
        hpActual += dif; 
        manaActual += dif;
    }
    actualizarVisualesBarras();
}

// --- 5. BARRAS DE ESTADO Y BOTONES ---
function modificarBarra(tipo, multiplicadorOperacion) {
    const inputElem = document.getElementById(`${tipo}-input`);
    const valor = parseInt(inputElem.value) || 0;
    if(valor === 0) return;

    if (tipo === 'hp') {
        hpActual += (valor * multiplicadorOperacion);
        if (hpActual < 0) hpActual = 0;
        if (hpActual > hpMax) hpActual = hpMax;
    } else if (tipo === 'mana') {
        manaActual += (valor * multiplicadorOperacion);
        if (manaActual < 0) manaActual = 0;
        if (manaActual > manaMax) manaActual = manaMax;
    }
    inputElem.value = 1;
    actualizarVisualesBarras();
    if(hpActual === 0) setTimeout(() => alert("¡TUS PUNTOS DE VIDA SON 0! Tira los dados del destino."), 600);
}

function actualizarVisualesBarras() {
    const hpPorcentaje = (hpActual / hpMax) * 100;
    const hpBar = document.getElementById('hp-bar');
    const hpTextDisplay = document.getElementById('hp-text-display');
    hpBar.style.width = `${hpPorcentaje}%`;
    hpTextDisplay.innerText = `${hpActual} / ${hpMax}`;
    
    if (hpPorcentaje <= 30) { hpBar.classList.add('low'); hpTextDisplay.classList.add('low'); } 
    else { hpBar.classList.remove('low'); hpTextDisplay.classList.remove('low'); }

    const manaPorcentaje = (manaActual / manaMax) * 100;
    document.getElementById('mana-bar').style.width = `${manaPorcentaje}%`;
    document.getElementById('mana-text-display').innerText = `${manaActual} / ${manaMax}`;
}

function modificarPuntoInicial(index, valor) {
    if (valor === -1 && stats[index].ptsIniciales > 0) { stats[index].ptsIniciales -= 1; puntosInicialesDisp += 1; } 
    else if (valor === 1 && puntosInicialesDisp > 0) { stats[index].ptsIniciales += 1; puntosInicialesDisp -= 1; }
    renderizarTabla();
}

function iniciarPartida() {
    modoJuego = true;
    document.getElementById('fase-creacion').classList.add('hidden');
    document.getElementById('fase-juego').classList.remove('hidden');
    document.getElementById('col-asignar').classList.add('hidden');
    document.getElementById('col-mejora').classList.remove('hidden');
    
    const vitalidadNivel = calcularNivelFinal(stats[0]);
    hpMax = vitalidadNivel.total;
    manaMax = vitalidadNivel.total;
    hpActual = hpMax;
    manaActual = manaMax;
    
    renderizarTabla();
}

function subirNivelGeneral() {
    nivelPersonaje++; puntosMejoraDisp++;
    renderizarTabla();
}

function gastarPuntoMejora(index) {
    if (puntosMejoraDisp > 0 && stats[index].id !== 'vitalidad') {
        stats[index].ptsMejora++; puntosMejoraDisp--;
        renderizarTabla();
    }
}

// Inicializar
poblarSelectores();
renderizarTabla();
// --- 1. CONFIGURACIÓN DE SUPABASE ---
// Reemplaza estas comillas con las credenciales de tu proyecto Supabase
const SUPABASE_URL = 'https://pnbtlgocsylapwuwqnwj.supabase.co'; 
const SUPABASE_ANON_KEY = 'TUsb_publishable_u4MzN0dIb0a9LfkJG68rKg_ZMr63uXn';

let supabase = null;
if (SUPABASE_URL !== 'TU_SUPABASE_URL_AQUI') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Base de datos que se llenará con Supabase (o usa estos de respaldo si falla)
let baseDatosItems = [
    { id: 'arm_cuero', nombre: 'Armadura de Cuero', tipo: 'armadura', bonus: { defensa: 2 } },
    { id: 'arm_malla', nombre: 'Cota de Malla', tipo: 'armadura', bonus: { defensa: 5, velocidad: -1 } },
    { id: 'wpn_espada_larga', nombre: 'Espada Larga', tipo: 'arma', bonus: { ataque: 5, destreza: -1 } },
    { id: 'shd_hierro', nombre: 'Escudo de Hierro', tipo: 'escudo', bonus: { defensa: 4, velocidad: -1 } },
    { id: 'obj_pocion', nombre: 'Poción de Curación', tipo: 'objeto', bonus: null },
    { id: 'obj_cuerda', nombre: 'Cuerda (10m)', tipo: 'objeto', bonus: null }
];

// Al cargar la página, intentamos traer los items de Supabase
async function cargarItemsDesdeSupabase() {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('items').select('*');
            if (error) throw error;
            if (data && data.length > 0) {
                baseDatosItems = data; // Reemplazamos el local con la nube
                console.log("Items cargados desde Supabase:", baseDatosItems);
            }
        } catch (error) {
            console.error("Error conectando a Supabase, usando items locales:", error);
        }
    }
}

// --- 2. VARIABLES GLOBALES DE STATS ---
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

// --- 3. SISTEMA DE AUTOCOMPLETADO INTELIGENTE ---
function activarAutocompletado(inputId, tiposPermitidos, afectaStats) {
    const inp = document.getElementById(inputId);
    
    // Al escribir en el input
    inp.addEventListener("input", function(e) {
        let val = this.value;
        cerrarListas(); // Cierra sugerencias anteriores
        if (!val) {
            // Si el usuario borra el texto, desequipamos el item
            this.dataset.itemId = "";
            if(afectaStats) actualizarEquipamiento();
            return false;
        }

        let listaDiv = document.createElement("DIV");
        listaDiv.setAttribute("id", this.id + "autocomplete-list");
        listaDiv.setAttribute("class", "autocomplete-items");
        this.parentNode.appendChild(listaDiv);

        // Filtrar items según lo que escribió y si es armadura/arma/mochila
        let coincidencias = baseDatosItems.filter(item => 
            (tiposPermitidos.includes('todos') || tiposPermitidos.includes(item.tipo)) &&
            item.nombre.toLowerCase().includes(val.toLowerCase())
        );

        coincidencias.forEach(item => {
            let itemDiv = document.createElement("DIV");
            // Resaltar la coincidencia
            let index = item.nombre.toLowerCase().indexOf(val.toLowerCase());
            itemDiv.innerHTML = item.nombre.substring(0, index);
            itemDiv.innerHTML += "<strong>" + item.nombre.substring(index, index + val.length) + "</strong>";
            itemDiv.innerHTML += item.nombre.substring(index + val.length);
            
            // Al hacer clic en la sugerencia
            itemDiv.addEventListener("click", function(e) {
                inp.value = item.nombre;        // Muestra el nombre
                inp.dataset.itemId = item.id;   // Guarda el ID oculto
                cerrarListas();
                
                // SOLO actualizar stats si es un campo que afecta (Pecho, Manos)
                if(afectaStats) actualizarEquipamiento();
            });
            listaDiv.appendChild(itemDiv);
        });
    });

    // Cerrar si se hace clic fuera
    document.addEventListener("click", function (e) { cerrarListas(e.target); });
    function cerrarListas(elmnt) {
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
}

// Inicializar todos los inputs
function inicializarInventario() {
    // Equipamiento (SÍ afecta stats)
    activarAutocompletado("eq-armadura", ["armadura"], true);
    activarAutocompletado("eq-mano1", ["arma", "escudo"], true);
    activarAutocompletado("eq-mano2", ["arma", "escudo"], true);
    
    // Mochila (NO afecta stats)
    for(let i=1; i<=5; i++) {
        activarAutocompletado(`inv-${i}`, ["todos"], false);
    }
}

// --- 4. CÁLCULO DE EQUIPAMIENTO ACTIVO ---
function actualizarEquipamiento() {
    stats.forEach(s => s.bonusEq = 0); // Resetear a 0

    // Solo leemos los IDs de los inputs que sí afectan stats
    const inputsActivos = [
        document.getElementById('eq-armadura'),
        document.getElementById('eq-mano1'),
        document.getElementById('eq-mano2')
    ];

    inputsActivos.forEach(input => {
        let itemId = input.dataset.itemId;
        if (itemId) {
            const item = baseDatosItems.find(i => i.id === itemId);
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

// --- 5. LOGICA DE STATS Y RENDERIZADO ---
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
        hpActual += dif; manaActual += dif;
    }
    actualizarVisualesBarras();
}

// Funciones de Barras y Controles se mantienen
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
    document.getElementById('hp-bar').style.width = `${hpPorcentaje}%`;
    document.getElementById('hp-text-display').innerText = `${hpActual} / ${hpMax}`;
    if (hpPorcentaje <= 30) { document.getElementById('hp-bar').classList.add('low'); document.getElementById('hp-text-display').classList.add('low'); } 
    else { document.getElementById('hp-bar').classList.remove('low'); document.getElementById('hp-text-display').classList.remove('low'); }

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
    hpMax = vitalidadNivel.total; manaMax = vitalidadNivel.total;
    hpActual = hpMax; manaActual = manaMax;
    renderizarTabla();
}

function subirNivelGeneral() { nivelPersonaje++; puntosMejoraDisp++; renderizarTabla(); }
function gastarPuntoMejora(index) {
    if (puntosMejoraDisp > 0 && stats[index].id !== 'vitalidad') { stats[index].ptsMejora++; puntosMejoraDisp--; renderizarTabla(); }
}

// Inicialización asíncrona para cargar datos primero
async function iniciarApp() {
    await cargarItemsDesdeSupabase();
    inicializarInventario();
    renderizarTabla();
}

iniciarApp();
// =========================================
// BASE DE DATOS Y ESTADO GLOBAL
// =========================================
let baseDatosItems = [
    { id: 'arm_cuero', nombre: 'Armadura de Cuero', tipo: 'armadura', bonus: { defensa: 2 } },
    { id: 'arm_malla', nombre: 'Cota de Malla', tipo: 'armadura', bonus: { defensa: 5, velocidad: -1 } },
    { id: 'wpn_espada_larga', nombre: 'Espada Larga', tipo: 'arma', bonus: { ataque: 5, destreza: -1 } },
    { id: 'shd_hierro', nombre: 'Escudo de Hierro', tipo: 'escudo', bonus: { defensa: 4, velocidad: -1 } },
    { id: 'obj_pocion', nombre: 'Poción de Curación', tipo: 'objeto', bonus: null }
];

let idPersonajeActual = null;
let historiaIdActual = null; // NUEVO: Para saber a qué historia pertenece el personaje
let modoJuego = false;
let puntosInicialesDisp = 15;
let nivelPersonaje = 1;
let puntosMejoraDisp = 0;
let hpActual = 20, hpMax = 20, manaActual = 20, manaMax = 20;

let stats = [];
let efectosPersonaje = [];

function inicializarStatsBase() {
    stats = [
        { id: 'vitalidad', nombre: 'VITALIDAD', base: 20, ptsIniciales: 0, mult: 5, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'velocidad', nombre: 'VELOCIDAD', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'ataque', nombre: 'ATAQUE', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'defensa', nombre: 'DEFENSA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'ataque_magico', nombre: 'ATAQ. MÁG.', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'defensa_magica', nombre: 'DEF. MÁG.', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'inteligencia', nombre: 'INTELIGENCIA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 },
        { id: 'destreza', nombre: 'DESTREZA', base: 1, ptsIniciales: 0, mult: 1, ptsMejora: 0, bonusEq: 0, bonusEfecto: 0 }
    ];
    efectosPersonaje = [];
}

// =========================================
// SISTEMA DE GUARDADO EN LA NUBE (SUPABASE REAL)
// =========================================

async function renderizarLobby() {
    const listaLobby = document.getElementById('lista-personajes-lobby');
    listaLobby.innerHTML = '<p style="text-align:center;">Conectando con el servidor...</p>';

    const { data: { user } } = await window.db.auth.getUser();
    if (!user) return;

    // Pedimos TODOS los personajes de este usuario a la Nube
    const { data: personajesGuardados, error } = await window.db
        .from('personajes')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        listaLobby.innerHTML = '<p style="color:red; text-align:center;">Error de conexión.</p>';
        return;
    }

    listaLobby.innerHTML = '';

    if (personajesGuardados.length === 0) {
        listaLobby.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No estás en ninguna historia aún.</p>';
        return;
    }

    // LÓGICA DE AGRUPACIÓN (Tu idea de Arquitecto)
    // Por ahora, todos irán a "Personajes Libres" porque historia_id es null.
    listaLobby.innerHTML += `<h4 style="margin:5px 0; color:#7f8c8d;">Personajes Libres (Sin Campaña)</h4>`;

    personajesGuardados.forEach(p => {
        const img = p.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
        const clase = p.identidad.clase || 'Aventurero';
        
        listaLobby.innerHTML += `
            <div class="char-item" onclick="entrarAlPersonaje('${p.id}')">
                <img src="${img}" alt="avatar">
                <div class="char-info">
                    <h4>${p.identidad.nombre || "Desconocido"}</h4>
                    <p>Nivel ${p.progreso.nivelPersonaje} | ${clase}</p>
                </div>
            </div>
        `;
    });
}

async function guardarPersonaje() {
    const nombreStr = document.getElementById('char-nombre').value.trim();
    if (!nombreStr) { alert("¡Ponle un nombre a tu personaje!"); return; }

    const { data: { user } } = await window.db.auth.getUser();

    let mochilaArray = [];
    for(let i=1; i<=5; i++) {
        mochilaArray.push({ val: document.getElementById(`inv-${i}`).value, id: document.getElementById(`inv-${i}`).dataset.itemId || "" });
    }

    const payload = {
        user_id: user.id,
        historia_id: historiaIdActual, // Estará atado a una historia si entraste por código
        identidad: { nombre: nombreStr, imgUrl: document.getElementById('char-img-url').value, sexo: document.getElementById('char-sexo').value, edad: document.getElementById('char-edad').value, clase: document.getElementById('char-clase').value, historia: document.getElementById('char-historia').value },
        progreso: { modoJuego: modoJuego, puntosInicialesDisp: puntosInicialesDisp, nivelPersonaje: nivelPersonaje, puntosMejoraDisp: puntosMejoraDisp, hpActual: hpActual, manaActual: manaActual },
        stats_array: stats,
        efectos_array: efectosPersonaje,
        inventario: {
            eqArmadura: { val: document.getElementById('eq-armadura').value, id: document.getElementById('eq-armadura').dataset.itemId || "" },
            eqMano1: { val: document.getElementById('eq-mano1').value, id: document.getElementById('eq-mano1').dataset.itemId || "" },
            eqMano2: { val: document.getElementById('eq-mano2').value, id: document.getElementById('eq-mano2').dataset.itemId || "" },
            mochila: mochilaArray
        }
    };

    let errorSupabase = null;

    // GUARDAR EN SUPABASE
    if (!idPersonajeActual) {
        const { data, error } = await window.db.from('personajes').insert([payload]).select();
        errorSupabase = error;
        if(data && data.length > 0) idPersonajeActual = data[0].id;
    } else {
        const { error } = await window.db.from('personajes').update(payload).eq('id', idPersonajeActual);
        errorSupabase = error;
    }

    if (errorSupabase) {
        alert("Error al guardar en la nube.");
        console.error(errorSupabase);
    } else {
        document.getElementById('nav-char-name').innerText = nombreStr;
        alert("¡Personaje Guardado en Supabase!");
    }
}

async function cargarPersonajeSeleccionado(idSeleccionado) {
    if (!idSeleccionado) return;

    // DESCARGAR DESDE SUPABASE
    const { data, error } = await window.db.from('personajes').select('*').eq('id', idSeleccionado).single();
    
    if (error || !data) { alert("Error al cargar de la nube."); return; }

    idPersonajeActual = data.id;
    historiaIdActual = data.historia_id;
    document.getElementById('nav-char-name').innerText = data.identidad.nombre;

    document.getElementById('char-nombre').value = data.identidad.nombre;
    document.getElementById('char-img-url').value = data.identidad.imgUrl;
    document.getElementById('char-sexo').value = data.identidad.sexo;
    document.getElementById('char-edad').value = data.identidad.edad;
    document.getElementById('char-clase').value = data.identidad.clase;
    document.getElementById('char-historia').value = data.identidad.historia;
    actualizarImagen();

    modoJuego = data.progreso.modoJuego; puntosInicialesDisp = data.progreso.puntosInicialesDisp; nivelPersonaje = data.progreso.nivelPersonaje; puntosMejoraDisp = data.progreso.puntosMejoraDisp; hpActual = data.progreso.hpActual; manaActual = data.progreso.manaActual;

    if (modoJuego) { document.getElementById('fase-creacion').classList.add('hidden'); document.getElementById('fase-juego').classList.remove('hidden'); document.getElementById('col-asignar').classList.add('hidden'); document.getElementById('col-mejora').classList.remove('hidden'); } 
    else { document.getElementById('fase-creacion').classList.remove('hidden'); document.getElementById('fase-juego').classList.add('hidden'); document.getElementById('col-asignar').classList.remove('hidden'); document.getElementById('col-mejora').classList.add('hidden'); }

    stats = data.stats_array; efectosPersonaje = data.efectos_array || [];

    const eqIds = ['eq-armadura', 'eq-mano1', 'eq-mano2'];
    const eqData = [data.inventario.eqArmadura, data.inventario.eqMano1, data.inventario.eqMano2];
    eqIds.forEach((id, i) => { document.getElementById(id).value = eqData[i].val; document.getElementById(id).dataset.itemId = eqData[i].id; });

    data.inventario.mochila.forEach((item, i) => { document.getElementById(`inv-${i+1}`).value = item.val; document.getElementById(`inv-${i+1}`).dataset.itemId = item.id; });

    renderizarEfectos(); actualizarEquipamiento(); 
}

function nuevoPersonaje() {
    idPersonajeActual = null;
    historiaIdActual = null;
    document.getElementById('nav-char-name').innerText = "Personaje Nuevo";
    
    ['char-nombre', 'char-img-url', 'char-sexo', 'char-edad', 'char-clase', 'char-historia'].forEach(id => document.getElementById(id).value = "");
    document.getElementById('char-img-display').src = "https://via.placeholder.com/150?text=Retrato";

    ['eq-armadura', 'eq-mano1', 'eq-mano2', 'inv-1', 'inv-2', 'inv-3', 'inv-4', 'inv-5'].forEach(id => { document.getElementById(id).value = ""; document.getElementById(id).dataset.itemId = ""; });

    modoJuego = false; puntosInicialesDisp = 15; nivelPersonaje = 1; puntosMejoraDisp = 0;
    
    document.getElementById('fase-creacion').classList.remove('hidden'); document.getElementById('fase-juego').classList.add('hidden'); document.getElementById('col-asignar').classList.remove('hidden'); document.getElementById('col-mejora').classList.add('hidden');

    inicializarStatsBase(); hpActual = 20; hpMax = 20; manaActual = 20; manaMax = 20;
    renderizarEfectos(); actualizarEquipamiento();
}

async function borrarPersonaje() {
    if (!idPersonajeActual) return;
    if (confirm("¿Borrar personaje de Supabase permanentemente?")) {
        const { error } = await window.db.from('personajes').delete().eq('id', idPersonajeActual);
        if(!error) volverAlLobby();
        else alert("Error al borrar en la nube.");
    }
}

// =========================================
// NAVEGACIÓN
// =========================================
function crearNuevoPersonajeLobby() { nuevoPersonaje(); document.getElementById('pantalla-lobby').classList.add('hidden'); document.getElementById('pantalla-personaje').classList.remove('hidden'); }
function entrarAlPersonaje(id) { cargarPersonajeSeleccionado(id); document.getElementById('pantalla-lobby').classList.add('hidden'); document.getElementById('pantalla-personaje').classList.remove('hidden'); }

async function volverAlLobby() { 
    document.getElementById('pantalla-personaje').classList.add('hidden'); 
    document.getElementById('pantalla-lobby').classList.remove('hidden'); 
    await renderizarLobby();
}

async function cerrarSesion() {
    await window.db.auth.signOut();
    window.location.href = 'login.html';
}

function unirseAHistoriaPrompt() {
    // ESTA ES LA FUNCIÓN DEL FUTURO (Paso 3)
    const codigo = prompt("Ingresa el código secreto de la historia del DM:");
    if(codigo) {
        alert("Buscando en Supabase la historia con código: " + codigo + "\n(Lo programaremos en el siguiente paso)");
    }
}

// =========================================
// LÓGICA DEL JUEGO (Motor Matemático)
// =========================================
function actualizarImagen() { const url = document.getElementById('char-img-url').value; if(url) document.getElementById('char-img-display').src = url; }
function calcularNivelFinal(stat) { let nivelBase = stat.id === 'vitalidad' ? stat.base + ((nivelPersonaje - 1) * stat.mult) : (stat.base + stat.ptsIniciales) + (stat.mult * stat.ptsMejora); let totalBonus = (stat.bonusEq || 0) + (stat.bonusEfecto || 0); return { puro: nivelBase, total: nivelBase + totalBonus }; }
function recalcularMultiplicadores() { stats.forEach(stat => { if (stat.id !== 'vitalidad') { let n = stat.base + stat.ptsIniciales; stat.mult = n <= 2 ? 1 : n === 3 ? 2 : n <= 5 ? 3 : 4; } }); }

function renderizarEfectos() {
    const container = document.getElementById('contenedor-efectos'); container.innerHTML = '';
    efectosPersonaje.forEach(efecto => {
        let modsHtml = '';
        efecto.mods.forEach((mod, index) => {
            modsHtml += `<div class="mod-row"><select onchange="updateModStat(${efecto.id}, ${index}, this.value)" style="padding: 4px; border: 1px solid #bdc3c7; border-radius: 4px;">${stats.map(s => `<option value="${s.id}" ${mod.stat === s.id ? 'selected' : ''}>${s.nombre}</option>`).join('')}</select><input type="number" value="${mod.valor}" oninput="updateModValor(${efecto.id}, ${index}, this.value)" style="width: 50px; text-align: center; padding: 4px; border: 1px solid #bdc3c7; border-radius: 4px;"><button class="btn btn-icon btn-red" style="padding: 4px 8px;" onclick="eliminarMod(${efecto.id}, ${index})" title="Eliminar stat">x</button></div>`;
        });
        container.innerHTML += `<div class="efecto-card"><div class="efecto-header"><input type="checkbox" ${efecto.activo ? 'checked' : ''} onchange="toggleEfecto(${efecto.id}, this.checked)" title="Activar / Desactivar"><input type="text" value="${efecto.nombre}" placeholder="Nombre del efecto..." oninput="updateEfectoNombre(${efecto.id}, this.value)"><button class="btn btn-icon btn-red" onclick="eliminarEfecto(${efecto.id})" title="Eliminar Efecto">Borrar</button></div>${modsHtml}<div style="padding-left: 30px; margin-top: 5px;"><button class="btn btn-small btn-blue" onclick="agregarMod(${efecto.id})">+ Añadir Stat</button></div></div>`;
    });
}

function agregarEfecto() { efectosPersonaje.push({ id: Date.now(), nombre: "Nuevo Efecto", activo: true, mods: [{ stat: 'velocidad', valor: -1 }] }); renderizarEfectos(); actualizarEquipamiento(); }
function eliminarEfecto(id) { efectosPersonaje = efectosPersonaje.filter(e => e.id !== id); renderizarEfectos(); actualizarEquipamiento(); }
function toggleEfecto(id, isChecked) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.activo = isChecked; actualizarEquipamiento(); }
function updateEfectoNombre(id, val) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.nombre = val; }
function agregarMod(id) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.mods.push({ stat: 'vitalidad', valor: 0 }); renderizarEfectos(); }
function eliminarMod(id, modIndex) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.mods.splice(modIndex, 1); renderizarEfectos(); actualizarEquipamiento(); }
function updateModStat(id, modIndex, val) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.mods[modIndex].stat = val; actualizarEquipamiento(); }
function updateModValor(id, modIndex, val) { const ef = efectosPersonaje.find(e => e.id === id); if (ef) ef.mods[modIndex].valor = parseInt(val) || 0; actualizarEquipamiento(); }

function actualizarEquipamiento() {
    stats.forEach(s => { s.bonusEq = 0; s.bonusEfecto = 0; }); 
    const slotsEquipables = [{ id: 'eq-armadura', tiposValidos: ['armadura'] }, { id: 'eq-mano1', tiposValidos: ['arma', 'escudo'] }, { id: 'eq-mano2', tiposValidos: ['arma', 'escudo'] }];
    slotsEquipables.forEach(slot => {
        const input = document.getElementById(slot.id);
        if (input && input.dataset.itemId) {
            const item = baseDatosItems.find(i => i.id === input.dataset.itemId);
            if (item && item.bonus && slot.tiposValidos.includes(item.tipo)) {
                for (const [statId, valor] of Object.entries(item.bonus)) { const statObj = stats.find(s => s.id === statId); if (statObj) statObj.bonusEq += valor; }
            }
        }
    });
    efectosPersonaje.forEach(efecto => { if (efecto.activo) { efecto.mods.forEach(mod => { const statObj = stats.find(s => s.id === mod.stat); if (statObj && !isNaN(mod.valor)) { statObj.bonusEfecto += mod.valor; } }); } });
    renderizarTabla();
}

function renderizarTabla() {
    const tbody = document.getElementById('tabla-stats'); if(!tbody) return; 
    tbody.innerHTML = ''; if (!modoJuego) recalcularMultiplicadores();

    stats.forEach((stat, index) => {
        const nivel = calcularNivelFinal(stat); let textoNivel = `${nivel.puro}`;
        if (stat.bonusEq > 0) textoNivel += ` <span class="text-blue">(+${stat.bonusEq})</span>`; else if (stat.bonusEq < 0) textoNivel += ` <span style="color:#e74c3c;">(${stat.bonusEq})</span>`;
        if (stat.bonusEfecto > 0) textoNivel += ` <span style="color:#8e44ad;">(+${stat.bonusEfecto})</span>`; else if (stat.bonusEfecto < 0) textoNivel += ` <span style="color:#e74c3c;">(${stat.bonusEfecto})</span>`;
        
        let colInt = '';
        if (stat.id === 'vitalidad') { colInt = `<td><span class="text-muted">Auto</span></td>`; } 
        else if (!modoJuego) { colInt = `<td><div class="stat-control"><button class="btn btn-blue btn-small" onclick="modificarPuntoInicial(${index}, 1)" ${puntosInicialesDisp === 0 ? 'disabled' : ''}>+</button><span style="display:inline-block; width:20px; font-weight:bold; text-align:center;">${stat.ptsIniciales}</span><button class="btn btn-blue btn-small" onclick="modificarPuntoInicial(${index}, -1)">-</button></div></td>`; } 
        else { colInt = `<td><button class="btn btn-green btn-small" onclick="gastarPuntoMejora(${index})" ${puntosMejoraDisp === 0 ? 'disabled' : ''}>+ Mejorar</button><span style="font-size: 12px; color: #7f8c8d; display: block; margin-top: 3px;">Gastados: ${stat.ptsMejora}</span></td>`; }
        tbody.innerHTML += `<tr><td><strong>${stat.nombre}</strong></td><td style="font-size: 18px; font-weight: bold;">${textoNivel}</td>${colInt}<td style="color: #8e44ad; font-weight: bold;">+${stat.mult}</td></tr>`;
    });

    document.getElementById('puntos-iniciales').innerText = puntosInicialesDisp;
    document.getElementById('btn-comenzar').disabled = puntosInicialesDisp > 0;
    document.getElementById('nivel-general').innerText = nivelPersonaje;
    document.getElementById('puntos-mejora').innerText = puntosMejoraDisp;

    const vNivel = calcularNivelFinal(stats[0]);
    if (hpMax !== vNivel.total) { const dif = vNivel.total - hpMax; hpMax = vNivel.total; manaMax = vNivel.total; hpActual += dif; manaActual += dif; }
    actualizarVisualesBarras();
}

function desequipar(idEquipado) {
    const inputEq = document.getElementById(idEquipado); if (!inputEq || !inputEq.value) return;
    let slotVacio = null; for (let i = 1; i <= 5; i++) { const invInput = document.getElementById(`inv-${i}`); if (invInput && !invInput.value) { slotVacio = invInput; break; } }
    if (!slotVacio) { alert("Mochila llena. No hay espacio para guardar esto."); return; }
    slotVacio.value = inputEq.value; slotVacio.dataset.itemId = inputEq.dataset.itemId || ""; inputEq.value = ""; inputEq.dataset.itemId = ""; actualizarEquipamiento();
}

function intercambiar(slotNum) {
    const invInput = document.getElementById(`inv-${slotNum}`); const targetInput = document.getElementById(document.getElementById(`target-${slotNum}`).value);
    if (!invInput || !targetInput) return; if (!invInput.value && !targetInput.value) return; 
    const tempValorDestino = targetInput.value; const tempIdDestino = targetInput.dataset.itemId || "";
    targetInput.value = invInput.value; targetInput.dataset.itemId = invInput.dataset.itemId || "";
    invInput.value = tempValorDestino; invInput.dataset.itemId = tempIdDestino; actualizarEquipamiento(); 
}

function modificarBarra(tipo, mult) {
    const inputElem = document.getElementById(`${tipo}-input`); const valor = parseInt(inputElem.value) || 0; if(valor === 0) return;
    if (tipo === 'hp') { hpActual += (valor * mult); if (hpActual < 0) hpActual = 0; if (hpActual > hpMax) hpActual = hpMax; } 
    else if (tipo === 'mana') { manaActual += (valor * mult); if (manaActual < 0) manaActual = 0; if (manaActual > manaMax) manaActual = manaMax; }
    inputElem.value = 1; actualizarVisualesBarras(); if(hpActual === 0) setTimeout(() => alert("¡TUS PUNTOS DE VIDA SON 0! Tira los dados."), 600);
}

function actualizarVisualesBarras() {
    const hpPct = (hpActual / hpMax) * 100; document.getElementById('hp-bar').style.width = `${hpPct}%`; document.getElementById('hp-text-display').innerText = `${hpActual} / ${hpMax}`;
    if (hpPct <= 30) { document.getElementById('hp-bar').classList.add('low'); document.getElementById('hp-text-display').classList.add('low'); } else { document.getElementById('hp-bar').classList.remove('low'); document.getElementById('hp-text-display').classList.remove('low'); }
    const manaPct = (manaActual / manaMax) * 100; document.getElementById('mana-bar').style.width = `${manaPct}%`; document.getElementById('mana-text-display').innerText = `${manaActual} / ${manaMax}`;
}

function activarAutocompletado(inputId, tiposPermitidos, afectaStats) {
    const inp = document.getElementById(inputId); if(!inp) return;
    inp.addEventListener("input", function(e) {
        let val = this.value; cerrarListas(); if (!val) { this.dataset.itemId = ""; if(afectaStats) actualizarEquipamiento(); return false; }
        let listaDiv = document.createElement("DIV"); listaDiv.setAttribute("id", this.id + "autocomplete-list"); listaDiv.setAttribute("class", "autocomplete-items"); this.parentNode.appendChild(listaDiv);
        let coincidencias = baseDatosItems.filter(item => item.nombre.toLowerCase().includes(val.toLowerCase()));
        coincidencias.forEach(item => {
            let itemDiv = document.createElement("DIV"); let index = item.nombre.toLowerCase().indexOf(val.toLowerCase());
            itemDiv.innerHTML = item.nombre.substring(0, index) + "<strong>" + item.nombre.substring(index, index + val.length) + "</strong>" + item.nombre.substring(index + val.length);
            itemDiv.addEventListener("click", function(e) { inp.value = item.nombre; inp.dataset.itemId = item.id; cerrarListas(); if(afectaStats) actualizarEquipamiento(); }); listaDiv.appendChild(itemDiv);
        });
    });
    document.addEventListener("click", function (e) { cerrarListas(e.target); });
    function cerrarListas(elmnt) { var x = document.getElementsByClassName("autocomplete-items"); for (var i = 0; i < x.length; i++) { if (elmnt != x[i] && elmnt != inp) { x[i].parentNode.removeChild(x[i]); } } }
}

function modificarPuntoInicial(i, v) { if (v === -1 && stats[i].ptsIniciales > 0) { stats[i].ptsIniciales -= 1; puntosInicialesDisp += 1; } else if (v === 1 && puntosInicialesDisp > 0) { stats[i].ptsIniciales += 1; puntosInicialesDisp -= 1; } renderizarTabla(); }
function iniciarPartida() { modoJuego = true; document.getElementById('fase-creacion').classList.add('hidden'); document.getElementById('fase-juego').classList.remove('hidden'); document.getElementById('col-asignar').classList.add('hidden'); document.getElementById('col-mejora').classList.remove('hidden'); const vNivel = calcularNivelFinal(stats[0]); hpMax = vNivel.total; manaMax = vNivel.total; hpActual = hpMax; manaActual = manaMax; renderizarTabla(); }
function subirNivelGeneral() { nivelPersonaje++; puntosMejoraDisp++; renderizarTabla(); }
function gastarPuntoMejora(i) { if (puntosMejoraDisp > 0 && stats[i].id !== 'vitalidad') { stats[i].ptsMejora++; puntosMejoraDisp--; renderizarTabla(); } }

// =========================================
// NAVEGACIÓN Y ARRANQUE SEGURO DE LA HOJA
// =========================================

function volverAlLobby() {
    window.location.href = "index.html"; // Regreso físico
}

window.addEventListener('DOMContentLoaded', async () => {
    
    // 1. EL GUARDIA DE SEGURIDAD
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) {
        window.location.href = "login.html";
        return; 
    }

    inicializarStatsBase();

    // 2. LA MAGIA DE LA URL: Revisamos si llegamos aquí haciendo clic en un personaje
    // Ejemplo: personaje.html?id=12345-abcde
    const urlParams = new URLSearchParams(window.location.search);
    const charId = urlParams.get('id');

    if (charId) {
        // Si hay ID en la URL, lo descargamos de Supabase
        await cargarPersonajeSeleccionado(charId);
    } else {
        // Si no hay ID, es que le diste a "Crear Nuevo"
        nuevoPersonaje();
    }
    
    // Activar buscadores de items
    activarAutocompletado("eq-armadura", ["armadura"], true);
    activarAutocompletado("eq-mano1", ["arma", "escudo"], true);
    activarAutocompletado("eq-mano2", ["arma", "escudo"], true);
    for(let i=1; i<=5; i++) activarAutocompletado(`inv-${i}`, ["todos"], false);
});
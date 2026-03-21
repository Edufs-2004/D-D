// dm.js

let campanaIdActual = null;
let statsItemActual = [{ stat: 'ataque', valor: 0 }]; // Empezamos con 1 stat por defecto

// 1. GUARDIA DE SEGURIDAD E INICIALIZACIÓN
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    campanaIdActual = urlParams.get('id');

    if (!campanaIdActual) {
        alert("Error: No se especificó ninguna campaña.");
        window.location.href = "index.html";
        return;
    }

    cargarDatosCampana();
    cargarJugadores();
    renderizarStatsItem(); // Dibuja el primer stat en el formulario
    cargarItemsForjados();
});

async function cargarDatosCampana() {
    const { data, error } = await window.db.from('historias').select('*').eq('id', campanaIdActual).single();
    if (error || !data) return;
    document.getElementById('dm-campana-nombre').innerText = data.nombre;
    document.getElementById('dm-campana-codigo').innerText = data.codigo_acceso;
}

async function cargarJugadores() {
    const listaJugadores = document.getElementById('lista-jugadores-dm');
    const { data: jugadores, error } = await window.db.from('personajes').select('*').eq('historia_id', campanaIdActual);

    if (error) { listaJugadores.innerHTML = '<p style="color:red; text-align:center;">Error al buscar jugadores.</p>'; return; }
    listaJugadores.innerHTML = '';
    if (jugadores.length === 0) { listaJugadores.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aún no hay aventureros en esta campaña.</p>'; return; }

    jugadores.forEach(j => {
        const img = j.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
        listaJugadores.innerHTML += `
            <div class="char-item" style="border-left: 4px solid #f39c12; cursor: default;">
                <img src="${img}" alt="avatar">
                <div class="char-info">
                    <h4 style="margin:2px 0;">${j.identidad.nombre || "Desconocido"}</h4>
                    <p style="color: #27ae60; font-weight:bold;">Nivel ${j.progreso.nivelPersonaje} | HP: ${j.progreso.hpActual}/${j.progreso.hpMax || j.progreso.hpActual}</p>
                </div>
            </div>
        `;
    });
}

// =========================================
// GESTIÓN DEL FORMULARIO DE ÍTEMS (MULTI-STAT)
// =========================================
function renderizarStatsItem() {
    const contenedor = document.getElementById('contenedor-stats-item');
    contenedor.innerHTML = '';
    
    statsItemActual.forEach((mod, index) => {
        contenedor.innerHTML += `
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <select onchange="actualizarStatItem(${index}, 'stat', this.value)" style="flex-grow: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="ataque" ${mod.stat === 'ataque' ? 'selected' : ''}>Ataque</option>
                    <option value="defensa" ${mod.stat === 'defensa' ? 'selected' : ''}>Defensa</option>
                    <option value="ataque_magico" ${mod.stat === 'ataque_magico' ? 'selected' : ''}>Ataq. Mágico</option>
                    <option value="defensa_magica" ${mod.stat === 'defensa_magica' ? 'selected' : ''}>Def. Mágica</option>
                    <option value="velocidad" ${mod.stat === 'velocidad' ? 'selected' : ''}>Velocidad</option>
                    <option value="inteligencia" ${mod.stat === 'inteligencia' ? 'selected' : ''}>Inteligencia</option>
                    <option value="vitalidad" ${mod.stat === 'vitalidad' ? 'selected' : ''}>Vitalidad Max</option>
                    <option value="destreza" ${mod.stat === 'destreza' ? 'selected' : ''}>Destreza</option>
                </select>
                <input type="number" value="${mod.valor}" oninput="actualizarStatItem(${index}, 'valor', this.value)" style="width: 60px; text-align: center; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
                <button class="btn btn-icon btn-red" onclick="eliminarStatItem(${index})">x</button>
            </div>
        `;
    });
}

function agregarStatItem() { statsItemActual.push({ stat: 'ataque', valor: 0 }); renderizarStatsItem(); }
function eliminarStatItem(index) { statsItemActual.splice(index, 1); renderizarStatsItem(); }
function actualizarStatItem(index, clave, valor) {
    if (clave === 'valor') statsItemActual[index].valor = parseInt(valor) || 0;
    else statsItemActual[index].stat = valor;
}

// =========================================
// CRUD DE ÍTEMS EN SUPABASE
// =========================================
async function forjarItem() {
    const editId = document.getElementById('item-edit-id').value;
    const nombre = document.getElementById('nuevo-item-nombre').value.trim();
    const tipo = document.getElementById('nuevo-item-tipo').value;

    if (!nombre) { alert("Ponle un nombre al ítem."); return; }

    // Construimos el JSON juntando todos los stats del formulario
    let bonusJson = {};
    statsItemActual.forEach(mod => {
        if (mod.valor !== 0) bonusJson[mod.stat] = (bonusJson[mod.stat] || 0) + mod.valor;
    });

    const payload = {
        historia_id: campanaIdActual,
        nombre: nombre,
        tipo: tipo,
        bonus: bonusJson
    };

    let errorSupabase = null;

    if (editId) {
        // ACTUALIZAR
        const { error } = await window.db.from('items').update(payload).eq('id', editId);
        errorSupabase = error;
    } else {
        // INSERTAR NUEVO
        const { error } = await window.db.from('items').insert([payload]);
        errorSupabase = error;
    }

    if (errorSupabase) {
        alert("Error al guardar el ítem."); console.error(errorSupabase);
    } else {
        cancelarEdicion();
        cargarItemsForjados();
    }
}

async function cargarItemsForjados() {
    const listaItems = document.getElementById('lista-items-dm');
    const { data: items, error } = await window.db.from('items').select('*').eq('historia_id', campanaIdActual);
    if (error) return;

    listaItems.innerHTML = '';
    if (items.length === 0) { listaItems.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-size: 13px;">Aún no has forjado nada.</p>'; return; }

    items.forEach(item => {
        // Creamos un string bonito con todos los stats del ítem
        let statsString = "";
        for (const [stat, valor] of Object.entries(item.bonus)) {
            const signo = valor >= 0 ? '+' : '';
            const color = valor >= 0 ? '#27ae60' : '#e74c3c';
            statsString += `<span style="color:${color}; margin-left:8px; font-weight:bold; font-size:12px;">${stat}: ${signo}${valor}</span>`;
        }

        // Convertimos el objeto en string para pasarlo por la función HTML
        const itemDataString = encodeURIComponent(JSON.stringify(item));

        listaItems.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; background: #ecf0f1; padding: 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #bdc3c7;">
                <div style="display:flex; flex-direction:column; flex-grow:1;">
                    <strong style="color:#2c3e50; font-size: 14px;">${item.nombre}</strong>
                    <span style="font-size: 11px; color: #7f8c8d; text-transform: uppercase;">${item.tipo}</span>
                    <div style="margin-top: 4px;">${statsString}</div>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="btn btn-small btn-blue" onclick="editarItem('${itemDataString}')">✏️</button>
                    <button class="btn btn-small btn-red" onclick="borrarItem('${item.id}')">🗑️</button>
                </div>
            </li>
        `;
    });
}

function editarItem(itemDataString) {
    const item = JSON.parse(decodeURIComponent(itemDataString));
    
    document.getElementById('item-edit-id').value = item.id;
    document.getElementById('nuevo-item-nombre').value = item.nombre;
    document.getElementById('nuevo-item-tipo').value = item.tipo;
    
    // Convertir el JSON de base de datos a nuestro array del formulario
    statsItemActual = [];
    for (const [stat, valor] of Object.entries(item.bonus)) {
        statsItemActual.push({ stat: stat, valor: valor });
    }
    if(statsItemActual.length === 0) statsItemActual.push({ stat: 'ataque', valor: 0 });

    renderizarStatsItem();
    
    document.getElementById('btn-forjar').innerText = "💾 Guardar Cambios";
    document.getElementById('btn-cancelar-edicion').classList.remove('hidden');
}

function cancelarEdicion() {
    document.getElementById('item-edit-id').value = "";
    document.getElementById('nuevo-item-nombre').value = "";
    document.getElementById('nuevo-item-tipo').value = "arma";
    statsItemActual = [{ stat: 'ataque', valor: 0 }];
    renderizarStatsItem();
    
    document.getElementById('btn-forjar').innerText = "🔨 Forjar Ítem";
    document.getElementById('btn-cancelar-edicion').classList.add('hidden');
}

async function borrarItem(id) {
    if(confirm("¿Borrar este ítem de la campaña para siempre?")) {
        await window.db.from('items').delete().eq('id', id);
        cargarItemsForjados();
    }
}
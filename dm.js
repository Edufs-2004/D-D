// dm.js

let campanaIdActual = null;
let statsItemActual = [{ stat: 'ataque', valor: 0 }];

// =========================================
// 1. GUARDIA DE SEGURIDAD E INICIALIZACIÓN
// =========================================
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    campanaIdActual = urlParams.get('id');

    if (!campanaIdActual) { window.location.href = "index.html"; return; }

    cargarDatosCampana(); cargarJugadores(); renderizarStatsItem(); cargarItemsForjados(); cargarBestiario(); cargarTableroEnVivo(); 
});

// =========================================
// 2. CAMPAÑA Y JUGADORES (Añadido botón de Expulsar)
// =========================================
async function cargarDatosCampana() {
    const { data } = await window.db.from('historias').select('*').eq('id', campanaIdActual).single();
    if (data) { document.getElementById('dm-campana-nombre').innerText = data.nombre; document.getElementById('dm-campana-codigo').innerText = data.codigo_acceso; }
}

async function cargarJugadores() {
    const listaJugadores = document.getElementById('lista-jugadores-dm');
    const { data: jugadores } = await window.db.from('personajes').select('*').eq('historia_id', campanaIdActual);
    listaJugadores.innerHTML = '';
    
    if (!jugadores || jugadores.length === 0) { listaJugadores.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aún no hay aventureros en esta campaña.</p>'; return; }

    jugadores.forEach(j => {
        const img = j.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
        listaJugadores.innerHTML += `
            <div class="char-item" style="border-left: 4px solid #3498db; cursor: default;">
                <img src="${img}" alt="avatar">
                <div class="char-info" style="width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin:2px 0;">${j.identidad.nombre || "Desconocido"}</h4>
                        <button class="btn btn-icon" style="color:#e74c3c; border:none; font-size:16px; background:transparent;" onclick="expulsarJugador('${j.id}', '${j.identidad.nombre}')" title="Expulsar de la campaña">👢</button>
                    </div>
                    <p style="color: #27ae60; font-weight:bold; margin-top:3px;">
                        Nivel ${j.progreso.nivelPersonaje} | HP: ${j.progreso.hpActual}/${j.progreso.hpMax || j.progreso.hpActual} | MP: ${j.progreso.manaActual}
                    </p>
                </div>
            </div>
        `;
    });
}

async function expulsarJugador(idPersonaje, nombre) {
    if(confirm(`¿Seguro que quieres expulsar a ${nombre} de esta campaña?\nSu personaje se convertirá en "Libre" en su portal.`)) {
        await window.db.from('personajes').update({ historia_id: null }).eq('id', idPersonaje);
        cargarJugadores();
    }
}

// =========================================
// 3. LA FORJA: GESTIÓN DE ÍTEMS (Ocultada en Acordeón en el HTML)
// =========================================
function renderizarStatsItem() { 
    const contenedor = document.getElementById('contenedor-stats-item'); contenedor.innerHTML = '';
    statsItemActual.forEach((mod, index) => {
        contenedor.innerHTML += `<div style="display: flex; gap: 5px; margin-bottom: 5px;"><select onchange="actualizarStatItem(${index}, 'stat', this.value)" style="flex-grow: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;"><option value="ataque" ${mod.stat === 'ataque' ? 'selected' : ''}>Ataque</option><option value="defensa" ${mod.stat === 'defensa' ? 'selected' : ''}>Defensa</option><option value="ataque_magico" ${mod.stat === 'ataque_magico' ? 'selected' : ''}>Ataq. Mágico</option><option value="defensa_magica" ${mod.stat === 'defensa_magica' ? 'selected' : ''}>Def. Mágica</option><option value="velocidad" ${mod.stat === 'velocidad' ? 'selected' : ''}>Velocidad</option><option value="inteligencia" ${mod.stat === 'inteligencia' ? 'selected' : ''}>Inteligencia</option><option value="vitalidad" ${mod.stat === 'vitalidad' ? 'selected' : ''}>Vitalidad Max</option><option value="destreza" ${mod.stat === 'destreza' ? 'selected' : ''}>Destreza</option></select><input type="number" value="${mod.valor}" oninput="actualizarStatItem(${index}, 'valor', this.value)" style="width: 60px; text-align: center; padding: 6px; border: 1px solid #ccc; border-radius: 4px;"><button class="btn btn-icon btn-red" onclick="eliminarStatItem(${index})">x</button></div>`;
    });
}
function agregarStatItem() { statsItemActual.push({ stat: 'ataque', valor: 0 }); renderizarStatsItem(); }
function eliminarStatItem(index) { statsItemActual.splice(index, 1); renderizarStatsItem(); }
function actualizarStatItem(index, clave, valor) { if (clave === 'valor') statsItemActual[index].valor = parseInt(valor) || 0; else statsItemActual[index].stat = valor; }

async function forjarItem() {
    const editId = document.getElementById('item-edit-id').value; const nombre = document.getElementById('nuevo-item-nombre').value.trim(); const tipo = document.getElementById('nuevo-item-tipo').value;
    if (!nombre) return;
    let bonusJson = {}; statsItemActual.forEach(mod => { if (mod.valor !== 0) bonusJson[mod.stat] = (bonusJson[mod.stat] || 0) + mod.valor; });
    const payload = { historia_id: campanaIdActual, nombre: nombre, tipo: tipo, bonus: bonusJson };
    if (editId) { await window.db.from('items').update(payload).eq('id', editId); } else { await window.db.from('items').insert([payload]); }
    cancelarEdicion(); cargarItemsForjados();
}

async function cargarItemsForjados() {
    const listaItems = document.getElementById('lista-items-dm');
    const { data: items } = await window.db.from('items').select('*').eq('historia_id', campanaIdActual);
    listaItems.innerHTML = '';
    if (!items || items.length === 0) { listaItems.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-size: 13px;">Nada forjado.</p>'; return; }
    items.forEach(item => {
        let statsString = ""; for (const [stat, valor] of Object.entries(item.bonus)) { const signo = valor >= 0 ? '+' : ''; const color = valor >= 0 ? '#27ae60' : '#e74c3c'; statsString += `<span style="color:${color}; margin-right:8px; font-weight:bold; font-size:11px;">${stat}:${signo}${valor}</span>`; }
        const itemDataString = encodeURIComponent(JSON.stringify(item));
        listaItems.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; background: #ecf0f1; padding: 6px; border-radius: 4px; margin-bottom: 5px; border: 1px solid #bdc3c7;"><div style="display:flex; flex-direction:column; flex-grow:1;"><strong style="color:#2c3e50; font-size: 13px;">${item.nombre}</strong><div style="margin-top: 2px;">${statsString}</div></div><div style="display:flex; gap:5px;"><button class="btn btn-small btn-blue" onclick="editarItem('${itemDataString}')">✏️</button><button class="btn btn-small btn-red" onclick="borrarItem('${item.id}')">🗑️</button></div></li>`;
    });
}
function editarItem(itemDataString) { const item = JSON.parse(decodeURIComponent(itemDataString)); document.getElementById('item-edit-id').value = item.id; document.getElementById('nuevo-item-nombre').value = item.nombre; document.getElementById('nuevo-item-tipo').value = item.tipo; statsItemActual = []; for (const [stat, valor] of Object.entries(item.bonus)) { statsItemActual.push({ stat: stat, valor: valor }); } if(statsItemActual.length === 0) statsItemActual.push({ stat: 'ataque', valor: 0 }); renderizarStatsItem(); document.getElementById('btn-forjar').innerText = "💾 Cambios"; document.getElementById('btn-cancelar-edicion').classList.remove('hidden'); }
function cancelarEdicion() { document.getElementById('item-edit-id').value = ""; document.getElementById('nuevo-item-nombre').value = ""; document.getElementById('nuevo-item-tipo').value = "arma"; statsItemActual = [{ stat: 'ataque', valor: 0 }]; renderizarStatsItem(); document.getElementById('btn-forjar').innerText = "🔨 Forjar"; document.getElementById('btn-cancelar-edicion').classList.add('hidden'); }
async function borrarItem(id) { if(confirm("¿Borrar ítem?")) { await window.db.from('items').delete().eq('id', id); cargarItemsForjados(); } }

// =========================================
// 4. EL BESTIARIO GLOBAL (Plantillas Avanzadas)
// =========================================
async function cargarBestiario() {
    const listaBestiario = document.getElementById('lista-bestiario-dm');
    const { data: { user } } = await window.db.auth.getUser();
    const { data: monstruos } = await window.db.from('bestiario').select('*').eq('dm_id', user.id);
    listaBestiario.innerHTML = '';
    if (!monstruos || monstruos.length === 0) { listaBestiario.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-size: 12px;">Tu bestiario está vacío.</p>'; return; }

    monstruos.forEach(m => {
        const jsonM = encodeURIComponent(JSON.stringify(m));
        listaBestiario.innerHTML += `
            <li style="display:flex; justify-content:space-between; align-items:center; background: #ecf0f1; padding: 8px; border-radius: 4px; margin-bottom: 5px; border: 1px solid #bdc3c7;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="color:#27ae60; font-size: 14px;">${m.nombre}</strong>
                    <span style="font-size: 11px; color: #7f8c8d;">❤️ ${m.hp_max} | 💧 ${m.mana_max}</span>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button class="btn btn-small btn-blue" onclick="invocarAlTablero('${jsonM}')" title="Añadir al Tablero de Combate">⚔️</button>
                    <button class="btn btn-small btn-red" onclick="borrarDelBestiario('${m.id}')" title="Borrar Plantilla">🗑️</button>
                </div>
            </li>
        `;
    });
}

async function guardarEnBestiario() {
    const nombre = document.getElementById('npc-nombre').value.trim();
    const hp = parseInt(document.getElementById('npc-hp').value);
    if (!nombre || isNaN(hp)) { alert("Nombre y HP son obligatorios."); return; }

    // Capturamos los 8 stats (o 1 si el DM lo dejó en blanco)
    const statsBase = { 
        vitalidad: parseInt(document.getElementById('npc-vit').value) || 1,
        velocidad: parseInt(document.getElementById('npc-spd').value) || 1,
        ataque: parseInt(document.getElementById('npc-atk').value) || 1,
        defensa: parseInt(document.getElementById('npc-def').value) || 1,
        ataque_magico: parseInt(document.getElementById('npc-atk-mag').value) || 1,
        defensa_magica: parseInt(document.getElementById('npc-def-mag').value) || 1,
        inteligencia: parseInt(document.getElementById('npc-int').value) || 1,
        destreza: parseInt(document.getElementById('npc-des').value) || 1
    };

    // Capturamos la config de inventario
    const invConfig = {
        pecho: document.getElementById('npc-has-pecho').checked,
        mano1: document.getElementById('npc-has-mano1').checked,
        mano2: document.getElementById('npc-has-mano2').checked,
        mochila: parseInt(document.getElementById('npc-mochila-slots').value) || 0
    };

    const mana = parseInt(document.getElementById('npc-mana').value) || 0;
    const { data: { user } } = await window.db.auth.getUser();

    await window.db.from('bestiario').insert([
        { dm_id: user.id, nombre: nombre, hp_max: hp, mana_max: mana, stats_base: statsBase, inventario_config: invConfig }
    ]);
    
    document.getElementById('npc-nombre').value = '';
    cargarBestiario();
}

async function borrarDelBestiario(id) { if(confirm("¿Eliminar criatura?")) { await window.db.from('bestiario').delete().eq('id', id); cargarBestiario(); } }

// =========================================
// 5. EL TABLERO DE COMBATE EN VIVO (Con Auto-Numeración y Loot)
// =========================================
async function invocarAlTablero(jsonMonstruo) {
    const plantilla = JSON.parse(decodeURIComponent(jsonMonstruo));

    // Auto-Numeración
    const { data: existentes } = await window.db.from('npc_activos').select('nombre').eq('historia_id', campanaIdActual);
    let cantidadClones = 0;
    if (existentes) { cantidadClones = existentes.filter(n => n.nombre.startsWith(plantilla.nombre)).length; }
    const nombreFinal = cantidadClones > 0 ? `${plantilla.nombre} ${cantidadClones + 1}` : plantilla.nombre;

    // Aseguramos que la config exista por si es un monstruo viejo
    const invConf = plantilla.inventario_config || { pecho:true, mano1:true, mano2:true, mochila:3 };
    const statsConf = plantilla.stats_base || { ataque:1, defensa:1, velocidad:1, inteligencia:1, destreza:1, vitalidad:1, ataque_magico:1, defensa_magica:1 };

    const clon = {
        historia_id: campanaIdActual, nombre: nombreFinal,
        hp_max: plantilla.hp_max, hp_actual: plantilla.hp_max,
        mana_max: plantilla.mana_max, mana_actual: plantilla.mana_max,
        stats_actuales: statsConf, inventario_config: invConf,
        inventario: {} // Nace sin objetos equipados
    };

    await window.db.from('npc_activos').insert([clon]);
    cargarTableroEnVivo();
}

async function cargarTableroEnVivo() {
    const tablero = document.getElementById('lista-npcs-activos');
    const { data: activos } = await window.db.from('npc_activos').select('*').eq('historia_id', campanaIdActual).order('id'); 
    tablero.innerHTML = '';
    
    if (!activos || activos.length === 0) { tablero.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay enemigos en el tablero.</p>'; return; }

    activos.forEach(npc => {
        const hpPct = Math.max(0, (npc.hp_actual / npc.hp_max) * 100);
        let colorBarra = hpPct > 30 ? '#e74c3c' : '#c0392b';
        
        const stats = npc.stats_actuales || {};
        const invConf = npc.inventario_config || { pecho:true, mano1:true, mano2:true, mochila:0 };
        const inv = npc.inventario || {};

        // Renderizado dinámico del inventario según la configuración
        let htmlInventario = '';
        if (invConf.pecho) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Pecho</label><input type="text" id="inv-pecho-${npc.id}" value="${inv.pecho||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`;
        if (invConf.mano1) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Mano 1</label><input type="text" id="inv-mano1-${npc.id}" value="${inv.mano1||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`;
        if (invConf.mano2) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Mano 2</label><input type="text" id="inv-mano2-${npc.id}" value="${inv.mano2||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`;
        
        for (let i = 1; i <= (invConf.mochila || 0); i++) {
            htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#f39c12; font-weight:bold;">Botín ${i}</label><input type="text" id="inv-mochila${i}-${npc.id}" value="${inv['mochila'+i]||''}" onchange="guardarInvNpc('${npc.id}')" placeholder="Item a dropear" style="width:100%; padding:4px; font-size:12px; border:1px solid #f39c12; border-radius:4px;"></div>`;
        }

        tablero.innerHTML += `
            <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #bdc3c7; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <strong style="font-size: 15px; color:#c0392b;">${npc.nombre}</strong>
                    <button class="btn btn-icon" style="background: transparent; color: #7f8c8d; border: none; font-size: 16px;" onclick="eliminarDelTablero('${npc.id}')" title="Quitar del Tablero">💀</button>
                </div>
                
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-weight:bold; font-size: 13px; color: #e74c3c; width: 45px;">${npc.hp_actual}/${npc.hp_max}</span>
                    <div style="flex-grow: 1; height: 12px; background: #ecf0f1; border-radius: 6px; overflow: hidden; border: 1px solid #bdc3c7;">
                        <div style="height: 100%; width: ${hpPct}%; background-color: ${colorBarra}; transition: width 0.3s ease-in-out;"></div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 5px; margin-bottom: 10px;">
                    <button class="btn btn-small btn-red" onclick="modificarVidaNpc('${npc.id}', ${npc.hp_actual}, -5)">-5</button>
                    <button class="btn btn-small btn-red" onclick="modificarVidaNpc('${npc.id}', ${npc.hp_actual}, -1)">-1</button>
                    <button class="btn btn-small btn-green" onclick="modificarVidaNpc('${npc.id}', ${npc.hp_actual}, 1)">+1</button>
                    <button class="btn btn-small btn-green" onclick="modificarVidaNpc('${npc.id}', ${npc.hp_actual}, 5)">+5</button>
                </div>

                <details style="background: #fafafa; padding: 8px; border-radius: 6px; border: 1px solid #ddd;">
                    <summary style="font-weight: bold; color: #2c3e50; font-size:13px; cursor: pointer; outline: none;">📊 Ver Stats y Botín</summary>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px; text-align: center; font-size: 9px; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#c0392b;">VIT:<br><span style="font-size:12px;">${stats.vitalidad||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#2980b9;">SPD:<br><span style="font-size:12px;">${stats.velocidad||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#e67e22;">ATK:<br><span style="font-size:12px;">${stats.ataque||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#27ae60;">DEF:<br><span style="font-size:12px;">${stats.defensa||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#8e44ad;">A.MAG:<br><span style="font-size:12px;">${stats.ataque_magico||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#8e44ad;">D.MAG:<br><span style="font-size:12px;">${stats.defensa_magica||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#16a085;">INT:<br><span style="font-size:12px;">${stats.inteligencia||1}</span></span>
                        <span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#f39c12;">DES:<br><span style="font-size:12px;">${stats.destreza||1}</span></span>
                    </div>

                    <div>${htmlInventario}</div>
                </details>
            </div>
        `;
    });
}

async function guardarInvNpc(npcId) {
    // Recolectamos dinámicamente todo lo que el HTML haya generado
    const pechoNode = document.getElementById(`inv-pecho-${npcId}`);
    const mano1Node = document.getElementById(`inv-mano1-${npcId}`);
    const mano2Node = document.getElementById(`inv-mano2-${npcId}`);
    
    let inv = {};
    if(pechoNode) inv.pecho = pechoNode.value;
    if(mano1Node) inv.mano1 = mano1Node.value;
    if(mano2Node) inv.mano2 = mano2Node.value;

    for(let i=1; i<=5; i++) {
        let mochilaNode = document.getElementById(`inv-mochila${i}-${npcId}`);
        if(mochilaNode) inv[`mochila${i}`] = mochilaNode.value;
    }

    await window.db.from('npc_activos').update({ inventario: inv }).eq('id', npcId);
    
    // Feedback visual verde
    const form = document.getElementById(`inv-pecho-${npcId}`) || document.getElementById(`inv-mochila1-${npcId}`);
    if(form) { form.style.borderColor = "#27ae60"; setTimeout(() => form.style.borderColor = "#ccc", 1000); }
}

async function modificarVidaNpc(id, hpActual, modificador) { let nuevoHp = Math.max(0, hpActual + modificador); await window.db.from('npc_activos').update({ hp_actual: nuevoHp }).eq('id', id); cargarTableroEnVivo(); }
async function eliminarDelTablero(id) { if(confirm("¿Quitar a este enemigo del tablero?")) { await window.db.from('npc_activos').delete().eq('id', id); cargarTableroEnVivo(); } }
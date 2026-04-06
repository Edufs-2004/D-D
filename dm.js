// dm.js

let campanaIdActual = null;
let statsItemActual = [{ stat: 'ataque', valor: 0 }];
let configMundo = { stats_activos: [], stats_custom: [], inventario: {}, tema: {} };

window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }
    const urlParams = new URLSearchParams(window.location.search);
    campanaIdActual = urlParams.get('id');
    if (!campanaIdActual) { window.location.href = "index.html"; return; }

    cargarDatosCampana(); cargarJugadores(); renderizarStatsItem(); cargarItemsForjados(); cargarBestiario(); cargarTableroEnVivo(); 
});

async function cargarDatosCampana() {
    const { data } = await window.db.from('historias').select('*').eq('id', campanaIdActual).single();
    if (data) { 
        document.getElementById('dm-campana-nombre').innerText = data.nombre; 
        document.getElementById('dm-campana-codigo').innerText = data.codigo_acceso; 
        if(document.getElementById('dm-lore')) document.getElementById('dm-lore').value = data.diario_lore || "";
        
        configMundo = data.config_mundo || { stats_activos: ["velocidad","ataque","defensa","ataque_magico","defensa_magica","inteligencia","destreza"], stats_custom: [], inventario: {pecho:true, mano1:true, mano2:true, mochila:5}, tema: {primario:"#2c3e50"} };
        document.getElementById('conf-color-1').value = configMundo.tema.primario || "#2c3e50";
        document.getElementById('dm-top-bar').style.backgroundColor = configMundo.tema.primario || "#f39c12";
        
        document.getElementById('conf-inv-pecho').checked = configMundo.inventario.pecho;
        document.getElementById('conf-inv-mano1').checked = configMundo.inventario.mano1;
        document.getElementById('conf-inv-mano2').checked = configMundo.inventario.mano2;
        document.getElementById('conf-inv-mochila').value = configMundo.inventario.mochila;

        const checks = document.querySelectorAll('.conf-stat-check');
        checks.forEach(chk => chk.checked = configMundo.stats_activos.includes(chk.value));
        
        renderizarStatsCustom();
        renderizarFormularioBestiario(); 
    }
}

// =========================================
// 2 Y 3: JUGADORES Y FORJA (INTACTOS)
// =========================================
async function cargarJugadores() { const listaJugadores = document.getElementById('lista-jugadores-dm'); const { data: jugadores } = await window.db.from('personajes').select('*').eq('historia_id', campanaIdActual); listaJugadores.innerHTML = ''; if (!jugadores || jugadores.length === 0) { listaJugadores.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aún no hay aventureros en esta campaña.</p>'; return; } jugadores.forEach(j => { const img = j.identidad.imgUrl || 'https://via.placeholder.com/50?text=?'; listaJugadores.innerHTML += `<div class="char-item" style="border-left: 4px solid #3498db; cursor: default;"><img src="${img}" alt="avatar"><div class="char-info" style="width: 100%;"><div style="display: flex; justify-content: space-between; align-items: center;"><h4 style="margin:2px 0;">${j.identidad.nombre || "Desconocido"}</h4><button class="btn btn-icon" style="color:#e74c3c; border:none; font-size:16px; background:transparent;" onclick="expulsarJugador('${j.id}', '${j.identidad.nombre}')" title="Expulsar de la campaña">👢</button></div><p style="color: #27ae60; font-weight:bold; margin-top:3px;">Nivel ${j.progreso.nivelPersonaje} | HP: ${j.progreso.hpActual}/${j.progreso.hpMax || j.progreso.hpActual} | MP: ${j.progreso.manaActual}</p></div></div>`; }); }
async function expulsarJugador(idPersonaje, nombre) { if(confirm(`¿Seguro que quieres expulsar a ${nombre}?`)) { await window.db.from('personajes').update({ historia_id: null }).eq('id', idPersonaje); cargarJugadores(); } }

function renderizarStatsItem() { const contenedor = document.getElementById('contenedor-stats-item'); contenedor.innerHTML = ''; statsItemActual.forEach((mod, index) => { contenedor.innerHTML += `<div style="display: flex; gap: 5px; margin-bottom: 5px;"><select onchange="actualizarStatItem(${index}, 'stat', this.value)" style="flex-grow: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px;"><option value="ataque" ${mod.stat === 'ataque' ? 'selected' : ''}>Ataque</option><option value="defensa" ${mod.stat === 'defensa' ? 'selected' : ''}>Defensa</option><option value="ataque_magico" ${mod.stat === 'ataque_magico' ? 'selected' : ''}>Ataq. Mágico</option><option value="defensa_magica" ${mod.stat === 'defensa_magica' ? 'selected' : ''}>Def. Mágica</option><option value="velocidad" ${mod.stat === 'velocidad' ? 'selected' : ''}>Velocidad</option><option value="inteligencia" ${mod.stat === 'inteligencia' ? 'selected' : ''}>Inteligencia</option><option value="vitalidad" ${mod.stat === 'vitalidad' ? 'selected' : ''}>Vitalidad Max</option><option value="destreza" ${mod.stat === 'destreza' ? 'selected' : ''}>Destreza</option></select><input type="number" value="${mod.valor}" oninput="actualizarStatItem(${index}, 'valor', this.value)" style="width: 60px; text-align: center; padding: 6px; border: 1px solid #ccc; border-radius: 4px;"><button class="btn btn-icon btn-red" onclick="eliminarStatItem(${index})">x</button></div>`; }); }
function agregarStatItem() { statsItemActual.push({ stat: 'ataque', valor: 0 }); renderizarStatsItem(); } function eliminarStatItem(index) { statsItemActual.splice(index, 1); renderizarStatsItem(); } function actualizarStatItem(index, clave, valor) { if (clave === 'valor') statsItemActual[index].valor = parseInt(valor) || 0; else statsItemActual[index].stat = valor; }
async function forjarItem() { const editId = document.getElementById('item-edit-id').value; const nombre = document.getElementById('nuevo-item-nombre').value.trim(); const tipo = document.getElementById('nuevo-item-tipo').value; if (!nombre) return; let bonusJson = {}; statsItemActual.forEach(mod => { if (mod.valor !== 0) bonusJson[mod.stat] = (bonusJson[mod.stat] || 0) + mod.valor; }); const payload = { historia_id: campanaIdActual, nombre: nombre, tipo: tipo, bonus: bonusJson }; if (editId) { await window.db.from('items').update(payload).eq('id', editId); } else { await window.db.from('items').insert([payload]); } cancelarEdicion(); cargarItemsForjados(); }
async function cargarItemsForjados() { const listaItems = document.getElementById('lista-items-dm'); const { data: items } = await window.db.from('items').select('*').eq('historia_id', campanaIdActual); listaItems.innerHTML = ''; if (!items || items.length === 0) { listaItems.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-size: 13px;">Nada forjado.</p>'; return; } items.forEach(item => { let statsString = ""; for (const [stat, valor] of Object.entries(item.bonus)) { const signo = valor >= 0 ? '+' : ''; const color = valor >= 0 ? '#27ae60' : '#e74c3c'; statsString += `<span style="color:${color}; margin-right:8px; font-weight:bold; font-size:11px;">${stat}:${signo}${valor}</span>`; } const itemDataString = encodeURIComponent(JSON.stringify(item)); listaItems.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; background: #ecf0f1; padding: 6px; border-radius: 4px; margin-bottom: 5px; border: 1px solid #bdc3c7;"><div style="display:flex; flex-direction:column; flex-grow:1;"><strong style="color:#2c3e50; font-size: 13px;">${item.nombre}</strong><div style="margin-top: 2px;">${statsString}</div></div><div style="display:flex; gap:5px;"><button class="btn btn-small btn-blue" onclick="editarItem('${itemDataString}')">✏️</button><button class="btn btn-small btn-red" onclick="borrarItem('${item.id}')">🗑️</button></div></li>`; }); }
function editarItem(itemDataString) { const item = JSON.parse(decodeURIComponent(itemDataString)); document.getElementById('item-edit-id').value = item.id; document.getElementById('nuevo-item-nombre').value = item.nombre; document.getElementById('nuevo-item-tipo').value = item.tipo; statsItemActual = []; for (const [stat, valor] of Object.entries(item.bonus)) { statsItemActual.push({ stat: stat, valor: valor }); } if(statsItemActual.length === 0) statsItemActual.push({ stat: 'ataque', valor: 0 }); renderizarStatsItem(); document.getElementById('btn-forjar').innerText = "💾 Cambios"; document.getElementById('btn-cancelar-edicion').classList.remove('hidden'); } function cancelarEdicion() { document.getElementById('item-edit-id').value = ""; document.getElementById('nuevo-item-nombre').value = ""; document.getElementById('nuevo-item-tipo').value = "arma"; statsItemActual = [{ stat: 'ataque', valor: 0 }]; renderizarStatsItem(); document.getElementById('btn-forjar').innerText = "🔨 Forjar"; document.getElementById('btn-cancelar-edicion').classList.add('hidden'); } async function borrarItem(id) { if(confirm("¿Borrar ítem?")) { await window.db.from('items').delete().eq('id', id); cargarItemsForjados(); } }

// =========================================
// 4. EL BESTIARIO DINÁMICO
// =========================================
function renderizarFormularioBestiario() {
    const contenedor = document.getElementById('creador-npc-stats-dinamicos');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const todosLosStats = [
        ...configMundo.stats_activos.map(s => ({id: s, nombre: s.substring(0,5).toUpperCase()})),
        ...configMundo.stats_custom.map(s => ({id: s.id, nombre: s.nombre.substring(0,5).toUpperCase()}))
    ];
    todosLosStats.forEach(st => {
        contenedor.innerHTML += `<div style="text-align: center;"><label style="font-size: 9px; font-weight: bold; color: #2980b9;">${st.nombre}</label><input type="number" id="npc-stat-${st.id}" value="1" style="width: 100%; text-align: center; border: 1px solid #ccc; border-radius: 4px; padding:4px;"></div>`;
    });
}

async function cargarBestiario() {
    const listaBestiario = document.getElementById('lista-bestiario-dm');
    const { data: { user } } = await window.db.auth.getUser();
    const { data: monstruos } = await window.db.from('bestiario').select('*').eq('dm_id', user.id);
    listaBestiario.innerHTML = '';
    if (!monstruos || monstruos.length === 0) return;

    const todosLosStats = [
        ...configMundo.stats_activos.map(s => ({id: s, nombre: s.substring(0,5).toUpperCase()})),
        ...configMundo.stats_custom.map(s => ({id: s.id, nombre: s.nombre.substring(0,5).toUpperCase()}))
    ];

    monstruos.forEach(m => {
        const jsonM = encodeURIComponent(JSON.stringify(m));
        const invConf = m.inventario_config || { pecho:true, mano1:true, mano2:true, mochila:0 };
        
        let htmlStatsEdit = '';
        todosLosStats.forEach(st => {
            const valor = m.stats_base[st.id] || 1;
            htmlStatsEdit += `<div style="text-align: center;"><label style="font-size: 9px; font-weight: bold;">${st.nombre}</label><input type="number" id="edit-stat-${m.id}-${st.id}" value="${valor}" style="width: 100%; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size:12px; padding:4px;"></div>`;
        });

        listaBestiario.innerHTML += `
            <li style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #bdc3c7; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
                    <strong style="color:#27ae60; font-size: 15px;">${m.nombre}</strong>
                    <div style="display:flex; gap: 5px;">
                        <button class="btn btn-small btn-blue" onclick="invocarAlTablero('${jsonM}')">⚔️ Invocar</button>
                        <button class="btn btn-small btn-red" onclick="borrarDelBestiario('${m.id}')">🗑️</button>
                    </div>
                </div>
                <details style="background: #fafafa; padding: 10px; border-radius: 6px; border: 1px solid #eee; margin-top:5px;">
                    <summary style="font-weight: bold; color: #7f8c8d; font-size:12px; cursor: pointer; outline: none;">✏️ Desglose y Configuración</summary>
                    <div style="margin-top: 10px;">
                        <label style="font-size: 10px; font-weight: bold; color: #c0392b;">VITALIDAD</label>
                        <input type="number" id="edit-vit-${m.id}" value="${m.stats_base.vitalidad || 1}" style="width: 100%; text-align: center; border: 1px solid #ccc; border-radius: 4px; padding: 6px; margin-bottom: 10px;">
                        <label style="font-size: 10px; font-weight: bold; color: #2c3e50;">Atributos</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(50px, 1fr)); gap: 4px; margin-bottom: 10px; background:#ecf0f1; padding:6px; border-radius:4px;">${htmlStatsEdit}</div>
                        <label style="font-size: 10px; font-weight: bold; color: #2980b9;">Equipamiento y Botín</label>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; background: #e8f4f8; padding: 8px; border-radius: 4px; margin-bottom: 10px;">
                            <label><input type="checkbox" id="edit-pecho-${m.id}" ${invConf.pecho ? 'checked' : ''}> Pecho</label>
                            <label><input type="checkbox" id="edit-mano1-${m.id}" ${invConf.mano1 ? 'checked' : ''}> Mano 1</label>
                            <label><input type="checkbox" id="edit-mano2-${m.id}" ${invConf.mano2 ? 'checked' : ''}> Mano 2</label>
                            <label>Slots Botín: <input type="number" id="edit-mochila-${m.id}" value="${invConf.mochila}" style="width: 40px; text-align: center;"></label>
                        </div>
                        <button class="btn btn-small btn-green w-100" onclick="guardarEdicionBestiario('${m.id}')">💾 Guardar Cambios</button>
                    </div>
                </details>
            </li>
        `;
    });
}

// NUEVO CÁLCULO DE VITALIDAD (Multiplicador directo x 5)
async function guardarEdicionBestiario(id) {
    const vit = parseInt(document.getElementById(`edit-vit-${id}`).value) || 1;
    const hpNuevo = Math.max(1, vit * 5); // Sin base 20
    
    const statsNuevos = { vitalidad: vit };
    const todosLosStats = [...configMundo.stats_activos, ...configMundo.stats_custom.map(s=>s.id)];
    todosLosStats.forEach(stId => {
        const input = document.getElementById(`edit-stat-${id}-${stId}`);
        if(input) statsNuevos[stId] = parseInt(input.value) || 1;
    });

    const invConfNuevo = { pecho: document.getElementById(`edit-pecho-${id}`).checked, mano1: document.getElementById(`edit-mano1-${id}`).checked, mano2: document.getElementById(`edit-mano2-${id}`).checked, mochila: parseInt(document.getElementById(`edit-mochila-${id}`).value) || 0 };
    await window.db.from('bestiario').update({ hp_max: hpNuevo, mana_max: hpNuevo, stats_base: statsNuevos, inventario_config: invConfNuevo }).eq('id', id);
    cargarBestiario();
}

async function guardarEnBestiario() {
    const nombre = document.getElementById('npc-nombre').value.trim();
    const vit = parseInt(document.getElementById('npc-vit').value) || 0;
    if (!nombre) { alert("Ponle nombre al monstruo."); return; }

    const hpM = Math.max(1, vit * 5); // Sin base 20
    const statsBase = { vitalidad: vit };
    
    const todosLosStats = [...configMundo.stats_activos, ...configMundo.stats_custom.map(s=>s.id)];
    todosLosStats.forEach(stId => {
        const input = document.getElementById(`npc-stat-${stId}`);
        if(input) statsBase[stId] = parseInt(input.value) || 1;
    });

    const invConfig = { pecho: document.getElementById('npc-has-pecho').checked, mano1: document.getElementById('npc-has-mano1').checked, mano2: document.getElementById('npc-has-mano2').checked, mochila: parseInt(document.getElementById('npc-mochila-slots').value) || 0 };
    const { data: { user } } = await window.db.auth.getUser();

    await window.db.from('bestiario').insert([ { dm_id: user.id, nombre: nombre, hp_max: hpM, mana_max: hpM, stats_base: statsBase, inventario_config: invConfig } ]);
    document.getElementById('npc-nombre').value = '';
    cargarBestiario();
}

async function borrarDelBestiario(id) { if(confirm("¿Eliminar criatura?")) { await window.db.from('bestiario').delete().eq('id', id); cargarBestiario(); } }

// =========================================
// 5. TABLERO EN VIVO (Actualizado con HP y MANÁ)
// =========================================
async function invocarAlTablero(jsonMonstruo) { 
    const plantilla = JSON.parse(decodeURIComponent(jsonMonstruo)); 
    const { data: existentes } = await window.db.from('npc_activos').select('nombre').eq('historia_id', campanaIdActual); 
    let cantidadClones = 0; 
    if (existentes) { cantidadClones = existentes.filter(n => n.nombre.startsWith(plantilla.nombre)).length; } 
    const nombreFinal = cantidadClones > 0 ? `${plantilla.nombre} ${cantidadClones + 1}` : plantilla.nombre; 
    
    const invConf = plantilla.inventario_config || { pecho:true, mano1:true, mano2:true, mochila:3 }; 
    const statsConf = plantilla.stats_base || { vitalidad:1 }; 
    const clon = { historia_id: campanaIdActual, nombre: nombreFinal, hp_max: plantilla.hp_max, hp_actual: plantilla.hp_max, mana_max: plantilla.mana_max, mana_actual: plantilla.mana_max, stats_actuales: statsConf, inventario_config: invConf, inventario: {} }; 
    
    await window.db.from('npc_activos').insert([clon]); 
    cargarTableroEnVivo(); 
}

async function cargarTableroEnVivo() { 
    const tablero = document.getElementById('lista-npcs-activos'); 
    const { data: activos } = await window.db.from('npc_activos').select('*').eq('historia_id', campanaIdActual).order('id'); 
    tablero.innerHTML = ''; 
    if (!activos || activos.length === 0) { tablero.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay enemigos en el tablero.</p>'; return; } 
    
    const todosLosStats = [
        ...configMundo.stats_activos.map(s => ({id: s, nombre: s.substring(0,5).toUpperCase()})),
        ...configMundo.stats_custom.map(s => ({id: s.id, nombre: s.nombre.substring(0,5).toUpperCase()}))
    ];

    activos.forEach(npc => { 
        const hpPct = Math.max(0, (npc.hp_actual / npc.hp_max) * 100); 
        const manaPct = Math.max(0, (npc.mana_actual / npc.mana_max) * 100); 
        let colorBarraHp = hpPct > 30 ? '#e74c3c' : '#c0392b'; 
        
        const stats = npc.stats_actuales || {}; 
        const invConf = npc.inventario_config || { pecho:true, mano1:true, mano2:true, mochila:0 }; 
        const inv = npc.inventario || {}; 
        
        let htmlInventario = ''; 
        if (invConf.pecho) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Pecho</label><input type="text" id="inv-pecho-${npc.id}" value="${inv.pecho||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`; 
        if (invConf.mano1) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Mano 1</label><input type="text" id="inv-mano1-${npc.id}" value="${inv.mano1||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`; 
        if (invConf.mano2) htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#7f8c8d; font-weight:bold;">Mano 2</label><input type="text" id="inv-mano2-${npc.id}" value="${inv.mano2||''}" onchange="guardarInvNpc('${npc.id}')" style="width:100%; padding:4px; font-size:12px; border:1px solid #ccc; border-radius:4px;"></div>`; 
        for (let i = 1; i <= (invConf.mochila || 0); i++) { htmlInventario += `<div style="margin-bottom:4px;"><label style="font-size:10px; color:#f39c12; font-weight:bold;">Botín ${i}</label><input type="text" id="inv-mochila${i}-${npc.id}" value="${inv['mochila'+i]||''}" onchange="guardarInvNpc('${npc.id}')" placeholder="Item a dropear" style="width:100%; padding:4px; font-size:12px; border:1px solid #f39c12; border-radius:4px;"></div>`; } 
        
        let htmlStatsTablero = `<span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#c0392b;">VIT:<br><span style="font-size:12px;">${stats.vitalidad||1}</span></span>`;
        todosLosStats.forEach(st => {
            htmlStatsTablero += `<span style="background:#ecf0f1; padding:4px; border-radius:4px; color:#2c3e50;">${st.nombre}:<br><span style="font-size:12px;">${stats[st.id]||1}</span></span>`;
        });

        tablero.innerHTML += `
        <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #bdc3c7; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <strong style="font-size: 15px; color:#c0392b;">${npc.nombre}</strong>
                <button class="btn btn-icon" style="background: transparent; color: #7f8c8d; border: none; font-size: 16px;" onclick="eliminarDelTablero('${npc.id}')" title="Quitar">💀</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                <span style="font-weight:bold; font-size: 12px; color: #e74c3c; width: 45px;">HP ${npc.hp_actual}</span>
                <div style="flex-grow: 1; height: 10px; background: #ecf0f1; border-radius: 5px; overflow: hidden; border: 1px solid #bdc3c7;">
                    <div style="height: 100%; width: ${hpPct}%; background-color: ${colorBarraHp}; transition: 0.3s;"></div>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="btn btn-small btn-red" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'hp', ${npc.hp_actual}, -5)">-5</button>
                    <button class="btn btn-small btn-red" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'hp', ${npc.hp_actual}, -1)">-1</button>
                    <button class="btn btn-small btn-green" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'hp', ${npc.hp_actual}, 1)">+1</button>
                    <button class="btn btn-small btn-green" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'hp', ${npc.hp_actual}, 5)">+5</button>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <span style="font-weight:bold; font-size: 12px; color: #3498db; width: 45px;">MP ${npc.mana_actual}</span>
                <div style="flex-grow: 1; height: 10px; background: #ecf0f1; border-radius: 5px; overflow: hidden; border: 1px solid #bdc3c7;">
                    <div style="height: 100%; width: ${manaPct}%; background-color: #3498db; transition: 0.3s;"></div>
                </div>
                <div style="display: flex; gap: 2px;">
                    <button class="btn btn-small btn-red" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'mana', ${npc.mana_actual}, -5)">-5</button>
                    <button class="btn btn-small btn-red" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'mana', ${npc.mana_actual}, -1)">-1</button>
                    <button class="btn btn-small btn-blue" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'mana', ${npc.mana_actual}, 1)">+1</button>
                    <button class="btn btn-small btn-blue" style="padding:2px 6px; font-size:11px;" onclick="modificarBarraNpc('${npc.id}', 'mana', ${npc.mana_actual}, 5)">+5</button>
                </div>
            </div>

            <details style="background: #fafafa; padding: 8px; border-radius: 6px; border: 1px solid #ddd;">
                <summary style="font-weight: bold; color: #2c3e50; font-size:13px; cursor: pointer; outline: none;">📊 Ver Stats y Botín</summary>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(40px, 1fr)); gap: 4px; text-align: center; font-size: 9px; font-weight: bold; margin-top: 10px; margin-bottom: 10px;">${htmlStatsTablero}</div>
                <div>${htmlInventario}</div>
            </details>
        </div>`; 
    }); 
}

// CONTROLADOR MAESTRO DE BARRAS EN VIVO (HP Y MANÁ)
async function modificarBarraNpc(id, tipo, actual, modificador) { 
    let nuevoVal = Math.max(0, actual + modificador); 
    if (tipo === 'hp') {
        await window.db.from('npc_activos').update({ hp_actual: nuevoVal }).eq('id', id); 
    } else {
        await window.db.from('npc_activos').update({ mana_actual: nuevoVal }).eq('id', id); 
    }
    cargarTableroEnVivo(); 
}

async function guardarInvNpc(npcId) { const pechoNode = document.getElementById(`inv-pecho-${npcId}`); const mano1Node = document.getElementById(`inv-mano1-${npcId}`); const mano2Node = document.getElementById(`inv-mano2-${npcId}`); let inv = {}; if(pechoNode) inv.pecho = pechoNode.value; if(mano1Node) inv.mano1 = mano1Node.value; if(mano2Node) inv.mano2 = mano2Node.value; for(let i=1; i<=5; i++) { let mochilaNode = document.getElementById(`inv-mochila${i}-${npcId}`); if(mochilaNode) inv[`mochila${i}`] = mochilaNode.value; } await window.db.from('npc_activos').update({ inventario: inv }).eq('id', npcId); const form = document.getElementById(`inv-pecho-${npcId}`) || document.getElementById(`inv-mochila1-${npcId}`); if(form) { form.style.borderColor = "#27ae60"; setTimeout(() => form.style.borderColor = "#ccc", 1000); } }
async function eliminarDelTablero(id) { if(confirm("¿Quitar a este enemigo del tablero?")) { await window.db.from('npc_activos').delete().eq('id', id); cargarTableroEnVivo(); } }
async function guardarLore() { const textoLore = document.getElementById('dm-lore').value; const boton = document.querySelector('button[onclick="guardarLore()"]'); boton.innerText = "⏳ Guardando..."; boton.disabled = true; const { error } = await window.db.from('historias').update({ diario_lore: textoLore }).eq('id', campanaIdActual); if(!error) { boton.style.backgroundColor = "#27ae60"; boton.innerText = "✅ ¡Guardado!"; setTimeout(() => { boton.style.backgroundColor = "#f39c12"; boton.innerText = "📢 Guardar Diario"; boton.disabled = false; }, 2000); } }

// =========================================
// 6. EL MODO DIOS (Configuración del Mundo)
// =========================================

function agregarStatCustom() {
    const nombre = document.getElementById('nuevo-stat-nombre').value.trim().toUpperCase();
    if(!nombre) return;
    
    const idSecreto = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
    configMundo.stats_custom.push({ id: idSecreto, nombre: nombre });
    
    document.getElementById('nuevo-stat-nombre').value = "";
    renderizarStatsCustom();
    renderizarFormularioBestiario(); 
}

function renderizarStatsCustom() {
    const lista = document.getElementById('lista-stats-custom');
    lista.innerHTML = "";
    configMundo.stats_custom.forEach((st, idx) => {
        lista.innerHTML += `
            <li style="background: #fdfbfd; padding: 6px 10px; border: 1px solid #e8daef; border-radius: 4px; margin-bottom: 5px; display: flex; justify-content: space-between;">
                <span><strong>${st.nombre}</strong> (Reglas nativas de app.js)</span>
                <button class="btn btn-icon btn-red" style="padding: 2px 6px;" onclick="eliminarStatCustom(${idx})">x</button>
            </li>
        `;
    });
}

function eliminarStatCustom(idx) {
    configMundo.stats_custom.splice(idx, 1);
    renderizarStatsCustom();
    renderizarFormularioBestiario();
}

async function publicarConfiguracionMundo() {
    configMundo.tema.primario = document.getElementById('conf-color-1').value;
    configMundo.inventario.pecho = document.getElementById('conf-inv-pecho').checked;
    configMundo.inventario.mano1 = document.getElementById('conf-inv-mano1').checked;
    configMundo.inventario.mano2 = document.getElementById('conf-inv-mano2').checked;
    configMundo.inventario.mochila = parseInt(document.getElementById('conf-inv-mochila').value) || 5;

    configMundo.stats_activos = [];
    document.querySelectorAll('.conf-stat-check:checked').forEach(chk => {
        configMundo.stats_activos.push(chk.value);
    });

    const tituloParche = document.getElementById('patch-nombre').value.trim() || "Actualización del Mundo";
    const { data: historia } = await window.db.from('historias').select('patch_notes').eq('id', campanaIdActual).single();
    let historial = historia.patch_notes || [];
    
    const nuevoParche = {
        fecha: new Date().toLocaleDateString(),
        titulo: tituloParche,
        descripcion: `Reglas de mundo actualizadas. Color: ${configMundo.tema.primario}, Mochila: ${configMundo.inventario.mochila} slots.`
    };
    historial.unshift(nuevoParche);

    const { error } = await window.db.from('historias').update({ 
        config_mundo: configMundo,
        patch_notes: historial
    }).eq('id', campanaIdActual);

    if(!error) {
        document.getElementById('patch-nombre').value = "";
        alert("🌍 ¡EL MUNDO HA SIDO REFORJADO Y EL PARCHE HA SIDO PUBLICADO!");
        document.getElementById('dm-top-bar').style.backgroundColor = configMundo.tema.primario;
        cargarBestiario(); 
        cargarTableroEnVivo(); 
    } else {
        alert("Error al publicar los cambios.");
    }
}
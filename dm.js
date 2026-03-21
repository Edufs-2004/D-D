// dm.js

let campanaIdActual = null;

// 1. GUARDIA DE SEGURIDAD E INICIALIZACIÓN
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return; 
    }

    // Cazamos el ID de la campaña desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    campanaIdActual = urlParams.get('id');

    if (!campanaIdActual) {
        alert("Error: No se especificó ninguna campaña.");
        window.location.href = "index.html";
        return;
    }

    cargarDatosCampana();
    cargarJugadores();
    cargarItemsForjados();
});

// 2. CARGAR DATOS DE LA CAMPAÑA
async function cargarDatosCampana() {
    const { data, error } = await window.db
        .from('historias')
        .select('*')
        .eq('id', campanaIdActual)
        .single();

    if (error || !data) {
        alert("Error al cargar la historia.");
        return;
    }

    document.getElementById('dm-campana-nombre').innerText = data.nombre;
    document.getElementById('dm-campana-codigo').innerText = data.codigo_acceso;
}

// 3. CARGAR JUGADORES DE LA CAMPAÑA
async function cargarJugadores() {
    const listaJugadores = document.getElementById('lista-jugadores-dm');
    
    // Buscamos personajes que tengan el historia_id de esta campaña
    const { data: jugadores, error } = await window.db
        .from('personajes')
        .select('*')
        .eq('historia_id', campanaIdActual);

    if (error) {
        listaJugadores.innerHTML = '<p style="color:red; text-align:center;">Error al buscar jugadores.</p>';
        return;
    }

    listaJugadores.innerHTML = '';

    if (jugadores.length === 0) {
        listaJugadores.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aún no hay aventureros en esta campaña. ¡Pásales tu código secreto!</p>';
        return;
    }

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

// 4. FORJAR NUEVOS ÍTEMS EN SUPABASE
async function forjarItem() {
    const nombre = document.getElementById('nuevo-item-nombre').value.trim();
    const tipo = document.getElementById('nuevo-item-tipo').value;
    const stat = document.getElementById('nuevo-item-stat').value;
    const valor = parseInt(document.getElementById('nuevo-item-valor').value);

    if (!nombre) { alert("Ponle un nombre al ítem."); return; }
    if (isNaN(valor)) { alert("Debes ingresar un valor numérico para el bonus."); return; }

    // Construimos el JSON del bonus (Ej: {"ataque": 5})
    let bonusJson = {};
    bonusJson[stat] = valor;

    const payload = {
        historia_id: campanaIdActual,
        nombre: nombre,
        tipo: tipo,
        bonus: bonusJson
    };

    const { error } = await window.db.from('items').insert([payload]);

    if (error) {
        alert("Error al forjar el ítem en la nube.");
        console.error(error);
    } else {
        // Limpiamos formulario y recargamos la lista
        document.getElementById('nuevo-item-nombre').value = "";
        document.getElementById('nuevo-item-valor').value = "";
        cargarItemsForjados();
    }
}

// 5. MOSTRAR ÍTEMS FORJADOS
async function cargarItemsForjados() {
    const listaItems = document.getElementById('lista-items-dm');

    const { data: items, error } = await window.db
        .from('items')
        .select('*')
        .eq('historia_id', campanaIdActual);

    if (error) return;

    listaItems.innerHTML = '';

    if (items.length === 0) {
        listaItems.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-size: 13px;">Aún no has forjado nada.</p>';
        return;
    }

    items.forEach(item => {
        // Extraemos la llave y el valor del JSON del bonus
        const statName = Object.keys(item.bonus)[0];
        const statValue = item.bonus[statName];
        const signo = statValue >= 0 ? '+' : '';

        listaItems.innerHTML += `
            <li style="display:flex; justify-content:space-between; background: #ecf0f1; padding: 8px; border-radius: 4px; margin-bottom: 5px;">
                <div style="display:flex; flex-direction:column;">
                    <strong style="color:#2c3e50; font-size: 14px;">${item.nombre}</strong>
                    <span style="font-size: 11px; color: #7f8c8d; text-transform: uppercase;">${item.tipo}</span>
                </div>
                <div style="font-weight: bold; color: #8e44ad; font-size: 14px;">
                    ${statName}: ${signo}${statValue}
                </div>
            </li>
        `;
    });
}
// lobby.js

// =========================================
// 1. GUARDIA DE SEGURIDAD E INICIALIZACIÓN
// =========================================
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return; 
    }
    
    // Cargamos ambas columnas al mismo tiempo
    renderizarLobby(); 
    renderizarHistoriasDM(); 
});

// =========================================
// 2. COLUMNA IZQUIERDA: JUGADOR
// =========================================
async function renderizarLobby() {
    const listaLobby = document.getElementById('lista-personajes-lobby');
    listaLobby.innerHTML = '<p style="text-align:center;">Conectando con el servidor...</p>';

    const { data: { user } } = await window.db.auth.getUser();
    
    // Pedimos los personajes y el nombre de su historia a Supabase
    const { data: personajesGuardados, error } = await window.db
        .from('personajes')
        .select('*, historias(nombre)')
        .eq('user_id', user.id);

    if (error) {
        listaLobby.innerHTML = '<p style="color:red; text-align:center;">Error de conexión.</p>';
        console.error(error);
        return;
    }

    listaLobby.innerHTML = '';

    if (personajesGuardados.length === 0) {
        listaLobby.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No tienes personajes creados.</p>';
        return;
    }

    // Dividimos los personajes: Los que tienen campaña y los libres
    const personajesEnCampana = personajesGuardados.filter(p => p.historia_id !== null);
    const personajesLibres = personajesGuardados.filter(p => p.historia_id === null);

    // Dibujamos los que están dentro de una Campaña
    if (personajesEnCampana.length > 0) {
        personajesEnCampana.forEach(p => {
            const img = p.identidad.imgUrl || 'https://via.placeholder.com/150?text=Retrato';
            const clase = p.identidad.clase || 'Aventurero';
            const nombreCampana = p.historias ? p.historias.nombre : "Campaña Desconocida";
            
            listaLobby.innerHTML += `
                <div class="char-item" style="border-left: 4px solid #3498db;" onclick="window.location.href='personaje.html?id=${p.id}'">
                    <img src="${img}" alt="avatar">
                    <div class="char-info" style="width: 100%;">
                        <p style="margin:0; font-size:10px; color:#3498db; font-weight:bold; text-transform:uppercase;">🛡️ ${nombreCampana}</p>
                        <h4 style="margin:2px 0;">${p.identidad.nombre || "Desconocido"}</h4>
                        <p>Nivel ${p.progreso.nivelPersonaje} | ${clase}</p>
                    </div>
                </div>
            `;
        });
    }

    // Dibujamos los que están Libres
    if (personajesLibres.length > 0) {
        listaLobby.innerHTML += `<h4 style="margin:15px 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase;">Libres (Sin Campaña)</h4>`;
        personajesLibres.forEach(p => {
            const img = p.identidad.imgUrl || 'https://via.placeholder.com/150?text=Retrato';
            const clase = p.identidad.clase || 'Aventurero';
            
            listaLobby.innerHTML += `
                <div class="char-item" onclick="window.location.href='personaje.html?id=${p.id}'">
                    <img src="${img}" alt="avatar">
                    <div class="char-info">
                        <h4 style="margin:2px 0;">${p.identidad.nombre || "Desconocido"}</h4>
                        <p>Nivel ${p.progreso.nivelPersonaje} | ${clase}</p>
                    </div>
                </div>
            `;
        });
    }
}

function crearNuevoPersonajeLobby() {
    window.location.href = 'personaje.html';
}

async function unirseAHistoriaPrompt() {
    const codigo = prompt("Ingresa el código secreto de la campaña:");
    if (!codigo || codigo.trim() === "") return;

    const codigoLimpio = codigo.trim().toUpperCase();

    // Buscar en la Nube si existe una historia con ese código
    const { data: historia, error } = await window.db
        .from('historias')
        .select('id, nombre')
        .eq('codigo_acceso', codigoLimpio)
        .single();

    if (error || !historia) {
        alert("❌ No se encontró ninguna campaña con ese código. Verifica si tiene mayúsculas/números e intenta de nuevo.");
        return;
    }

    // Si la encontró, confirmamos y lo mandamos a crear la ficha
    const confirmar = confirm(`¡Campaña encontrada: "${historia.nombre}"! 🐉\n\n¿Quieres crear tu personaje para esta aventura ahora mismo?`);
    
    if (confirmar) {
        window.location.href = `personaje.html?nueva_historia_id=${historia.id}`;
    }
}

// =========================================
// 3. COLUMNA DERECHA: DUNGEON MASTER
// =========================================
async function renderizarHistoriasDM() {
    const listaHistorias = document.getElementById('lista-historias-lobby');
    listaHistorias.innerHTML = '<p style="text-align:center;">Cargando campañas...</p>';
    
    const { data: { user } } = await window.db.auth.getUser();
    
    // Le pedimos a Supabase las historias donde YO soy el DM
    const { data: historias, error } = await window.db
        .from('historias')
        .select('*')
        .eq('dm_id', user.id);

    if (error) {
        listaHistorias.innerHTML = '<p style="color:red; text-align:center;">Error al cargar historias.</p>';
        return;
    }

    listaHistorias.innerHTML = '';

    if (historias.length === 0) {
        listaHistorias.innerHTML = '<p style="text-align:center; color:#7f8c8d; font-style: italic; padding: 20px 0;">No has creado ninguna campaña épica aún.</p>';
        return;
    }

    // Dibujamos cada historia con su código secreto
    historias.forEach(h => {
        listaHistorias.innerHTML += `
            <div class="char-item" style="border-left: 4px solid #f39c12;" onclick="window.location.href='panel-dm.html?id=${h.id}'">
                <div class="char-info" style="width: 100%;">
                    <h4 style="color: #2c3e50; font-size: 16px; margin-bottom: 8px;">🏰 ${h.nombre}</h4>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 6px 10px; border-radius: 4px; border: 1px dashed #bdc3c7;">
                        <span style="font-family: monospace; font-size: 14px; font-weight: bold; color: #e74c3c;">${h.codigo_acceso}</span>
                        <button class="btn btn-small" style="background: #ecf0f1; color: #333; padding: 2px 8px; font-size: 12px; border: 1px solid #bdc3c7;" 
                                onclick="event.stopPropagation(); navigator.clipboard.writeText('${h.codigo_acceso}'); alert('¡Código ${h.codigo_acceso} copiado al portapapeles!');">
                            📋 Copiar
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

async function crearNuevaHistoria() {
    const nombreHistoria = prompt("Ingresa el nombre de tu nueva campaña épica:");
    if (!nombreHistoria || nombreHistoria.trim() === "") return;

    // Generar código secreto de 6 caracteres
    const codigoSecreto = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: { user } } = await window.db.auth.getUser();

    const { error } = await window.db.from('historias').insert([
        { nombre: nombreHistoria.trim(), codigo_acceso: codigoSecreto, dm_id: user.id }
    ]);

    if (error) {
        alert("Error al crear la historia en la nube.");
        console.error(error);
    } else {
        alert(`¡Campaña "${nombreHistoria}" creada con éxito!\nTu código secreto de invitación es: ${codigoSecreto}`);
        renderizarHistoriasDM(); 
    }
}

// =========================================
// 4. UTILIDADES
// =========================================
async function cerrarSesion() {
    await window.db.auth.signOut();
    window.location.href = 'login.html';
}
// lobby.js

// 1. Guardia de Seguridad del Portal
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return; 
    }
    
    // Ahora cargamos ambas columnas simultáneamente
    renderizarLobby(); 
    renderizarHistoriasDM(); 
});

// =========================================
// COLUMNA IZQUIERDA: JUGADOR
// =========================================
async function renderizarLobby() {
    const listaLobby = document.getElementById('lista-personajes-lobby');
    listaLobby.innerHTML = '<p style="text-align:center;">Conectando con el servidor...</p>';

    const { data: { user } } = await window.db.auth.getUser();
    
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

    listaLobby.innerHTML += `<h4 style="margin:5px 0; color:#7f8c8d;">Personajes Libres (Sin Campaña)</h4>`;

    personajesGuardados.forEach(p => {
        const img = p.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
        const clase = p.identidad.clase || 'Aventurero';
        
        listaLobby.innerHTML += `
            <div class="char-item" onclick="window.location.href='personaje.html?id=${p.id}'">
                <img src="${img}" alt="avatar">
                <div class="char-info">
                    <h4>${p.identidad.nombre || "Desconocido"}</h4>
                    <p>Nivel ${p.progreso.nivelPersonaje} | ${clase}</p>
                </div>
            </div>
        `;
    });
}

function crearNuevoPersonajeLobby() {
    window.location.href = 'personaje.html';
}

// =========================================
// COLUMNA DERECHA: DUNGEON MASTER
// =========================================

// Dibujar las campañas que he creado
async function renderizarHistoriasDM() {
    const listaHistorias = document.getElementById('lista-historias-lobby');
    
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
            <div class="char-item" style="border-left: 4px solid #f39c12;" onclick="alert('Próximamente: Entrar al Panel de DM de ${h.nombre}')">
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

// Crear una nueva campaña en la base de datos
async function crearNuevaHistoria() {
    const nombreHistoria = prompt("Ingresa el nombre de tu nueva campaña épica:");
    if (!nombreHistoria || nombreHistoria.trim() === "") return;

    // Generar un código secreto aleatorio de 6 caracteres (letras y números)
    const codigoSecreto = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: { user } } = await window.db.auth.getUser();

    // Insertar en la tabla 'historias'
    const { error } = await window.db.from('historias').insert([
        { 
            nombre: nombreHistoria.trim(), 
            codigo_acceso: codigoSecreto, 
            dm_id: user.id 
        }
    ]);

    if (error) {
        alert("Error al crear la historia en la nube.");
        console.error(error);
    } else {
        alert(`¡Campaña "${nombreHistoria}" creada con éxito!\nTu código secreto de invitación es: ${codigoSecreto}`);
        renderizarHistoriasDM(); // Recargamos la lista visualmente
    }
}

// =========================================
// UTILIDADES
// =========================================
async function cerrarSesion() {
    await window.db.auth.signOut();
    window.location.href = 'login.html';
}
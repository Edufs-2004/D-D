// lobby.js

// 1. Guardia de Seguridad del Portal
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return; 
    }
    renderizarLobby(); 
});

// 2. Descargar personajes del usuario
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
    // Si creamos nuevo, viajamos a la hoja pero SIN pasarle ID
    window.location.href = 'personaje.html';
}

async function cerrarSesion() {
    await window.db.auth.signOut();
    window.location.href = 'login.html';
}
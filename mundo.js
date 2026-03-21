// mundo.js

let campanaIdActual = null;

window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    campanaIdActual = urlParams.get('id');

    if (!campanaIdActual) { window.location.href = "index.html"; return; }

    cargarDatosHistoria();
    cargarPersonajesGrupo();
});

// 1. Cargar el Lore y el Título
async function cargarDatosHistoria() {
    const { data, error } = await window.db.from('historias').select('*').eq('id', campanaIdActual).single();
    if (error || !data) return;

    document.getElementById('mundo-campana-nombre').innerText = data.nombre;
    
    const cajaLore = document.getElementById('mundo-lore-display');
    if (data.diario_lore && data.diario_lore.trim() !== "") {
        cajaLore.innerText = data.diario_lore;
    }
}

// 2. Cargar mis personajes y los de los demás
async function cargarPersonajesGrupo() {
    const listaMios = document.getElementById('lista-mis-personajes');
    const listaCompaneros = document.getElementById('lista-companeros');
    
    const { data: { user } } = await window.db.auth.getUser();

    // Buscamos TODOS los personajes unidos a esta campaña
    const { data: personajes, error } = await window.db.from('personajes').select('*').eq('historia_id', campanaIdActual);
    
    if (error) return;

    listaMios.innerHTML = '';
    listaCompaneros.innerHTML = '';

    const misPersonajes = personajes.filter(p => p.user_id === user.id);
    const companeros = personajes.filter(p => p.user_id !== user.id);

    // Dibujar mis personajes
    if (misPersonajes.length === 0) {
        listaMios.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">No tienes personajes en esta historia.</p>';
    } else {
        misPersonajes.forEach(p => {
            const img = p.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
            listaMios.innerHTML += `
                <div class="char-item" style="border-left: 4px solid #27ae60;" onclick="window.location.href='personaje.html?id=${p.id}'">
                    <img src="${img}" alt="avatar">
                    <div class="char-info" style="width: 100%;">
                        <h4 style="margin:2px 0;">${p.identidad.nombre || "Desconocido"}</h4>
                        <p style="color: #27ae60; font-weight:bold; margin-top:3px;">
                            Nivel ${p.progreso.nivelPersonaje} | ${p.identidad.clase || 'Aventurero'}
                        </p>
                    </div>
                </div>
            `;
        });
    }

    // Dibujar los compañeros
    if (companeros.length === 0) {
        listaCompaneros.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">Aún no hay más aventureros unidos.</p>';
    } else {
        companeros.forEach(p => {
            const img = p.identidad.imgUrl || 'https://via.placeholder.com/50?text=?';
            listaCompaneros.innerHTML += `
                <div class="char-item" style="border-left: 4px solid #3498db; cursor: default;">
                    <img src="${img}" alt="avatar">
                    <div class="char-info" style="width: 100%;">
                        <h4 style="margin:2px 0;">${p.identidad.nombre || "Desconocido"}</h4>
                        <p style="color: #3498db; font-weight:bold; margin-top:3px;">
                            Nivel ${p.progreso.nivelPersonaje} | ${p.identidad.clase || 'Aventurero'}
                        </p>
                    </div>
                </div>
            `;
        });
    }
}

// Botón para crear un personaje atado a esta campaña desde este panel
function crearPersonajeParaCampaña() {
    window.location.href = `personaje.html?nueva_historia_id=${campanaIdActual}`;
}
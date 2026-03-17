// Función principal de navegación
function mostrarSeccion(id, btn) {

    // 1. Ocultar todas las secciones
    const secciones = document.querySelectorAll('.seccion');
    secciones.forEach(function(seccion) {
        seccion.classList.remove('visible');
    });

    // 2. Quitar clase activo de todos los botones
    const botones = document.querySelectorAll('nav button');
    botones.forEach(function(boton) {
        boton.classList.remove('activo');
    });

    // 3. Mostrar solo la sección pedida
    document.getElementById(id).classList.add('visible');

    // 4. Marcar el botón como activo
    btn.classList.add('activo');
}






// ══════════════════════════════════════
// LECTOR DE RECIBO CFE
// Dependencias: PDF.js, Chart.js
// ══════════════════════════════════════

// ── CONFIGURACIÓN ──
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let graficaInstancia = null;

// ── ELEMENTOS DEL DOM ──
const inputArchivo   = document.getElementById('inputArchivo');
const zonaCarga      = document.getElementById('zonaCarga');
const btnSeleccionar = document.getElementById('btnSeleccionar');

// ── EVENTO BOTÓN ──
btnSeleccionar.addEventListener('click', e => {
    e.stopPropagation();
    inputArchivo.click();
});

// ── EVENTO INPUT FILE ──
inputArchivo.addEventListener('change', e => {
    if (e.target.files[0]) procesarPDF(e.target.files[0]);
});

// ── EVENTOS DRAG AND DROP ──
zonaCarga.addEventListener('dragover', e => {
    e.preventDefault();
    zonaCarga.classList.add('arrastrando');
});
zonaCarga.addEventListener('dragleave', () => {
    zonaCarga.classList.remove('arrastrando');
});
zonaCarga.addEventListener('drop', e => {
    e.preventDefault();
    zonaCarga.classList.remove('arrastrando');
    const archivo = e.dataTransfer.files[0];
    if (archivo && archivo.type === 'application/pdf') procesarPDF(archivo);
});

// ══════════════════════════════════════
// PROCESAR PDF
// ══════════════════════════════════════
async function procesarPDF(archivo) {
    limpiarDatos();
    zonaCarga.style.display = 'none';
    document.getElementById('cargando').style.display = 'block';

    try {
        const arrayBuffer = await archivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let textoCompleto = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const pagina    = await pdf.getPage(i);
            const contenido = await pagina.getTextContent();
            const items     = contenido.items;

            // Ordenar por posición en la página (arriba a abajo, izquierda a derecha)
            items.sort((a, b) => {
                const diffY = Math.round(b.transform[5]) - Math.round(a.transform[5]);
                return diffY !== 0 ? diffY : a.transform[4] - b.transform[4];
            });

            textoCompleto += items.map(item => item.str).join(' ') + '\n';
        }

        // Mostrar texto en caja debug
        document.getElementById('textoDebug').value       = textoCompleto;
        document.getElementById('debugCard').style.display = 'block';

        const datos = extraerDatos(textoCompleto);
        mostrarResultados(datos);

    } catch (err) {
        console.error('Error al procesar PDF:', err);
        document.getElementById('alertaError').style.display = 'block';
        zonaCarga.style.display = 'block';
    } finally {
        document.getElementById('cargando').style.display = 'none';
    }
}

// ══════════════════════════════════════
// EXTRAER DATOS DEL TEXTO
// ══════════════════════════════════════
function extraerDatos(texto) {
    const datos = {
        nombre: '', total: '', fechaLimite: '',
        kwh: '', periodo: '', noServicio: '', historial: []
    };

    // ── NOMBRE ──
    // Busca línea con 2+ palabras en mayúsculas (tolerante a OCR distorsionado)
    const lineas = texto.split('\n');
    for (const linea of lineas) {
        const l = linea.trim();
        if (l.length < 6) continue;
        if (/^[A-ZÁÉÍÓÚÑ•\u00C0-\u00FF\s«`~\-]{6,}$/.test(l) &&
            l.split(/\s+/).length >= 2 &&
            !/\d{4,}/.test(l)) {
            datos.nombre = l.replace(/[•·«`~]/g, '').replace(/\s+/g, ' ').trim();
            if (datos.nombre.length > 5) break;
        }
    }

    // ── TOTAL A PAGAR ──
    // Busca $ seguido de 3-6 dígitos
    const mTotal = texto.match(/\$\s*(\d{3,6}(?:[.,]\d{2})?)/);
    if (mTotal) datos.total = '$' + mTotal[1];

    // ── NO. DE SERVICIO ──
    // Busca bloque de 9-15 dígitos (acepta l/I como 1 por distorsión OCR)
    const mServ = texto.match(/(?:[Nn][Oo]\.?\s*\w*\s*)([lI1][0-9lI1]{8,14})/);
    if (mServ) {
        datos.noServicio = mServ[1].replace(/[lI]/g, '1');
    } else {
        const mBloque = texto.match(/\b([0-9lI]{9,15})\b/);
        if (mBloque) datos.noServicio = mBloque[1].replace(/[lI]/g, '1');
    }

    // ── LÍMITE DE PAGO ──
    // Busca fecha DD MMM AA cerca de palabras clave
    const mFecha = texto.match(
        /(?:L[IÍ1]M[I1]TE|NAIODO|PAC[^\s]{0,10})\s+[^\d]{0,15}(\d{1,2}[\s\/\-]+[A-Za-z]{3,}[\s\/\-]+\d{2,4})/i
    );
    if (mFecha) {
        datos.fechaLimite = mFecha[1].trim();
    } else {
        const m2 = texto.match(
            /\b(\d{2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(\d{2,4})\b/i
        );
        if (m2) datos.fechaLimite = `${m2[1]} ${m2[2].toUpperCase()} ${m2[3]}`;
    }

    // ── PERIODO FACTURADO ──
    // Busca dos fechas tipo "22 OCT 25 - 22 DIC 25"
    const mPer = texto.match(
        /(\d{1,2}\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{2})[\s\-n]+(\d{1,2}\s+(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{2})/i
    );
    if (mPer) {
        datos.periodo = `${mPer[1].trim()} - ${mPer[2].trim()}`;
    } else {
        const m2 = texto.match(
            /((?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{2})[\s\-n]+((?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{2})/i
        );
        if (m2) datos.periodo = `${m2[1].trim()} - ${m2[2].trim()}`;
    }

    // ── kWh ──
    const mKwh = texto.match(/(\d{2,4})\s*(?:kWh|KWH)|(?:kWh|KWH)[^\d]*(\d{2,4})/i);
    if (mKwh) datos.kwh = mKwh[1] || mKwh[2];

    // ── HISTORIAL ──
    // Patrón CFE: "del DD MMM AA al DD MMM AA  NNN  $NNN"
    const regH = /del?\s+(\d{1,2}\s+[A-Za-z]{3}\.?\s*\d{2})\s+al?\s+(\d{1,2}\s+[A-Za-z]{3}\.?\s*\d{2})\s+(\d{2,4})\s+\$?([\d,]+(?:\.\d{2})?)/gi;
    let mH;
    while ((mH = regH.exec(texto)) !== null) {
        datos.historial.push({
            periodo: `${mH[1].trim()} - ${mH[2].trim()}`,
            kwh:     parseInt(mH[3]),
            importe: '$' + mH[4]
        });
    }

    // Fallback — si no encontró historial usa datos actuales
    if (datos.historial.length === 0 && datos.kwh) {
        datos.historial = [{
            periodo: datos.periodo || 'Periodo actual',
            kwh:     parseInt(datos.kwh) || 0,
            importe: datos.total || '$0'
        }];
    }

    return datos;
}

// ══════════════════════════════════════
// MOSTRAR RESULTADOS EN PANTALLA
// ══════════════════════════════════════
function mostrarResultados(datos) {
    document.getElementById('datNombre').textContent   = datos.nombre      || 'No encontrado';
    document.getElementById('datTotal').textContent    = datos.total       || 'No encontrado';
    document.getElementById('datFecha').textContent    = datos.fechaLimite || 'No encontrado';
    document.getElementById('datKwh').textContent      = datos.kwh ? datos.kwh + ' kWh' : 'No encontrado';
    document.getElementById('datPeriodo').textContent  = datos.periodo     || 'No encontrado';
    document.getElementById('datServicio').textContent = datos.noServicio  || 'No encontrado';

    // Llenar tabla historial
    const tbody = document.getElementById('tablaHistorial');
    tbody.innerHTML = '';
    if (datos.historial.length > 0) {
        datos.historial.forEach((fila, i) => {
            const tr = document.createElement('tr');
            if (i === 0) tr.classList.add('fila-actual');
            tr.innerHTML = `
                <td>${fila.periodo}</td>
                <td>${fila.kwh} kWh</td>
                <td>${fila.importe}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="3" style="color:#888;text-align:center;">No se encontró historial</td></tr>';
    }

    construirGrafica(datos.historial);
    document.getElementById('resultado').style.display = 'block';
}

// ══════════════════════════════════════
// CONSTRUIR GRÁFICA DE CONSUMO
// ══════════════════════════════════════
function construirGrafica(historial) {
    if (graficaInstancia) { graficaInstancia.destroy(); graficaInstancia = null; }

    const ctx       = document.getElementById('graficaConsumo').getContext('2d');
    const etiquetas = historial.map(h => h.periodo);
    const valores   = historial.map(h => h.kwh);
    const promedio  = valores.length > 0
        ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
        : 0;

    graficaInstancia = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'Consumo (kWh)',
                    data: valores,
                    backgroundColor: valores.map((v, i) => i === 0 ? '#1e40af' : '#93c5fd'),
                    borderRadius: 6,
                    borderSkipped: false,
                },
                {
                    label: `Promedio: ${promedio} kWh`,
                    data: new Array(valores.length).fill(promedio),
                    type: 'line',
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} kWh`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'kWh' } },
                x: { ticks: { maxRotation: 45 } }
            }
        }
    });
}

// ══════════════════════════════════════
// LIMPIAR Y REINICIAR
// ══════════════════════════════════════
function limpiarDatos() {
    document.getElementById('datNombre').textContent    = '—';
    document.getElementById('datTotal').textContent     = '—';
    document.getElementById('datFecha').textContent     = '—';
    document.getElementById('datKwh').textContent       = '—';
    document.getElementById('datPeriodo').textContent   = '—';
    document.getElementById('datServicio').textContent  = '—';
    document.getElementById('tablaHistorial').innerHTML = '';
    document.getElementById('resultado').style.display  = 'none';
    document.getElementById('alertaError').style.display = 'none';
    document.getElementById('debugCard').style.display   = 'none';
    if (graficaInstancia) { graficaInstancia.destroy(); graficaInstancia = null; }
}

function reiniciar() {
    limpiarDatos();
    document.getElementById('zonaCarga').style.display = 'block';
    document.getElementById('inputArchivo').value = '';
}
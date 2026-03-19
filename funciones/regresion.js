// ══════════════════════════════════════
// REGRESIÓN LINEAL — Mínimos cuadrados
// ══════════════════════════════════════

let _chart = null;
let _m = null, _b = null;

// ── Mostrar sección al hacer clic ──
function abrirAjuste() {
    document.getElementById('ajusteSection').style.display = 'block';
    document.getElementById('hrAjuste').style.display = 'block';
    document.getElementById('ajusteSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Parsear valores separados por coma, espacio o punto y coma ──
function parsearValores(str) {
    return str.split(/[\s,;]+/).filter(s => s.trim() !== '').map(Number);
}

// ── Calcular regresión ──
function calcularAjuste() {
    const errEl = document.getElementById('ajusteError');
    errEl.style.display = 'none';

    const x = parsearValores(document.getElementById('xInput').value);
    const y = parsearValores(document.getElementById('yInput').value);

    // Validaciones
    if (x.length < 3 || y.length < 3) {
        errEl.textContent = 'Se necesitan al menos 3 valores en cada campo.';
        errEl.style.display = 'block'; return;
    }
    if (x.length !== y.length) {
        errEl.textContent = `X tiene ${x.length} valores e Y tiene ${y.length}. Deben ser iguales.`;
        errEl.style.display = 'block'; return;
    }
    if (x.some(isNaN) || y.some(isNaN)) {
        errEl.textContent = 'Hay valores no numéricos. Revisa los datos.';
        errEl.style.display = 'block'; return;
    }

    // Cálculo de mínimos cuadrados
    const n     = x.length;
    const sumX  = x.reduce((a, v) => a + v, 0);
    const sumY  = y.reduce((a, v) => a + v, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;

    // R² — coeficiente de determinación
    const yMedia = sumY / n;
    const ssTot  = y.reduce((a, yi) => a + (yi - yMedia) ** 2, 0);
    const ssRes  = y.reduce((a, yi, i) => a + (yi - (m * x[i] + b)) ** 2, 0);
    const r2     = 1 - ssRes / ssTot;

    _m = m; _b = b;

    // Mostrar métricas
    document.getElementById('metM').textContent  = m.toFixed(4);
    document.getElementById('metB').textContent  = b.toFixed(4);
    document.getElementById('metR2').textContent = r2.toFixed(4);
    document.getElementById('metN').textContent  = n;

    // Ecuación formateada
    const signo = b >= 0 ? '+' : '−';
    document.getElementById('ecuacionBox').textContent =
        `y = ${m.toFixed(4)} x ${signo} ${Math.abs(b).toFixed(4)}`;

    // Tabla de residuos
    const tbody = document.getElementById('datosTbody');
    tbody.innerHTML = '';
    x.forEach((xi, i) => {
        const yi_hat = m * xi + b;
        const res    = y[i] - yi_hat;
        const tr     = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${xi}</td>
            <td>${y[i]}</td>
            <td>${yi_hat.toFixed(4)}</td>
            <td style="color:${Math.abs(res) > 1 ? '#c0392b' : '#27ae60'}">${res.toFixed(4)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Gráfica
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    if (_chart) _chart.destroy();
    _chart = new Chart(document.getElementById('ajusteChart'), {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Datos',
                    data: x.map((xi, i) => ({ x: xi, y: y[i] })),
                    backgroundColor: '#3a7bd5',
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Ajuste',
                    data: [
                        { x: xMin, y: m * xMin + b },
                        { x: xMax, y: m * xMax + b }
                    ],
                    type: 'line',
                    borderColor: '#e07030',
                    borderWidth: 2.5,
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `(${ctx.parsed.x}, ${ctx.parsed.y.toFixed(4)})`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#777', font: { size: 12 } } },
                y: { grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { color: '#777', font: { size: 12 } } }
            }
        }
    });

    document.getElementById('ajusteResultados').style.display = 'block';
    predecirY();
}

// ── Predicción puntual ──
function predecirY() {
    const xv  = parseFloat(document.getElementById('xPredict').value);
    const out = document.getElementById('predictOut');
    if (isNaN(xv) || _m === null) { out.style.display = 'none'; return; }
    document.getElementById('predictVal').textContent = (_m * xv + _b).toFixed(4);
    out.style.display = 'inline';
}

// ── Limpiar todo ──
function limpiarAjuste() {
    document.getElementById('xInput').value      = '';
    document.getElementById('yInput').value      = '';
    document.getElementById('xPredict').value    = '';
    document.getElementById('ajusteError').style.display      = 'none';
    document.getElementById('ajusteResultados').style.display = 'none';
    document.getElementById('predictOut').style.display       = 'none';
    if (_chart) { _chart.destroy(); _chart = null; }
    _m = null; _b = null;
}
const API_URL = "http://localhost:5000/api";

let currentDatasetId = null;
let charts = {};

const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const cleanButton = document.getElementById("cleanButton");
const saveButton = document.getElementById("saveButton");
const loadSavedButton = document.getElementById("loadSavedButton");
const messageBox = document.getElementById("messageBox");

document.addEventListener("DOMContentLoaded", checkApi);
uploadForm.addEventListener("submit", uploadFile);
cleanButton.addEventListener("click", cleanDataset);
saveButton.addEventListener("click", saveDataset);
loadSavedButton.addEventListener("click", loadSavedData);

async function checkApi() {
  try {
    await fetchJson(`${API_URL}/health`);
    const status = document.getElementById("apiStatus");
    status.innerHTML = '<span class="status-dot" style="background: #27ae60;"></span>API conectada';
    status.style.color = "#27ae60";
  } catch (error) {
    const status = document.getElementById("apiStatus");
    status.innerHTML = '<span class="status-dot" style="background: #e74c3c;"></span>API sin conexión';
    status.style.color = "#e74c3c";
  }
}

async function uploadFile(event) {
  event.preventDefault();
  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  setMessage("Cargando archivo...");

  try {
    const data = await fetchJson(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });
    currentDatasetId = data.dataset_id;
    cleanButton.disabled = false;
    saveButton.disabled = false;
    renderDataset(data);
    setMessage("Archivo cargado correctamente.");
  } catch (error) {
    setMessage(error.message);
  }
}

async function cleanDataset() {
  if (!currentDatasetId) return;
  setMessage("Limpiando datos...");

  const payload = {
    remove_duplicates: document.getElementById("removeDuplicates").checked,
    remove_empty_rows: document.getElementById("removeEmptyRows").checked,
    null_strategy: document.getElementById("nullStrategy").value,
  };

  try {
    const data = await fetchJson(`${API_URL}/clean/${currentDatasetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    renderDataset(data);
    setMessage("Datos limpiados. Revisa la vista previa y estadisticas.");
  } catch (error) {
    setMessage(error.message);
  }
}

async function saveDataset() {
  if (!currentDatasetId) return;
  setMessage("Guardando en SQL Server...");

  try {
    const data = await fetchJson(`${API_URL}/save/${currentDatasetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_name: document.getElementById("tableName").value }),
    });
    setMessage(`Guardado en dbo.${data.table}: ${data.rows_inserted} registros.`);
  } catch (error) {
    setMessage(error.message);
  }
}

async function loadSavedData() {
  setMessage("Consultando datos guardados...");
  const tableName = document.getElementById("tableName").value;

  try {
    const data = await fetchJson(`${API_URL}/data?table_name=${encodeURIComponent(tableName)}&limit=100`);
    renderTable("previewTable", data.rows);
    document.getElementById("datasetLabel").textContent = `${data.count} registros desde SQL Server`;
    setMessage("Consulta completada desde SQL Server.");
  } catch (error) {
    setMessage(error.message);
  }
}

function renderDataset(data) {
  document.getElementById("datasetLabel").textContent = data.dataset_id;
  document.getElementById("rowCount").textContent = data.stats.row_count;
  document.getElementById("columnCount").textContent = data.stats.column_count;
  document.getElementById("duplicateCount").textContent = data.stats.duplicate_rows;

  renderTable("previewTable", data.preview);
  renderNullsTable(data.stats.nulls_by_column);
  renderNumericStats(data.stats.numeric);
  renderCharts(data.charts);
}

function renderTable(tableId, rows) {
  const table = document.getElementById(tableId);
  table.innerHTML = "";
  if (!rows || !rows.length) {
    table.innerHTML = "<tbody><tr><td>Sin datos para mostrar.</td></tr></tbody>";
    return;
  }

  const columns = Object.keys(rows[0]);
  table.innerHTML = `
    <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.map((row) => `
        <tr>${columns.map((column) => `<td>${escapeHtml(formatCell(row[column]))}</td>`).join("")}</tr>
      `).join("")}
    </tbody>
  `;
}

function renderNullsTable(nulls) {
  const rows = Object.entries(nulls).map(([column, count]) => ({ columna: column, nulos: count }));
  renderTable("nullsTable", rows);
}

function renderNumericStats(stats) {
  const rows = Object.entries(stats).map(([column, values]) => ({
    columna: column,
    media: formatNumber(values.mean),
    mediana: formatNumber(values.median),
    moda: formatNumber(values.mode),
    minimo: formatNumber(values.min),
    maximo: formatNumber(values.max),
    desviacion: formatNumber(values.std),
  }));
  renderTable("numericStatsTable", rows);
}

function renderCharts(payload) {
  destroyCharts();
  charts.series = createChart("seriesChart", "line", payload.first_numeric_series?.labels || [], [{
    label: payload.first_numeric_series?.column || "Sin columna numérica",
    data: payload.first_numeric_series?.values || [],
    borderColor: "#3498db",
    backgroundColor: "rgba(52, 152, 219, 0.15)",
    borderWidth: 2,
    tension: 0.4,
    fill: true,
    pointBackgroundColor: "#3498db",
    pointBorderColor: "#fff",
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
  }]);

  charts.means = createChart("meansChart", "bar", payload.numeric_means?.labels || [], [{
    label: "Media",
    data: payload.numeric_means?.values || [],
    backgroundColor: "#3498db",
    borderColor: "#2980b9",
    borderWidth: 1,
    borderRadius: 6,
    hoverBackgroundColor: "#2980b9",
  }]);

  charts.nulls = createChart("nullsChart", "bar", payload.nulls_by_column?.labels || [], [{
    label: "Nulos",
    data: payload.nulls_by_column?.values || [],
    backgroundColor: "#e74c3c",
    borderColor: "#c0392b",
    borderWidth: 1,
    borderRadius: 6,
    hoverBackgroundColor: "#c0392b",
  }]);
}

function createChart(canvasId, type, labels, datasets) {
  return new Chart(document.getElementById(canvasId), {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { size: 12, weight: 600 },
            padding: 15,
            color: "#1a1a2e",
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: "rgba(26, 26, 46, 0.8)",
          padding: 12,
          borderRadius: 8,
          titleFont: { size: 13, weight: 600 },
          bodyFont: { size: 12 },
          corners: 8,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11, weight: 500 },
            color: "#6c757d",
          },
          grid: {
            color: "rgba(52, 152, 219, 0.1)",
          },
        },
        x: {
          ticks: {
            font: { size: 11, weight: 500 },
            color: "#6c757d",
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => chart.destroy());
  charts = {};
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Error inesperado.");
  }
  return data;
}

function setMessage(text) {
  let icon = "ℹ️";
  let className = "message message-info";
  
  if (text.toLowerCase().includes("error") || text.toLowerCase().includes("sin conexión")) {
    icon = "❌";
    className = "message message-error";
  } else if (text.toLowerCase().includes("cargad") || text.toLowerCase().includes("guardado") || text.toLowerCase().includes("completa")) {
    icon = "✅";
    className = "message message-success";
  } else if (text.toLowerCase().includes("limpiando") || text.toLowerCase().includes("cargando")) {
    icon = "⏳";
    className = "message message-info";
  }
  
  messageBox.className = className;
  messageBox.innerHTML = `<span class="message-icon">${icon}</span><span>${text}</span>`;
}

function formatCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return Number(value).toLocaleString("es-MX", { maximumFractionDigits: 4 });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

from __future__ import annotations

import uuid
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.utils import secure_filename

from config import FLASK_HOST, FLASK_PORT, UPLOAD_DIR
from data_tools import chart_payload, clean_dataframe, dataframe_columns, dataframe_preview, descriptive_stats, read_uploaded_file
from db import fetch_saved_rows, save_dataframe, test_connection


ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
DATASETS = {}

app = Flask(__name__)
CORS(app)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "app": "TuxFlow"})


@app.post("/api/upload")
def upload_file():
    uploaded = request.files.get("file")
    if not uploaded:
        return jsonify({"error": "No se recibio ningun archivo."}), 400

    filename = secure_filename(uploaded.filename or "")
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Solo se aceptan archivos CSV, XLSX o XLS."}), 400

    dataset_id = str(uuid.uuid4())
    path = UPLOAD_DIR / f"{dataset_id}{extension}"
    uploaded.save(path)

    try:
        df = read_uploaded_file(path)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    DATASETS[dataset_id] = df
    return jsonify(_dataset_response(dataset_id, df))


@app.post("/api/clean/<dataset_id>")
def clean_dataset(dataset_id: str):
    df = DATASETS.get(dataset_id)
    if df is None:
        return jsonify({"error": "Dataset no encontrado. Vuelve a cargar el archivo."}), 404

    payload = request.get_json(silent=True) or {}
    cleaned = clean_dataframe(
        df,
        remove_duplicates=bool(payload.get("remove_duplicates", True)),
        remove_empty_rows=bool(payload.get("remove_empty_rows", True)),
        null_strategy=payload.get("null_strategy", "none"),
    )

    DATASETS[dataset_id] = cleaned
    return jsonify(_dataset_response(dataset_id, cleaned))


@app.post("/api/save/<dataset_id>")
def save_dataset(dataset_id: str):
    df = DATASETS.get(dataset_id)
    if df is None:
        return jsonify({"error": "Dataset no encontrado. Vuelve a cargar el archivo."}), 404

    payload = request.get_json(silent=True) or {}
    table_name = payload.get("table_name", "processed_data")

    try:
        result = save_dataframe(df, table_name=table_name)
    except Exception as exc:
        return jsonify({"error": f"No se pudo guardar en SQL Server: {exc}"}), 500

    return jsonify(result)


@app.get("/api/data")
def get_saved_data():
    table_name = request.args.get("table_name", "processed_data")
    limit = request.args.get("limit", 100)
    try:
        rows = fetch_saved_rows(table_name=table_name, limit=int(limit))
    except Exception as exc:
        return jsonify({"error": f"No se pudo consultar SQL Server: {exc}"}), 500

    return jsonify({"rows": rows, "count": len(rows)})


@app.get("/api/db/health")
def database_health():
    try:
        test_connection()
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500
    return jsonify({"status": "ok"})


def _dataset_response(dataset_id, df):
    return {
        "dataset_id": dataset_id,
        "columns": dataframe_columns(df),
        "preview": dataframe_preview(df),
        "stats": descriptive_stats(df),
        "charts": chart_payload(df),
    }


if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)

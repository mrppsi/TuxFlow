from __future__ import annotations

import re
from typing import Any

from config import (
    SQL_DATABASE,
    SQL_DRIVER,
    SQL_PASSWORD,
    SQL_SERVER,
    SQL_TRUST_CERTIFICATE,
    SQL_USERNAME,
)


def get_connection(database: str | None = None):
    try:
        import pyodbc
    except ImportError as exc:
        raise RuntimeError("Falta pyodbc. Instala el Driver ODBC y luego ejecuta: pip install pyodbc") from exc

    db_name = database or SQL_DATABASE
    try:
        return pyodbc.connect(_connection_string(db_name))
    except Exception as exc:
        if db_name == SQL_DATABASE and "Cannot open database" in str(exc):
            _create_database(pyodbc, db_name)
            return pyodbc.connect(_connection_string(db_name))
        raise


def _connection_string(database: str) -> str:
    return (
        f"DRIVER={{{SQL_DRIVER}}};"
        f"SERVER={SQL_SERVER};"
        f"DATABASE={database};"
        f"UID={SQL_USERNAME};"
        f"PWD={SQL_PASSWORD};"
        "Encrypt=yes;"
        f"TrustServerCertificate={SQL_TRUST_CERTIFICATE};"
    )


def _create_database(pyodbc_module, database: str) -> None:
    safe_name = _quote_identifier(database)
    with pyodbc_module.connect(_connection_string("master"), autocommit=True) as conn:
        cursor = conn.cursor()
        cursor.execute(f"IF DB_ID(N'{database.replace("'", "''")}') IS NULL CREATE DATABASE {safe_name};")


def _quote_identifier(value: str) -> str:
    return f"[{value.replace(']', ']]')}]"


def test_connection() -> bool:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return True


def save_dataframe(dataset: dict[str, Any], table_name: str = "processed_data") -> dict[str, Any]:
    safe_table = _safe_identifier(table_name)
    original_columns = [str(column) for column in dataset["columns"]]
    rows = dataset["rows"]
    columns = _safe_column_names(original_columns)

    if not columns:
        raise ValueError("El archivo no tiene columnas para guardar.")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"IF OBJECT_ID(N'dbo.{safe_table}', N'U') IS NOT NULL DROP TABLE dbo.{safe_table};")
        cursor.execute(_create_table_sql(safe_table, rows, original_columns, columns))

        placeholders = ", ".join("?" for _ in columns)
        column_list = ", ".join(f"[{column}]" for column in columns)
        insert_sql = f"INSERT INTO dbo.{safe_table} ({column_list}) VALUES ({placeholders})"

        prepared_rows = [_prepare_row(row, original_columns) for row in rows]
        if prepared_rows:
            cursor.fast_executemany = True
            cursor.executemany(insert_sql, prepared_rows)

        conn.commit()

    return {"table": safe_table, "rows_inserted": int(len(rows))}


def fetch_saved_rows(table_name: str = "processed_data", limit: int = 100) -> list[dict[str, Any]]:
    safe_table = _safe_identifier(table_name)
    limit = max(1, min(int(limit), 500))

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT TOP ({limit}) * FROM dbo.{safe_table};")
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _create_table_sql(
    table_name: str,
    rows: list[dict[str, Any]],
    original_columns: list[str],
    columns: list[str],
) -> str:
    definitions = []
    for original, safe in zip(original_columns, columns):
        definitions.append(f"[{safe}] {_sql_type_for_column(rows, original)} NULL")
    return f"CREATE TABLE dbo.{table_name} ({', '.join(definitions)});"


def _sql_type_for_column(rows: list[dict[str, Any]], column: str) -> str:
    values = [row.get(column) for row in rows if not _is_blank(row.get(column))]
    if values and all(_is_int(value) for value in values):
        return "BIGINT"
    if values and all(_is_float(value) for value in values):
        return "FLOAT"
    return "NVARCHAR(255)"


def _prepare_row(row: dict[str, Any], columns: list[str]) -> tuple[Any, ...]:
    prepared = []
    for column in columns:
        value = row.get(column)
        prepared.append(None if _is_blank(value) else value)
    return tuple(prepared)


def _is_blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _is_int(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    try:
        number = float(str(value).replace(",", ""))
    except ValueError:
        return False
    return number.is_integer()


def _is_float(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    try:
        float(str(value).replace(",", ""))
    except ValueError:
        return False
    return True


def _safe_identifier(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", value.strip())
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    if not cleaned:
        cleaned = "column"
    if cleaned[0].isdigit():
        cleaned = f"col_{cleaned}"
    return cleaned[:100]


def _safe_column_names(values: list[str]) -> list[str]:
    used: dict[str, int] = {}
    result = []
    for value in values:
        base = _safe_identifier(value)
        count = used.get(base, 0)
        used[base] = count + 1
        result.append(base if count == 0 else f"{base}_{count + 1}")
    return result

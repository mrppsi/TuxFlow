# TuxFlow
![TuxFlow Banner](banner/banner.png)

TuxFlow es una aplicacion web sencilla para cargar archivos CSV o XLSX, limpiar datos basicos, calcular estadisticas descriptivas y guardar el resultado en SQL Server 2022 Express.

El proyecto esta pensado como portafolio para perfiles junior de Data Analyst o BI Analyst. Prioriza funcionalidad, claridad y ejecucion local sin sobreingenieria.

## Stack

- Backend: Python + Flask
- Procesamiento: Pandas + NumPy
- Base de datos: SQL Server 2022 Express
- Conexion SQL Server: pyodbc
- Frontend: HTML, CSS y JavaScript
- Graficas: Chart.js
- Infraestructura local: Docker Compose
- Administracion DB: Azure Data Studio

## Funcionalidades

- Carga de archivos CSV, XLSX y XLS.
- Vista previa de datos cargados.
- Eliminacion de filas duplicadas.
- Eliminacion de filas completamente vacias.
- Deteccion de valores nulos por columna.
- Reemplazo de nulos por media o mediana en columnas numericas.
- Conversion basica de tipos cuando Pandas puede inferirlos.
- Estadisticas descriptivas: filas, columnas, duplicados, nulos, media, mediana, moda, minimo, maximo y desviacion estandar.
- Guardado de datos procesados en SQL Server.
- Consulta de registros guardados desde la interfaz.
- Dashboard simple con tres graficas.

## Estructura

```text
TuxFlow/
├── assets/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── data_tools.py
│   ├── db.py
│   ├── requirements.txt
│   └── uploads/
├── database/
│   ├── create_database.sql
│   └── README.md
├── docs/
│   └── project-notes.md
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── docker-compose.yml
└── README.md
```

## Requisitos previos

- Python 3.10 a 3.12 recomendado
- Docker Desktop o Docker Engine
- Azure Data Studio
- Driver ODBC de Microsoft para SQL Server

En Ubuntu/Debian, instala el driver siguiendo la documentacion oficial de Microsoft para `msodbcsql18`. En Windows, instala "ODBC Driver 18 for SQL Server".

Nota: evita Python 3.14 para este proyecto si usas las versiones fijadas en `backend/requirements.txt`, porque algunas librerias de datos pueden intentar compilarse desde codigo fuente.

## Instalacion

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/TuxFlow.git
cd TuxFlow
```

2. Levanta SQL Server Express:

```bash
docker compose up -d
```

3. Crea la base de datos con Azure Data Studio:

- Server: `localhost,1433`
- User: `sa`
- Password: `YourStrong!Passw0rd`
- Ejecuta el script `database/create_database.sql`

4. Prepara el backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

En Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python app.py
```

5. Abre el frontend:

Abre `frontend/index.html` en el navegador.

La API corre por defecto en:

```text
http://localhost:5000
```

## Uso

1. Selecciona un archivo CSV o XLSX.
2. Haz clic en `Cargar archivo`.
3. Revisa la vista previa, nulos y estadisticas.
4. Elige opciones de limpieza.
5. Haz clic en `Limpiar datos`.
6. Define el nombre de tabla, por ejemplo `processed_data`.
7. Haz clic en `Guardar en SQL Server`.
8. Usa `Consultar guardados` para ver los registros insertados.

## Endpoints principales

- `GET /api/health`: estado de la API.
- `POST /api/upload`: carga un archivo.
- `POST /api/clean/<dataset_id>`: limpia el dataset cargado.
- `POST /api/save/<dataset_id>`: guarda en SQL Server.
- `GET /api/data?table_name=processed_data`: consulta datos guardados.
- `GET /api/db/health`: prueba conexion a SQL Server.

## Configuracion

El archivo `backend/.env` controla la conexion a SQL Server:

```env
SQL_SERVER=localhost,1433
SQL_DATABASE=TuxFlowDB
SQL_USERNAME=sa
SQL_PASSWORD=YourStrong!Passw0rd
SQL_DRIVER=ODBC Driver 18 for SQL Server
SQL_TRUST_CERTIFICATE=yes
```

## Notas para portafolio

Este proyecto demuestra:

- Lectura y procesamiento de datos con Pandas.
- Limpieza basica de datasets.
- Calculo de estadisticas descriptivas.
- Persistencia en SQL Server.
- Consumo de una API desde JavaScript.
- Visualizacion simple de datos.
- Uso de Docker para base de datos local.

## Mejoras futuras

- Agregar historico de cargas.
- Exportar datos limpios a CSV.
- Seleccionar columnas antes de guardar.
- Validar tipos de datos con reglas configurables.
- Agregar pruebas unitarias para funciones de limpieza.

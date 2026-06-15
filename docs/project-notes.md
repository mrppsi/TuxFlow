# Notas tecnicas

TuxFlow esta pensado como proyecto de portafolio junior para Data Analyst o BI Analyst. La aplicacion prioriza el flujo principal:

1. Cargar un CSV o XLSX.
2. Revisar una vista previa.
3. Aplicar limpieza basica.
4. Ver estadisticas descriptivas.
5. Guardar el resultado en SQL Server.
6. Consultar datos guardados desde la interfaz.

## Decisiones simples

- Flask se usa como API ligera porque es facil de ejecutar y entender.
- Pandas y NumPy concentran la lectura, limpieza y estadisticas.
- `pyodbc` se usa para SQL Server porque es estable y comun en entornos BI.
- La tabla se recrea al guardar para mantener el proyecto simple y evitar migraciones.
- El frontend es HTML, CSS y JavaScript sin framework para reducir dependencias.
- Chart.js se carga por CDN para graficas basicas.

## Limitaciones intencionales

- Los datasets se guardan temporalmente en memoria durante la sesion del backend.
- No hay autenticacion ni roles de usuario.
- No hay historico de cargas.
- No hay validacion avanzada de tipos o calidad de datos.

# Base de datos TuxFlow

Este proyecto usa SQL Server 2022 Express en Docker.

Credenciales locales por defecto:

- Servidor: `localhost,1433`
- Usuario: `sa`
- Password: `YourStrong!Passw0rd`
- Base de datos: `TuxFlowDB`

El backend crea la tabla `dbo.processed_data` automaticamente al guardar un dataset procesado. El script `create_database.sql` solo crea la base inicial para conectarla desde Azure Data Studio.

## Azure Data Studio

1. Abre Azure Data Studio.
2. Crea una nueva conexion.
3. Usa `localhost,1433` como servidor.
4. Authentication type: `SQL Login`.
5. User name: `sa`.
6. Password: `YourStrong!Passw0rd`.
7. Ejecuta `database/create_database.sql`.

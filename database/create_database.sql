IF DB_ID('TuxFlowDB') IS NULL
BEGIN
    CREATE DATABASE TuxFlowDB;
END;
GO

USE TuxFlowDB;
GO

IF OBJECT_ID('dbo.processed_data', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.processed_data (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sample_column NVARCHAR(255) NULL
    );
END;
GO

-- Create schemas for multi-schema Prisma support
-- These schemas are used by the Autoflow application:
--   master_data  — Users, Roles, Products, Customers, Suppliers
--   transactions — TX Log, AP/AR Open Items
--   warehouse    — Stock movements, adjustments
--   reports      — Aggregated views, export tables

CREATE SCHEMA IF NOT EXISTS master_data;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS reports;

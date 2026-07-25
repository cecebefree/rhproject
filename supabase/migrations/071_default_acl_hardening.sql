-- ITEM-53: default ACL hardening
-- Revoke future sequence grants from client roles (anon, authenticated).
-- Restore service_role table CRUD (SELECT, INSERT, UPDATE, DELETE).
-- Strip TRUNCATE, REFERENCES, TRIGGER from service_role default.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM service_role;

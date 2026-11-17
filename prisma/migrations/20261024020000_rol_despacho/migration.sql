-- Rol para quien prepara y entrega los pedidos (OFT0-409). AWS no corre los
-- seeds, así que el rol entra aquí; roles.seed.ts lo mantiene para local y CI.
INSERT INTO persons.rol (nombre, descripcion) VALUES
  ('despacho', NULL)
ON CONFLICT DO NOTHING;

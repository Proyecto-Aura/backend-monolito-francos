-- Despacho (HU-A-023) debe ser un módulo propio en el menú, al mismo nivel
-- que Inventario o Producción, no una subopción de Inventario (así quedó por
-- error en la migración 20261106010000_ruta_despacho_pedidos).
UPDATE persons.ruta
SET parent_id = NULL
WHERE nombre = 'despacho-pedidos';

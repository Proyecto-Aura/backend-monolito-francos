## Qué hace

<!-- Resumen en 2-3 líneas. Si aplica, el ticket de Jira: OFT0-XXX -->

## Cómo probarlo

<!-- Pasos para que quien revise pueda verificarlo -->

## Definition of Done

- [ ] `pnpm build` sin errores
- [ ] `pnpm lint` sin errores nuevos en los archivos tocados
- [ ] Tests unitarios (`*.spec.ts` en `src/`, junto al archivo que prueban) para los use-cases nuevos o modificados
- [ ] Tests e2e (`*.e2e-spec.ts` en `test/`) para endpoints nuevos o con autorización cambiada: 401 sin token, 403 rol incorrecto, 2xx rol correcto
- [ ] Ejecuté `pnpm test` y `pnpm test:e2e` de verdad y pego la salida abajo
- [ ] Swagger actualizado (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` en rutas protegidas)

## Salida de los tests

<!-- Pegar el resultado real de pnpm test y pnpm test:e2e -->

```

```

## Revisión de seguridad propia

- [ ] Ninguna ruta quedó pública sin `@Public()` explícito
- [ ] Todos los inputs se validan con DTO
- [ ] Se filtra `estado = true` donde corresponde
- [ ] No hay PII, contraseñas ni tokens en logs ni en respuestas

## Superficie de ataque

<!--
Para la revisión de seguridad manual.
Endpoints nuevos o modificados, con el rol que puede usarlos.
Qué vista del frontend los consume. Si no aplica, escribir "ninguna".
-->

## Notas para quien revise

<!-- Decisiones de diseño no obvias, dudas abiertas, cosas que quedaron fuera -->

# Compra

Lista de la compra compartida y comparativa de precios entre supermercados,
para una casa de dos personas.

Dos objetivos, en este orden:

1. Saber qué hay que comprar y tacharlo rápido en el pasillo.
2. Comparar el precio de cada artículo entre supermercados, **siempre por unidad
   de medida** (€/l, €/kg, €/ud), para que la comparación sea honesta.

---

## Arrancar

```bash
npm install
```

```bash
npm run dev
```

Abre <http://localhost:5173>. Está pensada para móvil: en el navegador de
escritorio, ponlo en vista de dispositivo a **375×812**.

Entra con cualquier correo que lleve `@` y cualquier contraseña — la
autenticación está simulada hasta que entre Supabase. Los datos de ejemplo
(20 artículos, 4 tiendas, 3 fechas de precios) se cargan en memoria y se
reinician al recargar.

Otros comandos:

```bash
npm run build
```

```bash
npm run typecheck
```

---

## Cómo está organizado

Arquitectura limpia: **las dependencias apuntan hacia dentro**.

```
src/
  dominio/          reglas de negocio y puertos — sin dependencias
  aplicacion/       casos de uso
  infraestructura/  implementaciones (hoy: memoria) + contenedor
  presentacion/     React: pantallas, componentes, estado, estilos
```

Las pantallas llaman a casos de uso, nunca a un repositorio. El único sitio
donde se elige la implementación es `src/infraestructura/contenedor.ts`.

---

## Documentación

| Documento | Qué cuenta |
|---|---|
| [`docs/estado-del-proyecto.md`](docs/estado-del-proyecto.md) | Dónde está el trabajo y qué toca ahora |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Las capas, los puertos y cómo entra Supabase |
| [`docs/base-de-datos.md`](docs/base-de-datos.md) | Diseño del esquema y sus motivos |
| [`supabase/schema.sql`](supabase/schema.sql) | El esquema ejecutable |
| [`prototipo/README.md`](prototipo/README.md) | El prototipo original: pantallas, tokens y copys |

El prototipo de `prototipo/` es la **fuente de verdad visual**. Ábrelo en el
navegador para comparar.

# Arquitectura

Aplicación React (Vite + TypeScript) que recrea el prototipo de
[`prototipo/`](../prototipo/README.md) siguiendo **arquitectura limpia**.

La regla que ordena todo: **las dependencias apuntan hacia dentro**. El dominio
no sabe que existe React ni Supabase; los casos de uso no saben de dónde salen
los datos; solo la infraestructura conoce implementaciones concretas.

> **Arquitectura limpia, no hexagonal.** Que exista `dominio/puertos/` no
> convierte esto en puertos y adaptadores: los puertos son interfaces del
> dominio, y el proyecto se organiza en **capas concéntricas** —dominio, casos
> de uso, infraestructura, presentación— con las dependencias apuntando hacia
> dentro. El vocabulario del proyecto es el de las capas.

```
presentacion  ──►  aplicacion  ──►  dominio
      │                                ▲
      └──────►  infraestructura  ───────┘
                (implementa los puertos)
```

---

## 1. Capas

### `src/dominio/` — reglas, sin dependencias

| Carpeta | Qué hay |
|---|---|
| `modelo/` | `Articulo`, `Supermercado`, `Precio`, `Lista`, `Unidad` y sus reglas: orden de compra, redondeo a milésimas, orden por fecha |
| `servicios/` | Funciones puras de negocio: `ultimoPrecio`, `mejorPrecio`, `comparativa`, `serieHistorica`, `parseaDictado` |
| `puertos/` | Las **interfaces** de lo que el dominio necesita del exterior |

No importa nada de las otras capas. Se puede probar sin navegador ni red.

### `src/aplicacion/` — casos de uso

Cada caso de uso es una función que recibe `Dependencias` y devuelve la
operación ya enlazada:

```ts
export const guardarPrecio =
  (d: Dependencias) =>
  async (artId: string, superId: string, importe: number | null) => { … }
```

`construyeCasosDeUso(d)` los reúne en un solo objeto: es lo único que la
interfaz puede llamar.

**Todo es asíncrono a propósito**, aunque hoy los datos estén en memoria. Es lo
que permite que Supabase entre sin tocar ni un caso de uso ni una pantalla.

### `src/infraestructura/` — implementaciones

| Fichero | Qué implementa |
|---|---|
| `memoria/semilla.ts` | Los datos de ejemplo del prototipo (20 artículos, 4 tiendas, 3 fechas) |
| `memoria/almacen.ts` | Estado compartido, para que los borrados en cascada sean posibles |
| `memoria/repositorios.ts` | Los repositorios contra memoria, imágenes incluidas |
| `memoria/autenticacion.ts` | Login simulado, recordado en `localStorage` |
| `reloj.ts` | El «hoy» del dispositivo |
| `redimensiona.ts` | Reduce la imagen con un `<canvas>` antes de subirla |
| `supabase/imagenes.ts` | Fotos y logos contra Storage, no contra una tabla |
| `contenedor.ts` | **El único sitio donde se elige qué implementación se usa** |

### `src/presentacion/` — React

| Carpeta | Qué hay |
|---|---|
| `estilos/tokens.css` | El sistema visual *Classical* del prototipo |
| `estado/` | `AppProvider` (contexto único), navegación con pila, tema, imágenes, consultas de lectura |
| `componentes/` | Cabecera, pestañas, hoja inferior, diálogo, hoja de precio, panel de añadir |
| `pantallas/` | Las diez vistas del prototipo |
| `App.tsx` | El marco del móvil y el enrutado |

Las pantallas leen `datos` (una instantánea de todo lo cargado) y llaman a
`acciones`. **Nunca tocan un repositorio.**

---

## 2. Los puertos

Son ocho interfaces en `src/dominio/puertos/index.ts`:

```ts
interface RepositorioArticulos { listar, crear, editar, borrar }
interface RepositorioSupermercados { listar, crear, renombrar, borrar }
interface RepositorioPrecios { listar, guardar, borrar }
interface RepositorioListas {
  listar, obtener, crear, cambiarCierre,
  guardarItems,                          // en bloque
  marcarComprado, fijarCantidad, quitarItem  // un solo item
}
interface RepositorioImagenes { listar, guardar, quitar, renombrar }
interface RepositorioResumen { inicio }
interface ServicioAutenticacion { sesionActual, entrar, salir }
interface Reloj { hoy }
```

Contratos que la implementación debe respetar, porque son reglas de negocio y no
detalles de almacenamiento:

- `RepositorioPrecios.guardar` **sustituye** el precio de esa fecha en esa
  tienda; no duplica. En Postgres es un `upsert` sobre
  `unique (producto, supermercado, fecha)`.
- `RepositorioArticulos.borrar` se lleva por delante los precios del artículo y
  sus apariciones en listas. En Postgres lo hace el `on delete cascade`.
- Los tres métodos de un solo item de `RepositorioListas` son **idempotentes**:
  si el item ya no está, no hacen nada en vez de fallar. La app la usan dos
  personas, así que la otra puede haberlo quitado entre medias.

**Por qué las imágenes son un puerto y no una columna.** La foto de un artículo
no hace falta cuando se lee el catálogo, y `cargarTodo` se vuelve a pedir
después de cada acción: como columna, cada `+` de una lista arrastraría las
fotos. Como puerto aparte, se piden una vez al entrar y se refrescan solo cuando
alguna cambia. Su implementación no es una tabla, sino Supabase Storage, y la
ruta del fichero **se deduce del nombre** — con la consecuencia de que
renombrar hay que acompañarlo a mano, porque el `on update cascade` de la base
no llega hasta allí. Está contado en §3 decies de
[`estado-del-proyecto.md`](estado-del-proyecto.md).

**Por qué `RepositorioListas` tiene dos granularidades.** `guardarItems`
sustituye todos los items, y para usarlo hay que leer la lista antes: eso
convertía marcar una casilla en tres viajes al servidor más una recarga. Los
tres métodos estrechos tocan la fila `(lista, producto)` —que es su clave— sin
leer nada. `guardarItems` se queda para lo único que cambia varios items de
golpe: el dictado. El detalle y la medición están en §3 septies de
[`estado-del-proyecto.md`](estado-del-proyecto.md).

---

## 3. Estado de la interfaz

Un único `AppProvider` sostiene:

- **Datos**: `datos`, `cargando`, `error`, `recargar()`.
  La mayoría de acciones ejecutan su caso de uso y vuelven a cargar la
  instantánea entera: son tablas pequeñas y varias pantallas las cruzan, así que
  una carga completa sale más barata que ir pidiendo trozos.
  **Excepción**: `marcarComprado` y `cambiarCantidad` no recargan. Aplican sobre
  `datos` el cambio que el servidor ya ha confirmado y refrescan solo el
  resumen. No es escritura optimista —el parche va después del `await`—; lo que
  se evita no es la espera, es volver a preguntar algo que ya se sabe. Son las
  dos acciones que se repiten cuarenta veces por compra.
- **Resumen**: `resumen`, `recargarResumen()`. Las tres cuentas de inicio,
  resueltas por `resumen_inicio()` en el servidor. Se refresca tras **cualquier**
  acción, porque casi todas pueden mover una de sus cifras.
- **Sesión**: `sesion`, `entrar`, `salir`.
- **Navegación**: ruta + pila, igual que el prototipo. `ir` apila, `atras`
  desapila, cambiar de pestaña vacía la pila.
- **Capas flotantes**: `dlg`, `hoja`, `panelAnadir` — se posicionan contra el
  marco del móvil, no contra la ventana.
- **Tema** y **buscador** (`q`).
- **Imágenes**: `imagenes.foto(id)`, `imagenes.logo(id)`, `pideImagen`,
  `quitaFoto`. Se cargan al entrar, aparte de `datos`, y se refrescan cuando una
  cambia o cuando un renombrado mueve su fichero.

---

## 4. Lo que falta para la fase de Supabase

> **Esta sección está cumplida y se conserva como registro del plan.** La fase 2
> terminó: los repositorios corren contra Supabase —siete, con el de imágenes,
> que llegó después— y `contenedor.ts` ya no monta nada en memoria salvo si
> falta `.env`. Lo que de verdad queda pendiente
> está en §4 de [`estado-del-proyecto.md`](estado-del-proyecto.md), no aquí.
>
> Un apunte sobre la predicción de abajo: **«nada más se toca» no se cumplió**.
> El dominio y los casos de uso siguen intactos en lo esencial, pero el puerto de
> listas tuvo que estrecharse (§2) cuando se vio lo que costaba de verdad una
> petición. Un puerto diseñado contra un mock en memoria no sabe qué operaciones
> son caras, porque en memoria ninguna lo es.

El trabajo es **solo de infraestructura**:

1. Crear `src/infraestructura/supabase/cliente.ts` con
   `createClient(import.meta.env.VITE_SUPABASE_URL, …)`.
2. Implementar los cinco puertos contra las tablas de
   [`supabase/schema.sql`](../supabase/schema.sql).
3. Cambiar `contenedor.ts` para que devuelva esas implementaciones.

Nada más se toca. Ni el dominio, ni los casos de uso, ni las pantallas.

Hay una diferencia que sí exige decidir algo: en el esquema, el **nombre es la
clave primaria** de productos y supermercados, mientras que el modelo del
dominio usa `id`. La traducción vive en el adaptador — `id = nombre` es lo más
directo, y `on update cascade` ya se encarga de propagar los renombrados.

Queda además pendiente de esa fase:

- ~~**Fotos**~~: **hechas**. Van a Supabase Storage en dos tamaños (80px para
  las filas, 720px para la ficha), reducidos en el navegador. La ruta no se
  guarda en el artículo ni en el supermercado: se deduce del nombre. §3 decies
  de [`estado-del-proyecto.md`](estado-del-proyecto.md).
- **Sincronización entre los dos usuarios**: escritura optimista con cola de
  envío. El estado de error ya está diseñado y se puede forzar desde
  Ajustes → Demostración de estados. Para `comprado` y `cantidad`, resolución
  última-escritura-gana por campo.

---

## 5. Decisiones que conviene no revertir sin pensarlo

- **El total del ticket está apagado** (`MOSTRAR_TOTAL_LISTA` en
  `presentacion/config.ts`). Lo que compara la app es el precio por unidad de
  cada artículo, no lo que suma una cesta.
- **La comparación es por artículo**, nunca un total de cesta por supermercado:
  mezclar productos no dice si el pan es más barato en un sitio o en otro.
- **La unidad es fija por artículo**, no por precio. Cambiarla invalida la
  comparación de todos sus precios.
- **Un artículo sin precio se muestra como «sin precio»**, nunca como 0,00 €.
- **Precio 0 o vacío borra el precio de hoy**: es la forma de deshacer un apunte
  equivocado sin salir del teclado.

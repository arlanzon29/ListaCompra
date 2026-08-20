# Arquitectura

Aplicación React (Vite + TypeScript) que recrea el prototipo de
[`prototipo/`](../prototipo/README.md) siguiendo **arquitectura limpia**.

La regla que ordena todo: **las dependencias apuntan hacia dentro**. El dominio
no sabe que existe React ni Supabase; los casos de uso no saben de dónde salen
los datos; solo la infraestructura conoce implementaciones concretas.

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
| `modelo/` | `Articulo`, `Supermercado`, `Precio`, `Lista`, `Unidad` y sus reglas: orden de compra, redondeo a céntimos, orden por fecha |
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
| `memoria/repositorios.ts` | Los cuatro repositorios contra memoria |
| `memoria/autenticacion.ts` | Login simulado, recordado en `localStorage` |
| `reloj.ts` | El «hoy» del dispositivo |
| `contenedor.ts` | **El único sitio donde se elige qué implementación se usa** |

### `src/presentacion/` — React

| Carpeta | Qué hay |
|---|---|
| `estilos/tokens.css` | El sistema visual *Classical* del prototipo |
| `estado/` | `AppProvider` (contexto único), navegación con pila, tema, fotos, consultas de lectura |
| `componentes/` | Cabecera, pestañas, hoja inferior, diálogo, hoja de precio, panel de añadir |
| `pantallas/` | Las diez vistas del prototipo |
| `App.tsx` | El marco del móvil y el enrutado |

Las pantallas leen `datos` (una instantánea de todo lo cargado) y llaman a
`acciones`. **Nunca tocan un repositorio.**

---

## 2. Los puertos

Son cinco interfaces en `src/dominio/puertos/index.ts`:

```ts
interface RepositorioArticulos { listar, crear, editar, borrar }
interface RepositorioSupermercados { listar, crear, renombrar, borrar }
interface RepositorioPrecios { listar, guardar, borrar }
interface RepositorioListas { listar, obtener, crear, guardarItems, cambiarCierre }
interface ServicioAutenticacion { sesionActual, entrar, salir }
interface Reloj { hoy }
```

Dos contratos que la implementación debe respetar, porque son reglas de negocio
y no detalles de almacenamiento:

- `RepositorioPrecios.guardar` **sustituye** el precio de esa fecha en esa
  tienda; no duplica. En Postgres es un `upsert` sobre
  `unique (producto, supermercado, fecha)`.
- `RepositorioArticulos.borrar` se lleva por delante los precios del artículo y
  sus apariciones en listas. En Postgres lo hace el `on delete cascade`.

---

## 3. Estado de la interfaz

Un único `AppProvider` sostiene:

- **Datos**: `datos`, `cargando`, `error`, `recargar()`.
  Cada acción ejecuta su caso de uso y vuelve a cargar. Son cuatro tablas
  pequeñas y la pantalla de inicio ya necesita las cuatro, así que una carga
  completa sale más barata que ir pidiendo trozos por pantalla.
- **Sesión**: `sesion`, `entrar`, `salir`.
- **Navegación**: ruta + pila, igual que el prototipo. `ir` apila, `atras`
  desapila, cambiar de pestaña vacía la pila.
- **Capas flotantes**: `dlg`, `hoja`, `panelAnadir` — se posicionan contra el
  marco del móvil, no contra la ventana.
- **Tema**, **buscador** (`q`) y **fotos**.

---

## 4. Lo que falta para la fase de Supabase

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

- **Fotos**: hoy son data-URL en `localStorage`. En producción, subirlas a
  Supabase Storage, guardar la URL en el artículo o el supermercado y servir dos
  tamaños (80px para las filas, 720px para la ficha).
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

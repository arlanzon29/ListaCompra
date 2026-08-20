# Handoff: ListaCompra (lista de la compra compartida + comparación de precios)

## Overview
Aplicación móvil (responsive web / PWA) en **español** para una pareja que comparte la compra
del hogar. Dos objetivos, en este orden:

1. Saber qué hay que comprar y tacharlo rápido en el pasillo.
2. Comparar el precio de cada artículo entre supermercados, **siempre por unidad de medida**
   (€/l, €/kg, €/ud) para que la comparación sea honesta.

Decisión de producto explícita del usuario: **no interesa el total del ticket**. El total
estimado existe pero está apagado por defecto (prop `mostrarTotalLista`).

También explícito: la comparación es **por artículo** (ficha), nunca un total de cesta por
supermercado — mezclar productos no dice si el pan es más barato en un sitio u otro.

## About the Design Files
Los ficheros de este bundle son **referencias de diseño hechas en HTML**: prototipos que
muestran aspecto y comportamiento previstos, no código de producción para copiar tal cual.
El trabajo consiste en **recrear estos diseños en React** siguiendo los patrones, librerías y
convenciones del codebase destino (routing, estado, componentes, tests). Si no hay codebase
todavía, elegir el stack (sugerencia: Vite + React + TypeScript, estado local con Zustand o
Context, persistencia IndexedDB/localStorage y sincronización posterior).

- `ListaCompra-standalone.html` — el prototipo completo, autocontenido, abrir en cualquier
  navegador (mejor en vista móvil, 390×844). Es la fuente de verdad visual y de interacción.
- `Compra List.dc.html` — el mismo diseño en su formato de autoría (plantilla + clase de
  lógica). Útil para leer la lógica de estado y los datos de ejemplo (`seed()`).

## Fidelity
**High-fidelity.** Colores, tipografía, espaciado, estados y copys son definitivos. El sistema
visual es *Classical* (editorial: Cormorant Garamond + Lora, fondo cálido casi blanco, acento
oro aplicado como trazo, no como relleno). Recrear la UI con fidelidad de píxel usando la
librería de componentes del codebase destino; si no existe, replicar los tokens de abajo.

Notas del sistema visual que hay que respetar:
- Los botones son **contorno**, no rellenos sólidos; las tarjetas son bordeadas, sin fondo.
- Nunca sans-serif: todo el texto en Lora (cuerpo) o Cormorant Garamond (títulos/números).
- Sombras casi imperceptibles; jerarquía por filetes de 1px (`--color-divider`).
- Cifras siempre tabulares (`font-variant-numeric: tabular-nums`).

---

## Modelo de datos

```ts
type Unidad = 'l' | 'kg' | 'ud';            // fija por artículo, no por precio

type Articulo = { id: string; nombre: string; unidad: Unidad };
type Supermercado = { id: string; nombre: string };

type Precio = {                              // un precio POR artículo, tienda y fecha
  artId: string; superId: string;
  fecha: string;                             // ISO 'YYYY-MM-DD'
  importe: number;                           // SIEMPRE por unidad de medida
};

type ItemLista = { artId: string; cant: number; comprado: boolean };
type Lista = { id: string; nombre: string; items: ItemLista[]; cerrada?: boolean };
```

Reglas de negocio implementadas:
- **`ultimo(artId, superId)`**: precio más reciente de ese artículo en esa tienda.
- **`mejor(artId)`**: el más barato entre los últimos precios de cada tienda → es lo que se
  muestra en la fila de la lista y ordena la ficha.
- Guardar un precio con fecha de hoy **sustituye** el de hoy en esa tienda (no duplica).
- Un artículo puede no tener precio en ninguna tienda: ese estado se muestra explícitamente,
  nunca como 0,00 €.
- Precio 0 o vacío = borrar el precio de hoy.
- Las listas cerradas no se pueden modificar (toggle y ±cantidad son no-ops, controles al 45%).

## Screens / Views

### 1. Login (`vistaLogin`)
- **Purpose**: entrar. Cuentas creadas a mano, **sin registro** (uso doméstico, 2 personas).
- **Layout**: columna centrada verticalmente, padding 32/26px, gap 26px, ancho máx. 440px.
- **Componentes**: kicker «USO DOMÉSTICO» (10px, letter-spacing .16em, color acento);
  H1 «Compra» (Cormorant 40px, weight 400); filete; subtítulo 14px neutral-700;
  campos Correo y Contraseña (`.field` + `.input`, min-height 48px, font-size 16px para que
  iOS no haga zoom); botón «Entrar» (min-height 52px); nota 12px centrada.
- **Validación**: el email debe contener `@` y la contraseña no puede estar vacía; si falla,
  aviso en caja con borde acento («Correo o contraseña incorrectos.»).

### 2. Inicio (`inicio`) — pantalla de arranque
- **Purpose**: retomar la compra en un toque y ver la actividad de precios.
- **Componentes**:
  - Tarjeta «COMPRA EN CURSO»: nombre de la lista con más pendientes (Cormorant 28px),
    línea «X de Y cogidos» + «N por coger» (acento-700), botón «Seguir comprando».
  - Estado vacío alternativo: «Nada pendiente» + botón «Ver mis listas».
  - Tres cifras en fila (borde 1px, radio 4px): artículos por comprar / listas abiertas /
    artículos sin precio. Número en Cormorant 26px tabular, etiqueta 11px.
  - «ÚLTIMOS PRECIOS APUNTADOS»: 4 filas (artículo, tienda + fecha dd/mm/aaaa, importe
    €/unidad, chevron) → abren la ficha del artículo.

### 3. Listas (`listas`)
- Filas de 72px: nombre (Cormorant 19px), «X de Y cogidos», círculo de 46px con el número de
  pendientes (o «—» si la lista está vacía), chevron.
- Botón «+ Lista nueva» → diálogo con campo Nombre.
- Si hay listas cerradas: enlace «Ver listas cerradas (N)» que despliega filas con borde
  discontinuo, resumen «cerrada · N artículos» y botón «Reabrir».

### 4. Detalle de lista (`lista`)
La pantalla principal de uso en tienda.
- **Fila de artículo** (min-height 64px, filete inferior), de izquierda a derecha:
  1. Zona táctil grande (nombre + medida) que **marca/desmarca** comprado. Casilla de 30px con
     ✓; comprado = tachado + opacidad 0.5. Los comprados bajan al final de la lista.
  2. `−` y `+` (46px cada uno) para la cantidad; a 1, `−` elimina el artículo.
  3. **Botón de precio (126px)**: precio más barato conocido (14px, acento-700) + nombre de
     esa tienda (11px) + chevron. Es el acceso principal a los precios; abre la ficha.
- **Pie**: total estimado (oculto salvo `mostrarTotalLista`), nota «Toca el precio de un
  artículo para verlo en cada supermercado», botón «Cerrar lista».
- **Barra fija sobre la navegación**: «+ Añadir artículo del catálogo» (primario) y
  «Dictar o pegar varios a la vez» (secundario). El contenido reserva 152px al final.
- **Estados**: lista vacía (círculo +, título, texto y botón de dictado), cargando (5
  esqueletos de 64px con `animation: pulse 1.4s`), error de sincronización con «Reintentar»
  («los cambios se guardan en el móvil…»), y lista cerrada (banner acento + «Reabrir»,
  controles deshabilitados al 45%, barra de añadir oculta).

### 5. Panel «Añadir artículo» (hoja inferior, `add`)
- Buscador arriba (48px) + × de cierre; lista scrollable del catálogo con etiqueta de unidad y
  `+` / `✓` (los ya presentes salen con fondo acento-100 y no se duplican).
- Sin resultados → «Crear «X» y añadir» (crea artículo y lo mete en la lista).

### 6. Dictar o pegar (`dictar`)
- **Purpose**: meter muchos artículos de golpe (dictado del teclado del móvil o pegado).
- Textarea de 150px + **vista previa antes de insertar**: cada línea muestra `×cant`, nombre
  normalizado, nota y etiqueta `nuevo` / `del catálogo` / `ya está`.
- **Parser** (`parseaDictado`): separa por saltos de línea, comas y `;`; acepta cantidad
  delante (`2 leche`, `2x leche`) o detrás (`leche 2`); quita artículos «de/un/una/unos/unas»;
  normaliza sin acentos y en minúsculas; casa exacto y luego por inclusión con el catálogo;
  agrupa duplicados sumando cantidades. Los desconocidos se crean con unidad `ud`.
- Botón «Añadir N artículos» (deshabilitado visualmente al 45% si no hay nada). Al insertar,
  vuelve al detalle de la lista.

### 7. Catálogo (`articulos`)
- Buscador sticky arriba; filas de 60px: nombre, etiqueta de unidad (`.tag-neutral`), mejor
  precio (o «sin precio»), y botón «Ed» para editar.
- Editar/crear artículo: nombre genérico (sin marca ni formato) + **unidad de medida fija**
  (segmented litro/kilo/unidad). Borrar artículo elimina también sus precios y sus apariciones
  en listas.
- Pie: «+ Artículo nuevo» y «Apuntar precios del catálogo» (entrada masiva, ver 9).

### 8. Ficha de artículo (`ficha`) — la comparativa
- Cabecera: etiqueta de unidad + «Precios por litro/kilo/unidad».
- «COMPARATIVA · DE MÁS BARATO A MÁS CARO»: una fila por supermercado con marca vertical de
  6px (acento en el más barato), nombre, fecha del apunte, importe €/unidad, `+N%` respecto al
  más barato y botón `€` para actualizar/añadir precio en esa tienda. Las tiendas sin precio
  aparecen al final con «—» y «nunca apuntado aquí» (también con `€`).
- «EVOLUCIÓN»: barras verticales de la serie histórica de la tienda más barata (altura
  proporcional, mín. 8%), etiquetas dd/mm, y nota «Serie de X, en €/kg».
- Estado sin precios: caja de borde discontinuo + «Apuntar precio».

### 9. Apuntar precios en lista (`ronda`) — entrada masiva
- Se entra desde Catálogo → «Apuntar precios del catálogo» → elegir supermercado.
- Cabecera sticky: «Precios de el catálogo en Lidl», contador «N de M hoy», filtro por nombre.
- Cabecera de columnas: Artículo / Antes / Precio hoy.
- Una fila por artículo (62px): nombre + nota, precio anterior, e **input numérico inline**
  (`inputMode="decimal"`, 46px, alineado a la derecha) con el sufijo `/l`, `/kg`, `/ud`.
- Se guarda al salir del campo (`onBlur`); la fila guardada se tiñe (acento-100, borde acento)
  y la nota pasa a «guardado · +7% vs 0,92 €» o «guardado · primer precio aquí».
- Pie: nota «Cada precio se guarda al salir del campo. Deja en blanco lo que no veas» y botón
  «Listo · N precios guardados».

### 10. Hoja de precio (`sheet`) — apunte individual
Se abre desde el `€` de la ficha. Hoja inferior con cabecera sticky (tienda en kicker acento,
artículo en Cormorant 25px, ×), caja de aviso acento **«Euros por LITRO/KILO/UNIDAD»** con el
texto «Lo que cuesta UN LITRO, no lo que cuesta el brick o la botella», cifra grande (Cormorant
48px tabular) + sufijo, línea de referencia («Antes 0,92 € · +8%» / «Primer precio de este
artículo aquí»), teclado propio 4×3 (`1-9`, `0`, `,`, `⌫`, teclas de 50px) y botón sticky
«Guardar 1,49 € por litro». Máx. 2 decimales; una sola coma.

### 11. Ajustes (`ajustes`)
- **Supermercados**: filas con nombre, «N hoy», renombrar y borrar (borrar avisa de que se
  eliminan sus precios); campo + botón para añadir.
- **Apariencia**: segmented Claro/Oscuro (también hay conmutador en la cabecera).
- **Demostración de estados**: Normal / Cargando / Error, para revisar el detalle de lista.
- **Cuenta**: correo + «datos compartidos con 1 persona más» y «Cerrar sesión».

### Navegación
Barra inferior de 4 pestañas (62px, glifo + etiqueta 11px): **Inicio · Listas · Catálogo ·
Ajustes**. La pestaña activa va en acento con fondo acento-100. Cabecera con kicker + título;
botón «‹» cuando hay pila de navegación (lista, ficha, ronda, dictar) y conmutador de tema.

## Interactions & Behavior
- Tap en la fila = marcar comprado (lo más frecuente en tienda). Los comprados se reordenan al
  final por `sort` estable sobre `comprado`.
- Los precios se apuntan **solo** por el `›`/`€` del artículo (ficha) o por la entrada masiva.
- Hoja inferior: `animation: rise .18s ease-out`, backdrop `color-mix(neutral-900 55%)`,
  scroll interno con cabecera sticky y acción principal sticky abajo.
- Esqueletos de carga: `animation: pulse 1.4s ease-in-out infinite`.
- Tema oscuro: se aplica con `document.documentElement.dataset.theme = 'dark'` y un bloque
  `:root[data-theme="dark"]` que redefine los tokens. En React, un `ThemeProvider` equivalente.
- Objetivos táctiles nunca por debajo de 44px. Inputs a 16px para evitar el zoom de iOS.
- Focus visible: `outline: 2px solid var(--color-accent); outline-offset: 2px`.

## State Management
Estado único (en el prototipo, la clase de lógica; en React, un store):
`arts`, `sups`, `precios`, `listas`, `ruta {n, id, superId, ids, origen}`, `pila` (historial),
`q` (búsqueda), `borradores` (precios a medio escribir por artículo), `dictado` (textarea),
`sheet {artId, superId, buf}`, `dlg` (diálogo genérico por tipo), `add` (panel abierto),
`verCerradas`, `sim` (`null | 'loading' | 'error'`, solo demo), `tema`, `autenticado`.

Transiciones clave: `ir(n, params)` empuja a la pila; `atras()` la saca; `tab(n)` la vacía.
Diálogos por `tipo`: `nuevaLista`, `nuevoArt`, `editArt`, `renTienda`, `borrarTienda`,
`cerrarLista`, `tienda` (elegir tienda para un artículo), `tiendaRonda` (elegir tienda para
entrada masiva).

Persistencia y sincronización a implementar: escritura local optimista + cola de envío
(el estado de error ya está diseñado). Dos usuarios sobre los mismos datos: el `comprado` y la
cantidad son de la lista compartida; conviene resolución última-escritura-gana por campo.

## Design Tokens (sistema *Classical*)
Tomar todo de `styles.css` del sistema; valores clave en claro:
- `--color-bg #f3f2f2`, `--color-surface`, `--color-text #201f1d`, `--color-accent #b68235`
- Rampas 100–900 para neutral y accent (`--color-neutral-100…900`, `--color-accent-100…900`);
  fills claros 100–300, base 500, textos sobre tinte 700–900.
- `--color-divider` (filete 1px), `--shadow-sm/md/lg` (elevación mínima)
- Tipografía: `--font-heading` Cormorant Garamond (máx. semibold), `--font-body` Lora
- `--radius-sm/md/lg` (base 4px), escala `--space-*` (densidad 1.15×)
- Oscuro (definido en este diseño): bg `#191817`, surface `#232120`, text `#efece7`,
  accent `#dcaf68`, más las rampas invertidas del bloque `:root[data-theme="dark"]`.

Tamaños propios de esta app: filas 60–64px, controles 44–52px, cifra de precio 48px,
título de pantalla 24px, kickers 10px/.14em mayúsculas, notas 11–12px.

## Fotos (producto y supermercado)
- **Ficha de artículo**: bloque de foto de 180px (`.plate`) con «Hacer foto» (input file con
  `capture="environment"` → cámara trasera del móvil) y «Elegir del carrete» (mismo input sin
  `capture`). Con foto puesta aparece «Quitar foto».
- **Miniaturas**: 38px en las filas del detalle de lista (siguen la opacidad del artículo
  comprado) y 40px en las filas del catálogo. Sin foto, muestran la inicial del nombre en
  Cormorant sobre recuadro bordeado.
- **Logos de supermercado**: círculo de 40px en Ajustes; se toca para elegir imagen. Sin logo,
  inicial del nombre.
- En el prototipo las imágenes se leen con `FileReader` a data-URL y viven en el estado
  (`fotos[artId]`, `logos[superId]`). En producción: subir a almacenamiento, guardar la URL en
  el artículo/supermercado, generar miniatura y servir tamaños distintos para fila (80px) y
  ficha (720px).

## Assets
Ninguna imagen de partida. Iconos: el prototipo usa glifos tipográficos (`☰ ⊞ ⚙ ⌂ € ✓ − + × ‹ ›`).
En producción, sustituir por **Lucide** (el sistema Classical lo especifica): `list`,
`grid-2x2`, `settings`, `home`, `check`, `minus`, `plus`, `x`, `chevron-left/right`, `euro`,
`mic` para el dictado.

## Files
- `ListaCompra-standalone.html` — prototipo completo autocontenido (abrir en navegador).
- `Compra List.dc.html` — fuente del diseño: plantilla + clase de lógica (incluye `seed()` con
  20 artículos, 4 supermercados y 3 fechas de precios de ejemplo).

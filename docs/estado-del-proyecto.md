# Estado del proyecto

Última actualización: **20 de agosto de 2026**.

Documento de traspaso: dónde está el trabajo, qué está hecho y qué toca ahora.
El porqué de cada decisión está en [`arquitectura.md`](arquitectura.md) y en
[`base-de-datos.md`](base-de-datos.md).

---

## 1. Dónde estamos

**Fase 1 terminada**: la aplicación React recrea el prototipo completo, con
arquitectura limpia y datos simulados en memoria.

**Fase 2 en curso**: los puertos entran de uno en uno. Ya son de Supabase la
**autenticación**, los **supermercados**, los **artículos** y las **listas**;
solo faltan los **precios**, que siguen en memoria y sin semilla.

El plan original decía «solo infraestructura, no se toca nada más». Ha resultado
ser cierto a medias: el dominio y los casos de uso siguen intactos salvo en el
dictado (ver §5), pero **las pantallas sí han necesitado retoque**, porque se
escribieron contra mocks que no fallaban nunca y no tenían dónde contar un error
del servidor. De ahí salió `componentes/Aviso.tsx`.

---

## 2. Qué se ha hecho

### Stack elegido

Vite 6 + React 18 + TypeScript en modo estricto. Sin librería de estado ni de
routing: la navegación con pila y el estado compartido caben en un contexto, y
meter dependencias para eso habría sido más código, no menos.

### Las diez pantallas del prototipo

Login · Inicio · Listas · Detalle de lista · Panel de añadir · Dictar o pegar ·
Catálogo · Ficha de artículo · Apuntar precios en lista · Ajustes.

Con sus estados: lista vacía, cargando (esqueletos), error de sincronización,
lista cerrada, artículo sin precio en ninguna tienda, tienda sin apunte.

### El sistema visual

*Classical* portado a `src/presentacion/estilos/tokens.css`: rampas de color,
Cormorant Garamond + Lora, tema claro y oscuro, y las clases de componente
(`.btn`, `.input`, `.seg`, `.tag`, `.dialog`, `.plate`).

### Comprobado en el navegador

Recorrido completo sobre el servidor de desarrollo, sin errores de consola:

- Login y sesión recordada.
- Inicio con la compra en curso, las tres cifras y los últimos precios.
- Detalle de lista: los cogidos bajan al final, «sin precio» sale explícito.
- Ficha: comparativa ordenada, sobrecoste en %, evolución, tienda sin apunte.
- Hoja de precio: teclado propio, guardó 1,25 €/ud en Carrefour, calculó +54%
  y lo fechó con el día real.
- Ronda de precios: guardado al salir del campo, contador «1 de 20 hoy».
- Dictado: `2 leche, pan, 6 huevos / mojo picon x3` produjo las cuatro filas con
  sus etiquetas y creó «Mojo picon» en €/ud.
- Diálogo de lista nueva, panel de añadir con filtro, catálogo y ajustes.

`npm run build` pasa limpio (typecheck incluido).

### Comprobado contra la base de datos real

Fase 2, verificando cada paso **consultando la tabla**, no solo la pantalla:

- Artículos: listar, crear, renombrar y cambiar unidad en un mismo guardado,
  borrar, y duplicado rechazado tanto al crear como al renombrar —incluido
  `PRUEBA LECHE` contra `Prueba leche`, que confirma el `citext`.
- La ficha sigue abriendo después de renombrar, que es lo que valida `id =
  nombre`.
- Alta desde el panel de añadir con «Crear … y añadir».
- Dictado con una línea fuera del catálogo: se insertan las demás y `productos`
  no crece.

Las tablas se dejaron como estaban: vacías.

---

## 3. Los repositorios de Supabase

`src/infraestructura/supabase/cliente.ts` crea el cliente leyendo
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (plantilla en `.env.example`).
Sin `.env`, todo sigue simulado y con semilla: el proyecto arranca recién
clonado. `contenedor.ts` es el único sitio donde se elige qué implementación
entra.

### Hecho

- `autenticacion.ts` — `signInWithPassword`, sin `signUp` a propósito.
- `supermercados.ts` — tabla `supermercados`.
- `articulos.ts` — tabla `productos`. Es el gemelo del anterior; si hay que
  escribir otro adaptador, este es el patrón.
- `listas.ts` — tablas `listas` y `lista_items` (§3 quáter).

### Falta

- `precios.ts` — `guardar` **sustituye** el precio de esa fecha en esa tienda,
  no duplica → `upsert` sobre `unique (producto, supermercado, fecha)`.

### Decisión tomada: `id = nombre`

El esquema usa **el nombre como clave primaria** de `productos` y
`supermercados`; el dominio usa `id`. Se ha elegido traducir `id === nombre` y
filtrar con `.eq('nombre', id)`, sin tabla de correspondencias.

Lo que eso implica, y por qué se acepta: **renombrar cambia la identidad del
objeto**. No rompe nada porque el `on update cascade` arrastra precios y
`lista_items`, y `AppProvider` recarga la instantánea entera tras cada acción.
Comprobado en la base real: tras renombrar un artículo, su ficha sigue abriendo.

La alternativa —añadir `id uuid` al esquema— se descartó porque obligaba a tocar
la base de datos, que está marcada como cerrada.

Efecto secundario del `citext`: «Leche» y «leche» son el mismo artículo. Está
comprobado que el alta duplicada se rechaza aunque cambie la caja.

### Contratos que el adaptador debe respetar

Son reglas de negocio, no detalles de almacenamiento:

- `RepositorioArticulos.borrar` se lleva sus precios y sus apariciones en
  listas → lo hace el `on delete cascade`.

### Los errores de Postgres se traducen a castellano

Es la parte que no estaba prevista y que más código ha movido. Cada adaptador
tiene una función `mensaje(error)` que convierte el código en algo que se pueda
leer en el pasillo del supermercado:

| Código  | Qué ha pasado          | Qué se enseña                              |
| ------- | ---------------------- | ------------------------------------------ |
| `23505` | clave duplicada        | «Ya existe un artículo con ese nombre.»     |
| `23503` | clave ajena rota       | el artículo o la lista ya no existen       |
| `23514` | `check` incumplido     | longitud 1–50, o unidad no válida          |
| `22001` | texto demasiado largo  | longitud 1–50 (no es un `check`)            |
| `42501` | RLS lo rechaza         | «La sesión no tiene permiso para esto.»     |

En `productos` hay **dos** `check`, así que para el `23514` se mira el nombre de
la restricción y se distingue el de longitud del de unidad.

Quien enseña el mensaje es `componentes/Aviso.tsx`. Lo usan `DialogoApp`
(altas y ediciones), `Ajustes` (tiendas), `PanelAnadir` y `Dictar`. La regla es
la misma en todos: **si el servidor rechaza, el formulario se queda abierto con
lo escrito intacto**, nunca se cierra como si hubiera ido bien.

### Autenticación

`signInWithPassword` de Supabase Auth, en `supabase/autenticacion.ts`. No hay
`signUp` a propósito: con la clave anónima siendo pública, cualquiera se crearía
una cuenta y el RLS le daría acceso a todo.

Recordatorio del diseño de seguridad: hay que **desactivar el registro público**
en Supabase (Authentication → Providers → Email → *Allow new users to sign up* =
OFF) y crear las dos cuentas a mano. El modelo de RLS da acceso a todo a
cualquier usuario autenticado.

---

## 3 bis. El dictado ya no crea artículos

Cambio de comportamiento decidido el 20 de agosto de 2026, y el único sitio
donde la fase 2 ha tocado dominio y casos de uso.

**Antes**: lo dictado que no estaba en el catálogo se creaba solo, en €/ud.
**Ahora**: `parseaDictado` descarta esas líneas y no llegan ni a la previa.
Dar de alta un artículo se hace a conciencia desde Catálogo, eligiendo unidad.

Por qué se cambió: con `productos` ya en Supabase, el bucle de `insertarDictado`
creaba artículos uno a uno y **una línea inválida dejaba escritura a medias**.
Se reprodujo pegando una línea de más de 50 caracteres: el primer artículo se
creaba, el segundo fallaba con `23514`, y como `AppProvider` solo recarga al
terminar bien, el catálogo en pantalla quedaba viejo y el segundo intento
chocaba contra un `23505` sin salida posible.

Al no crear nada, el dictado dejó de escribir en el catálogo: ahora solo toca el
repositorio de listas. Eso resolvió de paso que estuviera medio conectado.

Con las listas ya en Supabase (§3 quáter) queda entero: comprobado en la base
real que dictar escribe en `lista_items` y que `productos` no crece, así que no
queda ni un camino del dictado pasando por el almacén en memoria.

El descarte es **silencioso**, por decisión expresa: la previa enseña
exactamente lo que se va a insertar, ni más ni menos. Queda pendiente decidir si
el texto de ayuda debería avisar de que solo entra lo que ya está en el
catálogo; hoy no lo dice.

Consecuencias en el código: `LineaDictada.artId` ya nunca es nulo y
`EstadoLinea` perdió `'nuevo'`. El typecheck confirmó que no quedaban caminos
vivos apuntando a la creación.

---

## 3 ter. Usarla en el móvil

Es una web, no una aplicación nativa. Se sirve desde el PC y se abre en el
navegador del móvil, en la misma Wi-Fi.

**Altura de la ventana.** El marco usaba `height: 100vh`, y en el móvil eso
**no** es lo que se ve: el navegador lo mide con la barra de direcciones
retraída, así que el marco quedaba más alto que el hueco visible y, con
`overflow: hidden`, la barra de pestañas caía por debajo del borde y no había
forma de llegar a ella. Se arregló con `100dvh` (altura *visible*, se reajusta
sola) dejando `100vh` de respaldo, en las clases `.marco-app` y `.marco-fondo`
de `tokens.css`. La barra de pestañas lleva además `.barra-segura`, que se
aparta de la barra de gestos con `env(safe-area-inset-bottom)`.

**Instalarla como aplicación.** Android solo la instala de verdad —sin barra de
direcciones— si la sirve un **origen seguro**. Por eso:

- `public/manifest.webmanifest` con `display: standalone` e iconos, enlazado
  desde `index.html`. Sin manifiesto, «añadir a la pantalla de inicio» hace un
  acceso directo que abre el navegador con su barra.
- Los iconos los genera `scripts/genera-iconos.ps1` con GDI+, sin dependencias
  nuevas: cuadrado de acento y un «€» en serif. Hay versión `maskable` aparte,
  porque Android recorta el icono en círculo.
- `vite.config.ts` sirve por HTTPS **si encuentra** `certs/dev-key.pem` y
  `certs/dev-cert.pem`; si no, arranca en HTTP como siempre. Los certificados
  son de cada máquina y están en `.gitignore`.

Para generarlos hace falta `mkcert`, y **el certificado raíz hay que instalarlo
a mano** en Windows y en cada móvil. Es un cambio en el almacén de confianza del
sistema, así que lo hace la persona, no el asistente.

Dos cosas que pueden cortar el acceso desde el móvil, y que ya han pasado: que
el móvil esté en datos y no en la Wi-Fi, y que Windows tenga la red clasificada
como **Pública**, perfil en el que bloquea las conexiones entrantes. En ese caso
no sale un error, sale una **página en blanco**, porque los paquetes se
descartan en silencio.

---

## 3 quáter. Las listas en Supabase

El adaptador es `supabase/listas.ts`, contra `listas` y `lista_items`. Con él
dentro, el almacén en memoria solo sostiene ya los **precios**.

### Aquí la identidad SÍ es directa

`listas.id` es un `uuid` de verdad, así que `Lista.id === listas.id`. El truco
de `id = nombre` (§3) es **exclusivo** de productos y supermercados, donde el
nombre es la clave primaria; repetirlo aquí sería un error.

`ItemLista.artId` sí es el **nombre** del artículo, porque
`lista_items.producto` referencia `productos(nombre)`. Encaja sin traducir.

### Hubo que abrir el esquema: `listas.cerrada`

Único bloqueo real de este puerto. El dominio tiene `Lista.cerrada` desde la
fase 1 y hay pantallas que cierran y reabren, pero la tabla nació sin la
columna, así que cerrar una lista no se guardaba en ninguna parte. Se añadió con
`supabase/migracion-01-lista-cerrada.sql`. El porqué y las alternativas
descartadas, en el historial de [`base-de-datos.md`](base-de-datos.md).

### `guardarItems` sustituye, y no hay transacción

El puerto promete que `guardarItems` deja la lista **exactamente** con los items
que se le pasan. Contra PostgREST eso son forzosamente dos peticiones —escribir
las que van, borrar las que sobran— y entre una y otra no hay transacción.

El orden es **escribir primero, borrar después**, y está elegido a propósito: si
la segunda petición falla —se corta la conexión en el pasillo— la lista queda
con items **de más**, nunca de menos, y el siguiente guardado que salga bien la
deja correcta, porque cada uno manda el conjunto completo. Al revés, un fallo
entre medias dejaría la lista **vaciada**.

Además, todos los errores de datos —artículo borrado, cantidad no válida, RLS—
saltan en la primera petición: si esa falla, no se ha borrado nada.

Se valoró una función RPC en plpgsql, atómica de verdad y de un solo viaje. Se
descartó por no meter lógica en una base que hasta ahora solo tiene tablas. Si
alguna vez la latencia molesta, es el sitio por donde volver: **cada toque de la
interfaz reescribe la lista entera**, y con `AppProvider` recargando después,
cada `+` son tres viajes al servidor.

Lo que **ninguna de las dos** arregla es que sois dos a la vez: el cliente manda
el conjunto completo calculado sobre una lectura que puede estar vieja, así que
gana el último que escriba. Eso sigue pendiente, en §4.

### El orden de los items lo pone la consulta

`lista_items` no guarda el orden en que se añadió cada artículo —no hay columna
para eso—, y sin `order` PostgREST los devuelve como quiera: las filas bailarían
en cada recarga. Se piden **ordenados por nombre de artículo**. Es un cambio
respecto al mock, que conservaba el orden de inserción. Lo que sí se conserva es
que los cogidos bajan al final, porque eso lo hace `ordenDeCompra` en el
dominio.

### Dónde va el aviso cuando algo falla

`DetalleLista` y `Listas` lanzaban estas acciones sin esperarlas (`void
acciones...`), así que un fallo del servidor se perdía sin que nadie se
enterase. Ahora se capturan, pero el aviso **no** va arriba de la pantalla: en
una lista de veinte artículos, quien está tocando la última fila no lo vería
nunca. La regla es que **el aviso sale pegado al control que ha fallado** —bajo
su propia fila, o dentro de la fila de la lista cerrada que no se ha podido
reabrir—, que es exactamente donde está mirando quien acaba de tocar.

`Aviso.tsx` traduce además el fallo de red, que es el más probable en un
supermercado: sin él, el pasillo enseñaba «TypeError: Failed to fetch».

### Comprobado contra la base real

Crear lista, añadir tres artículos, subir y bajar cantidad, marcar y desmarcar
comprado, quitar un artículo, dictar, cerrar, reabrir y **recargar la página**
—que es justo lo que antes no sobrevivía—, verificando cada paso consultando las
tablas. También el `on delete cascade`: al borrar un artículo del catálogo
desaparece su fila de `lista_items`. Y un artículo llamado `Pan, "del (raro)"`,
para confirmar que el escapado del `not in` del borrado aguanta comas, comillas
y paréntesis.

Los cinco códigos de error se comprobaron provocándolos de verdad contra la
base: `23514` llega como `lista_items_cantidad_check`, y los dos `23503` se
distinguen por `lista_items_lista_fkey` y `lista_items_producto_fkey`, que es lo
que mira `mensaje()`.

Las tablas `listas` y `lista_items` se dejaron como estaban: vacías.

---

## 4. Lo que queda fuera de la fase 2

- **Fotos**: hoy son data-URL en `localStorage` (`useFotos`). En producción,
  subirlas a Supabase Storage, guardar la URL en el artículo o el supermercado y
  servir dos tamaños: 80px para las filas, 720px para la ficha.
- **Sincronización entre los dos usuarios**: escritura optimista con cola de
  envío. El estado de error ya está diseñado y se puede forzar desde
  Ajustes → Demostración de estados. Para `comprado` y `cantidad`, resolución
  última-escritura-gana por campo.
- **Iconos**: el prototipo usa glifos tipográficos (`☰ ⊞ ⚙ ⌂ € ✓ − + × ‹ ›`) y
  la app los mantiene. El sistema *Classical* especifica **Lucide**; sustituirlos
  es una tarea aparte.
- **Control de versiones**: el proyecto **no es un repositorio git**. Conviene
  `git init` antes de tocar nada más.

---

## 5. Decisiones que no conviene revertir sin pensarlo

- **El total del ticket está apagado** (`MOSTRAR_TOTAL_LISTA` en
  `src/presentacion/config.ts`). Lo que compara la app es el precio por unidad
  de cada artículo, no lo que suma una cesta.
- **La comparación es por artículo**, nunca un total de cesta por supermercado:
  mezclar productos no dice si el pan es más barato en un sitio o en otro.
- **La unidad es fija por artículo**, no por precio.
- **Un artículo sin precio se muestra como «sin precio»**, nunca como 0,00 €.
- **Precio 0 o vacío borra el precio de hoy**.
- **Todos los puertos y casos de uso son asíncronos** aunque hoy los datos estén
  en memoria. Es justo lo que permite que Supabase entre sin tocar nada más.
- **`id = nombre` en `productos` y `supermercados`** (§3). Volver atrás implica
  cambiar el esquema, que está cerrado.
- **El dictado no crea artículos** (§3 bis). Lo contrario dejaba escrituras a
  medias en el catálogo.
- **Las alturas de pantalla van en `dvh`, no en `vh`** (§3 ter). Con `vh` la
  barra de pestañas se sale de la ventana en el móvil.
- **En `listas` el id NO es el nombre** (§3 quáter). Es un `uuid` de verdad; el
  `id = nombre` es cosa de productos y supermercados.
- **`guardarItems` escribe primero y borra después** (§3 quáter). Al revés, un
  fallo entre las dos peticiones vacía la lista.
- **El aviso de error va pegado al control que falla**, no arriba de la pantalla
  (§3 quáter). Arriba no lo ve quien está tocando la última fila.

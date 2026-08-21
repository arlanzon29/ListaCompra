# Estado del proyecto

Última actualización: **21 de agosto de 2026**.

Lo último: el panel de añadir pegado arriba para que no lo tape el teclado
(§3 quaterdecies), **la fecha de cada lista** más **duplicar una lista**
(§3 quindecies), y **el nombre del artículo a 21px** en la lista de la compra
(§3 sexdecies). Queda un **pendiente** (§4 bis), y es un fallo de verdad: los
artículos con acentos rompen la subida de fotos.

Documento de traspaso: dónde está el trabajo, qué está hecho y qué toca ahora.
El porqué de cada decisión está en [`arquitectura.md`](arquitectura.md) y en
[`base-de-datos.md`](base-de-datos.md).

---

## 1. Dónde estamos

**Fase 1 terminada**: la aplicación React recrea el prototipo completo, con
arquitectura limpia y datos simulados en memoria.

**Publicada** en https://arlanzon29.github.io/ListaCompra/ (§3 ter).

**Fase 2 terminada**: los puertos son de Supabase —**autenticación**,
**supermercados**, **artículos**, **listas**, **precios** y, desde §3 decies,
**imágenes**—, y el **reloj** es del sistema y no depende de dónde estén los
datos.

Fuera del caso «sin `.env`», **no queda ningún camino vivo que pase por
`infraestructura/memoria`** (§3 quinquies).

**Después de la fase 2**: la pantalla de inicio dejó de cargar la instantánea
completa y se alimenta de `resumen_inicio()`, la primera función de la base
(§3 sexies). Arrancar la aplicación es ahora **una petición** en vez de cinco, y
el histórico de precios ya no se descarga para pintar tres cifras.

Y detrás, la misma idea aplicada al pasillo: tocar un item de una lista pasó de
**8 peticiones a 2** (§3 septies). El puerto de listas dejó de saber solo
«reescribe todos los items» y `AppProvider` dejó de recargarlo todo por un
booleano.

Y las **fotos** han salido del navegador (§3 decies). Eran lo único que seguía
viviendo en `localStorage`, con el fallo de fondo de que la foto que hacía uno
el otro no la veía nunca. Ahora se reducen en el móvil y se suben a **Supabase
Storage**, con un puerto propio que no viaja con el catálogo.

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
- `precios.ts` — tabla `precios` (§3 quinquies). Fue el último.

### Falta

Nada de la fase 2. Las fotos, que eran lo que quedaba fuera, ya están dentro
(§3 decies): hay un séptimo adaptador, `imagenes.ts`, contra Storage en vez de
contra una tabla. Lo que sigue pendiente es la **sincronización** entre los dos
usuarios (§4).

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
| `22003` | desbordamiento numérico| cantidad o precio demasiado grandes        |
| `42501` | RLS lo rechaza         | «La sesión no tiene permiso para esto.»     |

En `productos` hay **dos** `check`, así que para el `23514` se mira el nombre de
la restricción y se distingue el de longitud del de unidad.

Los nombres de restricción que mira `mensaje()`, todos comprobados provocándolos
contra la base y no de memoria:

| Tabla         | Código  | Restricción                              |
| ------------- | ------- | ---------------------------------------- |
| `lista_items` | `23514` | `lista_items_cantidad_check`             |
| `lista_items` | `23503` | `lista_items_lista_fkey` · `lista_items_producto_fkey` |
| `precios`     | `23514` | `precios_precio_check`                   |
| `precios`     | `23503` | `precios_producto_fkey` · `precios_supermercado_fkey` |
| `precios`     | `23505` | `precios_producto_supermercado_fecha_key` |

El `23505` de `precios` **no debería salir nunca**: es la restricción que el
`upsert` de `guardar` resuelve. Si aparece, el diagnóstico es concreto — el
`onConflict` no está apuntando a ella (§3 quinquies).

Quien enseña el mensaje es `componentes/Aviso.tsx`. Lo usan `DialogoApp`
(altas y ediciones), `Ajustes` (tiendas), `PanelAnadir`, `Dictar`,
`DetalleLista` y `Listas` (§3 quáter), y `HojaDePrecio` y `Ronda`
(§3 quinquies). La regla es
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
  nuevas: cuadrado de acento y un **carrito de la compra** trazado con vectores
  sobre un lienzo de 100 unidades. Antes era un «€» en serif, y decía «dinero»
  antes que «compra»; además dependía de que Georgia estuviera instalada. Hay
  versión `maskable` aparte, porque Android recorta el icono en círculo.
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

### Publicada en GitHub Pages

**En marcha desde el 20 de agosto de 2026**, en
https://arlanzon29.github.io/ListaCompra/

Servirla desde el PC obliga a tenerlo encendido, a estar en la misma Wi-Fi y a
instalar el certificado de `mkcert` en cada móvil. Publicarla quita las tres
cosas: dirección fija, HTTPS de verdad y accesible desde cualquier red.

El despliegue lo hace `.github/workflows/deploy.yml` en cada push a `main`.
GitHub **no ejecuta** `npm run dev`: Pages solo sirve ficheros estáticos, así
que el workflow compila con `npm run build` —que pasa el typecheck antes— y
publica `dist`.

Dos cosas hay que hacerlas a mano, una sola vez, en la web de GitHub, y sin las
dos el despliegue no funciona:

- **Settings → Pages → Source: GitHub Actions**. Sin esto, `desplegar` falla con
  un 404.
- **Settings → Secrets and variables → Actions**: los secretos
  `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, porque `.env` no se versiona.
  Sin esto **no falla nada**, que es lo peligroso: compila y publica una
  aplicación que funciona con los datos de ejemplo en memoria.

Las versiones de las acciones se subieron a `checkout` v7, `setup-node` v7,
`upload-pages-artifact` v5 y `deploy-pages` v5, y el Node de compilación a 22,
porque GitHub avisaba de que las anteriores pedían Node 20 y el runner las
forzaba a Node 24.

#### El `base`, y por qué `isPreview` no sobra

Pages sirve el proyecto en un subdirectorio, `arlanzon29.github.io/ListaCompra/`,
así que la compilación necesita `base: '/ListaCompra/'`. Sin eso el HTML pide
los ficheros en la raíz del dominio y sale una página en blanco.

Solo se aplica al compilar; en desarrollo se queda en `/` para que abrirla desde
el móvil en la red local no cambie de dirección. La condición mira **`command
=== 'build'` o `isPreview`**: `vite preview` sirve lo ya compilado pero llega a
la configuración con `command === 'serve'`, y sin comprobarlo servía en la raíz
una compilación que pide todo desde `/ListaCompra/`. Página en blanco que
parecía un fallo del despliegue y no lo era. Se descubrió al comprobarlo.

#### El manifiesto va con rutas relativas

Vite reescribe las rutas del `index.html` al compilar, pero
`public/manifest.webmanifest` lo copia **tal cual**. Con `start_url`, `scope` e
iconos en rutas absolutas (`/`, `/icono-192.png`), la PWA se rompía bajo
`/ListaCompra/`: los iconos daban 404 y `start_url` apuntaba fuera del sitio.

Con rutas relativas (`.`, `./`, `icono-192.png`) resuelven contra la dirección
del propio manifiesto, así que el mismo fichero vale en local y en Pages.
Comprobado sirviendo la compilación: los tres iconos, `start_url` y `scope`
caen dentro de `/ListaCompra/`.

#### El repositorio tuvo que pasar a público

En el plan gratuito, **Pages no publica repositorios privados**: los ajustes
responden «Upgrade or make this repository public to enable Pages». Se valoró
GitHub Pro (unos 4 $/mes) y Cloudflare Pages (gratis y con el repositorio
privado), y se eligió abrir el repositorio.

Antes de abrirlo se revisó lo versionado: no hay claves, ni la URL del proyecto
Supabase, ni un solo correo real —los dos que salen, `casa@ejemplo.es` y
`tu@correo.es`, son de relleno del prototipo—. Lo que sí queda a la vista es el
correo de los commits y toda esta documentación, que describe el modelo de
seguridad.

Y la web es pública en cualquier caso: la visibilidad privada de un sitio de
Pages solo existe en Enterprise. Cualquiera con la dirección llega a la pantalla
de login, y la clave anónima viaja dentro del paquete, que es el diseño de
siempre: quien protege los datos es el RLS.

Por eso hay **una condición que deja de ser teórica**: el registro público tiene
que seguir desactivado en Supabase (Authentication → Sign In / Providers →
Email → *Allow new users to sign up* = OFF). Con el registro abierto, cualquiera
se crea una cuenta y el RLS le da acceso a toda la compra. Ya estaba avisado en
§3; publicar lo convierte en algo que hay que verificar, no suponer.

#### Comprobado sobre la web publicada

No basta con que cargue, porque el fallo probable aquí es **silencioso**: si
faltan los secretos, la aplicación arranca con los datos de ejemplo en memoria y
no se queja. Se verificó que el paquete servido lleva dentro la URL y la clave
reales, que una petición al REST desde el dominio publicado responde `401` —lo
correcto: sin sesión el RLS no deja leer— y que `start_url` y los tres iconos del
manifiesto caen dentro de `/ListaCompra/`.

El primer despliegue falló en `desplegar` con `Failed to create deployment
(status: 404)` porque Pages aún no estaba activado. El trabajo de `compilar` sí
pasó, lo que de paso confirmó que `npm ci`, el typecheck y `vite build`
funcionan en el runner de Ubuntu y no solo en Windows.

`npm run preview` sirve la compilación en local para comprobarla antes de subir;
la configuración `lista-compra-compilada` de `.claude/launch.json` lo lanza.


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

## 3 quinquies. Los precios en Supabase

`supabase/precios.ts`, contra la tabla `precios`. Fue el último puerto, y con
él **el almacén en memoria deja de usarse**.

### Dos traducciones, no una

- **Identidad**, como en artículos y supermercados: `Precio.artId` es
  `productos(nombre)` y `Precio.superId` es `supermercados(nombre)`. En listas
  no: allí el id es un `uuid` de verdad.
- **Nombre de columna**: el dominio dice `importe` y la columna se llama
  `precio`. Se traduce en los dos sentidos.

### El `onConflict` no apunta a la clave primaria

`guardar` **sustituye** el precio de esa fecha en esa tienda. Es un `upsert`
sobre `unique (producto, supermercado, fecha)`, que **no** es la clave primaria
de la tabla: la clave es un `id bigint` automático.

Eso importa porque un `upsert` sin `onConflict` va contra la clave primaria, no
encontraría conflicto nunca e insertaría una fila por apunte. Comprobado contra
la base: sin `onConflict` sale un `23505` contra
`precios_producto_supermercado_fecha_key`. Con él, apuntar dos veces el mismo
día deja **una sola fila, con el mismo `id` y el mismo `created_at`**.

Detalle que despista al mirarlo en el panel de Supabase: `created_at` se pone al
crear la fila y **un upsert que actualiza no lo toca**, así que la fila parece
vieja aunque el precio sea nuevo. La tabla no tiene `updated_at`: se sabe el día
del apunte (`fecha`), no la hora.

### `listar()` va paginado, y no por rendimiento

`listar()` devuelve el **histórico entero**, porque el dominio lo necesita:
`serieHistorica` dibuja la evolución de la ficha y la ronda necesita el último
precio *anterior a hoy*. La vista `precios_actuales` no vale para eso: da una
única fila por producto y tienda, así que en cuanto apuntas hoy la columna
«Antes» de la ronda se quedaría vacía justo mientras se usa.

Lo que sí hubo que resolver es un fallo silencioso. **PostgREST corta a su
`max-rows`, que en Supabase son 1000 filas.** Medido de verdad, insertando 1350
filas de prueba:

| Consulta                    | Filas devueltas |
| --------------------------- | --------------- |
| `select` sin `limit`        | 1000            |
| `select` con `.limit(5000)` | **1000**        |

Es decir: 350 precios desaparecían **sin un solo error**, y `.limit()` no lo
arregla, porque el tope lo pone el servidor y el `limit` del cliente solo puede
bajarlo. Un histórico truncado no se ve como un fallo: se ve como una ficha con
menos evolución y una comparativa a la que le faltan tiendas.

Por eso `listar()` pide por páginas hasta agotar el `count: 'exact'` que viene
en la cabecera de la misma petición. Se para por la cuenta y no por «la página
vino corta», porque eso último daría por bueno justo el recorte que se quiere
evitar. Con menos de 1000 precios es **una sola petición**, igual que antes.

El orden es `fecha desc, id`. El `id` está para desempatar: muchos precios
comparten día, y sin un desempate único el servidor puede devolverlos en
distinto orden en cada página, repitiendo unos y saltándose otros.

### Cuándo toca partir el puerto

**Desactualizado desde §3 septies**, y conviene leerlo entero antes de actuar:
el `+` de una lista ya **no** se trae el histórico. Lo que decía esta sección era
que `AppProvider` recargaba la instantánea tras cada acción, y por eso cada `+`
descargaba `precios` completo. Eso se arregló estrechando el puerto de listas.

Lo que sigue en pie es el número a vigilar: **tres páginas —unos 3000 precios—**,
con una fila pesando unos 100 bytes. Lo que cambia es quién lo dispara. Ya no es
el `+` de una lista; son las acciones que siguen pasando por `tras` —crear o
editar un artículo, apuntar un precio, el dictado— y cualquier entrada a una
pantalla que aún lea de la instantánea.

Ese es el momento de la alternativa que hoy se descartó: `listar()` contra la
vista `precios_actuales` —escrita justo para esto y que no usa nadie— y un
`historico(artId, superId)` bajo demanda que solo pida la ficha. Cuesta tocar
`RepositorioPrecios` (dominio), `cargarTodo` (caso de uso), el mock de memoria y
`Ficha`, y hay que resolver aparte lo de la columna «Antes» de la ronda.

Con una ronda semanal de 15 artículos son unas 780 filas al año: las 1000 llegan
hacia el segundo año, las 3000 hacia el cuarto.

### El contenedor ya no monta el almacén en memoria

`dependenciasPorDefecto` partía de `...enMemoria(almacenVacio())` y sustituía
encima los puertos migrados. Al entrar los precios, de aquel spread **solo
habría quedado el reloj**: montar cuatro repositorios simulados para sacarles el
reloj engaña a quien lo lee, porque parece que algo sigue sin conectar. Ahora se
nombra cada puerto.

El reloj sigue siendo el del sistema, y eso no cambia: es un puerto para poder
fijar el «hoy» en una prueba, no algo que dependa de dónde estén los datos.

**El único camino vivo que pasa por `infraestructura/memoria` es el caso «sin
`.env`»**, que existe a propósito para que el proyecto arranque recién clonado.
`almacenVacio()` se quedó sin usar y sigue exportado en `memoria/almacen.ts`.

### Las dos pantallas que apuntan precios perdían los fallos

Las dos se escribieron contra mocks que no fallaban nunca, y ninguna capturaba
nada:

- **`HojaDePrecio`** hacía el `await` y cerraba la hoja a continuación. Si el
  servidor rechazaba, la promesa quedaba sin recoger y **la hoja se cerraba
  igual, como si hubiera ido bien**. Ahora solo cierra si el guardado se acepta,
  y el aviso sale justo encima del botón, que es donde está el dedo.
- **`Ronda`** borraba el borrador de la fila **antes** del `await`. Si fallaba,
  se perdía lo recién tecleado sin que nadie se enterase. Ahora el borrador solo
  se descarta cuando el servidor acepta, y si rechaza **lo tecleado sigue en el
  campo**. El aviso sale bajo su propia fila, no arriba: en una ronda de veinte
  artículos, un aviso en la cabecera no lo ve quien acaba de teclear la última.
  Es la misma regla que en `DetalleLista` (§3 quáter).

### Desde la hoja no se podía borrar un precio

La regla «precio 0 o vacío borra el precio de hoy» estaba implementada en
`guardarPrecio`, pero **solo se alcanzaba desde la ronda**, dejando el campo en
blanco. En `HojaDePrecio` el botón era `disabled={!valor}`, así que un 0 no
pasaba nunca; justo en la pantalla donde el documento dice que se deshace «un
apunte equivocado sin salir del teclado». Venía del prototipo.

Ahora el botón se enciende con dos condiciones, y las dos importan:

- **Algo tecleado.** Con el campo vacío sigue apagado: abrir la hoja y darle sin
  querer no puede borrar un precio.
- **Que haya precio de hoy** que borrar. Si el último apunte es de otro día, un
  0 no borraría nada y el botón estaría prometiendo algo que no pasa.

Cuando se cumplen, el botón **cambia de texto a «Borrar el precio de hoy»**, en
vez de decir «Guardar» para algo que borra.

### La comparativa de la ficha: la fila entera es el botón

El control para apuntar era un **«€» suelto** a la derecha de cada fila, de
40 px. No se veía como algo que se toca, y el motivo es concreto: **en esta app
el € es contenido** —va en cada precio y en cada etiqueta de unidad—, así que un
glifo sin borde ni fondo se lee como decoración.

Ahora se toca la fila entera, con 62 px de alto, que es el patrón que ya usaba
`DetalleLista`. A la derecha va la palabra de lo que va a pasar: **«Apuntar ›»**
donde no hay precio, **«Actualizar ›»** donde sí. El `›` es el mismo de «Apuntar
precios del catálogo».

No se usó un icono a propósito: los iconos del prototipo son glifos
tipográficos y pasarlos a Lucide es una tarea aparte (§4).

### Comprobado contra la base real

Verificando cada paso **consultando la tabla**, no solo la pantalla:

- Apuntar un precio desde la hoja: la fila aparece con la fecha del día.
- Volver a apuntarlo el mismo día: **una sola fila**, mismo `id`, precio nuevo.
  Es la prueba de que el `onConflict` apunta a la restricción correcta.
- Teclear un 0: la fila **desaparece**, y solo esa —el precio de la otra tienda
  quedó intacto—. La ficha recolocó la comparativa sola y la tienda volvió a
  «nunca apuntado aquí / sin dato», nunca a `0,00 €`.
- Los cinco códigos, provocados de verdad (tabla de §3), incluido el `42501` con
  un cliente sin sesión.
- El desbordamiento `22003` es alcanzable de verdad: el teclado de
  `HojaDePrecio` limita a dos decimales pero **no limita los enteros**.
- Más de dos decimales **no dan error**: Postgres redondea (`1,23456` a `1,23`).
  El caso de uso ya redondeaba antes con `aCentimos`.
- Sobre la web publicada: el paquete que sirve Pages lleva dentro el adaptador
  nuevo y las credenciales reales, no la aplicación simulada.

### Lo que quedó escrito, y qué se ha comprobado ya

Cerrado el **21 de agosto de 2026**, contra la base real:

- **La ronda entera.** Se abrió por fin desde que se arregló, y las tres cosas
  que quedaban en el aire funcionan: el contador «X de N hoy», el guardado al
  salir del campo y la columna «Antes».
- **El sobrecoste en %.** Hacía falta el mismo artículo apuntado en dos tiendas
  a la vez, que hasta entonces no se había dado. La comparativa las ordena de
  más barata a más cara, la primera sale marcada y sin porcentaje —es la
  referencia, no tiene sobre qué encarecerse— y la segunda con su recargo sobre
  ella.

- **El aviso de error, pintado en pantalla.** Tecleando `123456789` en la ronda
  sale «El precio es demasiado grande», que es la traducción del `22003` de
  Postgres. Con eso queda probado el camino entero —el servidor rechaza, el
  adaptador traduce, la pantalla pinta—, que hasta ahora solo estaba comprobado
  en el adaptador.

  Para volver a provocarlo: `precio` es `numeric(10,3)`, así que quedan **siete**
  dígitos para la parte entera y hace falta teclear ocho o más. El número que
  había escrito aquí, «más de ocho cifras», era el de cuando la columna tenía dos
  decimales (§3 octies).

Con esto **no queda nada sin comprobar** de los puertos de la fase 2. Lo que
sigue abierto está en §4, y es trabajo por hacer, no por probar.

La tabla `precios` **no se dejó vacía**, al revés que en los puertos anteriores:
todo lo que se creó para probar se borró, pero quedan los precios reales que se
apuntaron a mano durante las pruebas.

---

## 3 sexies. La pantalla de inicio ya no carga los precios

Primer cambio **posterior** a la fase 2, y el primero que mete en la base de
datos algo que no es una tabla.

### El problema

Inicio enseña tres cuentas —listas abiertas, artículos por comprar, artículos
sin precio— y, hasta ahora, para calcularlas se descargaba la instantánea
completa: catálogo, tiendas, listas y **el histórico entero de precios**,
paginado de mil en mil. Abrir la aplicación para ver «3 por coger» eran cinco
peticiones y todos los precios apuntados desde siempre.

El comentario de `cargarTodo` decía «son cuatro tablas pequeñas y la pantalla de
inicio ya necesita las cuatro». Era cierto con los mocks y dejó de serlo: la
tabla que crece es `precios`, y las tres cifras son `count`, no listados.

§3 quinquies ya avisaba de que a unos 3000 precios habría que partir el puerto.
Esto llega antes y por otro motivo: **no es el tamaño, es que la primera
pantalla no debería pedir el histórico para nada**.

### La primera función de la base: `resumen_inicio()`

En `supabase/migracion-02-resumen-inicio.sql`. Devuelve un JSON con
`sin_precio` y `abiertas` —cada lista abierta con su `items` y sus
`pendientes`—, contado en el servidor.

Se valoró hacerlo sin tocar la base, y **dos de las tres cifras salían**:
PostgREST cuenta sin traer ni una fila con
`select('*', { count: 'exact', head: true })`. La que se resiste es «artículos
sin precio», que cruza el catálogo entero con el histórico entero; con un embed
`!left` filtrando por nulo se puede, pero queda ilegible. Por una sola consulta
no compensaba dejar la pantalla con dos viajes y un truco.

Lo que eso cambia de fondo: hasta aquí la base solo tenía tablas y una vista, y
**a partir de ahora hay reglas que viven en SQL y se migran a mano**. Es
justo lo que §3 quáter descartó al valorar una RPC para `guardarItems`; se abre
aquí a propósito y con el alcance más estrecho que se pudo.

### La función cuenta, la aplicación decide

`resumen_inicio()` devuelve **todas** las listas abiertas y no «la compra en
curso». Elegir cuál es —hoy, la abierta con más pendientes— es una decisión de
producto, se queda en `pantallas/Inicio.tsx`, y cambiarla de idea no debe costar
una migración.

De paso, las otras dos cifras salen sin preguntar nada más: «listas abiertas» es
la longitud del array y «artículos por comprar» la suma de `pendientes`.

### Seguridad de la función

Tres cosas escritas a propósito en la migración:

- **`security invoker`**. Es el modo por defecto, pero escrito se lee: la
  función corre como quien la llama y el RLS se aplica igual que en un
  `select`. Con `security definer` se lo saltaría, y con la clave anónima
  siendo pública eso sí sería un agujero.
- **`set search_path = public, extensions`**, para que nadie pueda resolver
  `productos` contra otro esquema. Lleva `extensions` porque `citext` —el tipo
  de las claves— puede estar instalado ahí y sus operadores tienen que
  resolverse.
- **`revoke execute ... from public, anon`**. Postgres regala el `execute` a
  PUBLIC en cada función nueva, y en Supabase `anon` es PUBLIC. Sin quitárselo,
  una sesión caducada recibiría ceros y una lista vacía —o sea, la base
  parecería vacía— en vez de un error. Comprobado: sin sesión responde `42501`.

### El puerto nuevo, y por qué es un puerto

`RepositorioResumen` (`dominio/puertos`), con `inicio(): Promise<ResumenInicio>`.
Va aparte y no como método de otro repositorio porque cruza tres tablas
—catálogo, precios y listas— y ninguno de los otros manda sobre las tres.

`ResumenInicio` vive en `dominio/modelo/resumen.ts` y no es una entidad: es una
**lectura agregada**, y así está escrito allí.

Sus dos implementaciones:

- `supabase/resumen.ts` — el `rpc`. Es el primer adaptador que no habla con una
  tabla. Traduce el `42501` y también el `PGRST202`, que es lo que responde
  PostgREST si la función no existe: el diagnóstico exacto de «esta base no
  tiene la migración 02».
- `repositorioResumenMemoria` — el gemelo, para que el proyecto siga arrancando
  sin `.env`. Aquí no hay nada que optimizar; su valor es dejar escrito en
  JavaScript legible qué cuenta exactamente cada cifra, y ordena por nombre
  igual que la función para que las dos no discrepen.

### La instantánea pasa a cargarse perezosamente

Es la otra mitad del cambio, y sin ella la función no habría servido de nada:
`AppProvider` pedía `cargarTodo` en cuanto había sesión.

Ahora hay dos cargas. Al entrar solo se pide el **resumen**. La **instantánea
completa** espera a que se salga de inicio, porque inicio es la única pantalla
que se apaña sin ella: las demás leen del catálogo, de las listas o del
histórico. Se pide una sola vez por sesión, y ese «ya se pidió» va en una `ref`
y no en un estado —solo decide si toca cargar, y como estado sería un render de
más en cada acción—.

Las acciones refrescan **siempre** el resumen, porque cualquiera puede mover una
de sus cuentas —apuntar un precio baja «sin precio», marcar comprado baja
«pendientes»—, y la instantánea **solo si ya se había pedido**: estando en
inicio sin haber salido nunca, una acción no se trae los precios.

Esto no derogaba lo de §3 quinquies: fuera de inicio, cada `+` seguía recargando
la instantánea entera. Lo que cambiaba aquí era solo que el arranque ya no la
tocaba. Ese pendiente lo cierra §3 septies.

### Se ha ido «Últimos precios apuntados»

Consecuencia directa, y decidida: ese bloque era el único de inicio que obligaba
a traerse `precios`. Si se quiere de vuelta, el sitio es la propia función —un
`order by fecha desc limit 4`—, no una descarga del histórico.

### Comprobado contra la base real y en el navegador

- `resumen_inicio()` con sesión: `sin_precio: 15` y una lista abierta con 4
  items y 3 pendientes, que es exactamente lo que enseñaba la pantalla antes del
  cambio.
- Sin sesión: `42501 permission denied for function resumen_inicio`.
- **Al arrancar sale una única petición**, `POST /rest/v1/rpc/resumen_inicio`.
  Ni `productos`, ni `supermercados`, ni `listas`, ni `precios`. Verificado
  leyendo las entradas de `performance` del navegador, no suponiéndolo.
- Al pulsar Listas entran las cuatro peticiones de la instantánea: la carga
  perezosa dispara donde debe.
- Marcar un artículo como comprado y volver a inicio: la cifra bajó de 3 a 2
  sola, así que el refresco del resumen tras cada acción funciona.
- `npm run build` pasa limpio, typecheck incluido.

Efecto colateral de las pruebas, anotado por honestidad: en la lista «Compra»
quedó marcado como cogido un aceite que antes no lo estaba, y no hay forma de
saber cuál de los dos era —`lista_items` no guarda cuándo se tocó cada fila—.

---

## 3 septies. Tocar un item deja de reescribir la lista entera

Continuación directa de §3 sexies, y arreglo de lo que aquella sección dejaba
escrito como pendiente: *«fuera de inicio, cada `+` sigue recargando la
instantánea entera»*.

### Lo que costaba un toque, medido

Marcar un artículo como cogido en `DetalleLista` salían **8 peticiones**, 430 ms
de la primera a la última, medidas con las entradas de `performance` del
navegador contra la base real:

```
 1  GET  listas?id=eq.…            ← leer la lista para saber el valor actual
 2  POST lista_items (upsert)      ← reescribir TODOS los items
 3  DEL  lista_items?…not.in.(…)   ← borrar los que sobran
 4  POST rpc/resumen_inicio
 5  GET  productos                 ┐
 6  GET  supermercados             │ la instantánea entera,
 7  GET  precios?limit=1000        │ otra vez
 8  GET  listas (todas, con items) ┘
```

Dos problemas distintos sumados. Las 1–3 son el puerto: `guardarItems` solo sabe
*«sustituye todos los items»*, y para eso hay que leer la lista antes. Las 5–8
son `AppProvider`, que tras cada acción vuelve a pedirlo todo.

Y lo peor no es el tamaño, es dónde pasa: una compra son cuarenta o cincuenta
toques, en un móvil, con la cobertura de dentro de un supermercado.

### El puerto se estrecha

`RepositorioListas` gana tres métodos que tocan **un solo item**, identificado
por `(lista, producto)`, que es la clave primaria de `lista_items`:
`marcarComprado`, `fijarCantidad` y `quitarItem`. Una petición cada uno, sin
leer nada antes.

`guardarItems` se queda, pero solo para lo que de verdad cambia varios items a
la vez: el dictado.

Dos cambios de firma que salen de ahí:

- **`alternarComprado` pasa a ser `marcarComprado(listaId, artId, comprado)`.**
  «Alternar» obligaba a conocer el valor de partida, y conocerlo costaba la
  petición 1. La casilla que se acaba de tocar ya sabe cuál era.
- **`cambiarCantidad` recibe la cantidad resultante, no un `delta`.** Sumar o
  restar uno lo hace la pantalla, que ya está pintando la actual. La regla del
  cero —llegar a cero saca el artículo— se queda en el caso de uso, y por eso
  devuelve **si el artículo sigue en la lista**: sin ese booleano, `AppProvider`
  tendría que decidir por su cuenta cuándo desaparece una fila, que es negocio.

### `abiertaONada` deja de cubrir estas tres

La comprobación de «lista cerrada» vivía en la lectura que ahora sobra. Se
decidió **no** sustituirla por un trigger en Postgres: quien impide tocar una
lista cerrada es `bloqueada` en `DetalleLista`.

Lo que se acepta a cambio, dicho claro: la regla ya no está garantizada en la
base. Se aceptó sabiendo que la garantía anterior era más floja de lo que
parecía —entre la lectura y la escritura caben los ~90 ms en los que la otra
persona puede cerrar la lista, así que la carrera ya existía—. `abiertaONada`
sigue viva para `anadirArticuloALista` e `insertarDictado`, que **ya tienen** que
leer la lista por otro motivo y ahí no cuesta nada.

Si algún día aparece una segunda forma de escribir en `lista_items` que no pase
por la pantalla, el trigger vuelve a la mesa.

### `AppProvider` aplica el cambio en memoria

`marcarComprado` y `cambiarCantidad` salen del envoltorio `tras` y no recargan
la instantánea: aplican el cambio ya confirmado sobre `datos` y refrescan solo
el resumen, que es una RPC que cuenta en el servidor y no devuelve filas.

**No es actualización optimista.** El parche se aplica *después* del `await`, así
que lo que se pinta es lo que quedó guardado. Lo que se ahorra no es la espera,
es la pregunta: marcar comprado no puede tocar un precio, ni una tienda, ni otra
lista.

Lo que sí se pierde: hasta ahora cada toque traía de paso lo que hubiera hecho
la otra persona. Ya no. Es un consuelo que se va, pero era falso —entre toque y
toque ya se divergía—. Si el multiusuario en vivo llega a importar, la respuesta
es Realtime de Supabase, no recargar el histórico por si acaso.

### Comprobado en el navegador, contra la base real

- Marcar comprado: **8 peticiones → 2**. `PATCH lista_items?lista=eq.…&producto=eq.Alitas+Pollo`
  y `rpc/resumen_inicio`. 252 ms.
- `+` de cantidad: **2 peticiones**, y la pantalla pasó a «2 kg».
- `−` de 2 a 1: **2 peticiones**, y la etiqueta del botón volvió a «Quitar de la
  lista» al llegar a 1.
- **Recarga completa después**: el servidor devolvió exactamente lo que se
  pintaba. Es la comprobación que importa, porque al dejar de recargar ya nadie
  verifica que pantalla y base coinciden.
- `npm run typecheck` limpio.

Las pruebas dejaron la lista «Compra» como estaba: se deshizo el paso por 2 kg y
el marcado de «Alitas Pollo».

### El camino de borrado, comprobado

**Bajar de 1 borra la fila.** Probado contra la base real el 21 de agosto de
2026, sobre una lista de prueba con dos artículos: el `−` en el que estaba a 1
lo quita y la lista se queda con el otro. Lo que no consta es si se recargó
después, así que la vuelta desde la base queda vista en la pantalla pero no
confirmada tras un arranque limpio.

`quitarArticuloDeLista` usa el mismo `quitarItem`, pero **no lo llama ninguna
pantalla**: está expuesto en `AppProvider` y no hay control que llegue a él. Así
que el único camino de borrado vivo es el `−`, que es el que está probado.

---

## 3 octies. Los precios pasan a tres decimales

### El problema

Tecleando `0,908` se guardaba `0,91`. Y no daba error: `precios.precio` era
`numeric(10,2)` y Postgres **redondea en silencio** al guardar, así que la app
decía que había guardado y había guardado otra cosa. Por arriba, además, ni
siquiera se podía teclear el tercer decimal: el teclado de `HojaDePrecio`
cortaba a dos.

Dos decimales bastan para un ticket, pero aquí el importe va **siempre por
unidad de medida**, y ahí el céntimo se queda corto: un pack de 6 x 1 l a 5,45 €
son 0,908 €/l. Redondeado a 0,91, la comparativa entre tiendas la decide el
redondeo en vez del precio, que es justo lo que la app existe para evitar.

### El cambio, de punta a punta

Son cinco sitios, y hacen falta los cinco: si falta el de la base, lo demás se
pierde al guardar; si falta el del teclado, el decimal no se puede ni escribir.

| Dónde | Qué |
| --- | --- |
| `supabase/migracion-03-precios-tres-decimales.sql` | `precio` pasa a `numeric(10,3)` |
| `dominio/modelo/precio.ts` | `aCentimos` → `aMilesimas` (`Math.round(n * 1000) / 1000`) |
| `presentacion/formato.ts` | `eur` e `importeATexto`: mínimo 2 decimales, máximo 3 |
| `componentes/HojaDePrecio.tsx` | el teclado propio corta a 3 |
| `pantallas/Ronda.tsx` | el campo de la lista **también** corta a 3 |

El redondeo del dominio es a propósito el mismo que haría la columna: lo que la
app guarda y lo que la base almacena tienen que ser el mismo número, o vuelve el
fallo silencioso por otra puerta.

El formato lleva **mínimo dos decimales y máximo tres**, no tres fijos. Así
`1,49 €` se sigue viendo como siempre —que es la mayoría de los precios— y solo
aparece la milésima cuando la hay. Y por eso el campo de la ronda tenía que
recortar también: no limitaba decimales, y sin recorte un cuarto decimal lo
redondeaba el servidor mientras el campo seguía enseñando lo tecleado.

### Lo que la migración no hace

Recuperar la precisión perdida. Lo apuntado hasta ahora ya está redondeado a dos
decimales en la base y ahí se queda; a partir de la migración, los apuntes
nuevos guardan tres.

### La migración NO estaba aplicada: la vista lo impedía

Aquí ponía «la migración está aplicada». Era falso, y el 21 de agosto de 2026 se
vio por qué: apuntando un precio de aceite de oliva, la base seguía guardando dos
decimales. El `alter type` a secas **no puede funcionar** mientras exista la
vista `precios_actuales`:

```
ERROR:  cannot alter type of a column used by a view or rule
DETAIL: rule _RETURN on view precios_actuales depends on column "precio"
```

Una vista guarda el tipo de cada columna que devuelve, así que Postgres no deja
cambiarlo por debajo. El fallo se dio de bruces con lo que avisa el propio
fichero: al rechazarlo el servidor, la columna se quedó en `numeric(10,2)` y
siguió **redondeando en silencio**, sin un solo error en la aplicación.

La migración corregida tira la vista, cambia la columna, la vuelve a crear
copiada literal de `schema.sql` —`security_invoker = on` incluido, o dejaría de
respetar el RLS— y le devuelve los `grant`, que no sobreviven a un `drop view`.
Todo dentro de una transacción, y termina consultando `information_schema` para
que el resultado se vea en la misma ejecución.

**La aplicación estaba bien desde el principio.** El dominio redondea a
milésimas, el caso de uso y el adaptador mandan ese número sin tocar y el teclado
deja escribir el tercer decimal: comprobado camino a camino, y también dentro de
la compilación publicada. Todo lo que se perdía se perdía en el servidor.

**La vuelta entera está comprobada** (21 de agosto de 2026), ya con la migración
corregida dentro: se teclea `0,908`, se guarda, se recarga y vuelve `0,908`. Eso
es lo que cierra el fallo de punta a punta —teclado, dominio, adaptador y
columna—, porque el síntoma nunca fue un error sino un número distinto.

### Lección: una migración no está aplicada hasta que se comprueba

Lo que había escrito aquí venía de haber ejecutado el fichero, no de haber mirado
la base después. Cuesta una consulta:

```sql
select numeric_scale from information_schema.columns
where table_name = 'precios' and column_name = 'precio';
```

---

## 3 nonies. La fila de la lista: `+` y `−` apilados

El nombre del artículo es lo que hay que leer de un vistazo en el pasillo, y era
lo que menos sitio tenía: la fila gastaba **218px fijos** en controles —46 del
`−`, 46 del `+` y 126 del bloque de precio— y el nombre se quedaba con lo que
sobrara, cortándose en cuanto era largo.

Los dos controles de cantidad pasan a una **sola columna de 46px**, `+` encima y
`−` debajo. Medido en el navegador: el botón del nombre pasa de 220px a 266px.

El `+` va arriba porque es el que más se pulsa.

**Lo que cuesta, que no es gratis:** cada botón baja de 64px de alto a 40, y la
fila sube de 64px a 80 —caben menos artículos por pantalla—. Los 40px son el
suelo: por debajo el dedo falla, y aquí fallar no es cosmético, porque el `−` con
cantidad 1 **quita el artículo de la lista**. Si alguna vez hay que apretar más
el alto de la fila, lo que se recorta es el bloque de precio (126px), no estos
40.

---

## 3 decies. Las fotos salen del navegador

Era el último trozo de la aplicación que no hablaba con nadie. §4 lo tenía
listado como «fuera de la fase 2» con cinco problemas apuntados; los cinco los
cierra esta sección.

### El problema, en una frase

**La foto que hacía uno, el otro no la veía nunca.** `localStorage` es de ese
navegador y de ese origen, y en una aplicación cuyo punto entero es que la lista
es compartida, eso no es una limitación: es que la función no existía. Los otros
cuatro problemas —el cupo de 5 MB que se llenaba con dos fotos y las perdía en
silencio, la imagen de doce megapíxeles guardada para pintarla a 80 px, las
fotos de `localhost` que no existían en GitHub Pages, y la foto huérfana al
renombrar— venían todos detrás de ese.

### El puerto: `RepositorioImagenes`

Séptimo puerto, y el primero que no es una tabla. Cuatro métodos: `listar`,
`guardar`, `quitar` y `renombrar`.

`listar` devuelve **URLs ya montadas**, no rutas, indexadas por id. Así la
pantalla no sabe dónde viven los ficheros, y el adaptador puede meter en la URL
lo que necesite —lo necesita, ver más abajo—.

Y las imágenes **no entran en `cargarTodo`**. Es la misma idea de §3 sexies y
§3 septies: `cargarTodo` se vuelve a pedir después de cada acción, y una foto no
cambia porque alguien sume una unidad de leche. Se piden **una vez al entrar** y
solo se refrescan cuando alguien cambia una imagen o renombra algo.

### Tres decisiones, con lo que cuesta cada una

**La ruta se deduce del nombre; no hay columna.**

    fotos/<nombre en minúsculas>-80.jpg     miniatura de las filas
    fotos/<nombre en minúsculas>-720.jpg    plato de la ficha
    logos/…

Cero cambios de esquema, y una imagen se localiza sin preguntarle nada a la base
de datos. Minúsculas porque `productos.nombre` es `citext`: para la base «Leche»
y «leche» son el mismo artículo, y sin plegar el nombre serían dos ficheros.

**Lo que cuesta:** al no haber columna, el `on update cascade` que arrastra
precios e items al renombrar **no llega a la imagen** — que es exactamente el
problema 5 de la lista de §4, movido de sitio. Por eso el puerto tiene
`renombrar` y `editarArticulo` lo llama cuando el id ha cambiado
(`acompanaImagen`, en `aplicacion/casos/imagenes.ts`). Es a mano lo que en las
tablas hace la base sola. Si algún día da guerra, la salida es una columna
`foto text` en cada tabla, y entonces la ruta deja de deducirse.

**El cubo es público.** URL directa, estable y cacheada por el CDN, sin una
llamada de firma por cada miniatura. Son fotos de un brik de leche y las URLs no
se publican en ningún sitio. Escribir sigue exigiendo sesión: lo dicen las
políticas de `storage.objects` de `migracion-04-fotos.sql`.

**Se suben dos ficheros, el pequeño y el grande**, reducidos **en el navegador** con un
`<canvas>` antes de subir. Supabase sabe redimensionar al vuelo, pero eso es del
plan de pago; y aunque no lo fuera, subir 4 MB por 4G para pintarlos a 80 px es
el problema que se quería quitar. Una foto de móvil pasa de ~4 MB a ~80 KB.

El pequeño mide **240 px**, no los 80 del plan original: la lista lo pinta a 76
y un móvil va a 3x, así que con 80 salía blando. Son ~20 KB por foto en vez de
2,5, nada al lado de los 90 del grande.

**El nombre del fichero sigue diciendo `-80.jpg`**, y va aparte del número de
píxeles a propósito. El sufijo es el nombre de la ranura, no una promesa: si se
derivara del tamaño, subir la resolución cambiaría la ruta de todas las imágenes
y las ya subidas quedarían colgando en una ruta que nadie pide —miniaturas rotas
hasta rehacer cada foto—. Así, lo que hay sigue viéndose; solo se ve blando
hasta que se vuelva a hacer.

**Lo que cuesta:** el resultado es siempre JPEG, así que un PNG con
transparencia se pierde el alfa. El lienzo se rellena de blanco antes de pintar,
porque sin ese relleno lo transparente sale negro. Se nota en los logos de
tienda, que suelen ser PNG recortados. Y los 80 px son los del plan original: un
móvil pinta a 3x, así que la miniatura de 40 px de CSS se ve algo blanda. Subirla
es cambiar `LADOS` en `supabase/imagenes.ts` y volver a subir las imágenes.

### El `?v=` de las URLs

La ruta de una foto es siempre la misma, así que sustituirla no se vería: el CDN
seguiría sirviendo la anterior hasta que caducara su caché. Cada URL lleva
detrás la fecha del fichero, que `list` devuelve en `updated_at`. Por eso al
subir se vuelve a listar en vez de apuntar la URL a mano: la buena es la del
servidor, con su versión nueva.

### La política de `select` hace falta aunque el cubo sea público

Leer la imagen por su URL pública no pasa por RLS. **Listar la carpeta sí**, y
la aplicación lista las dos carpetas al entrar para saber quién tiene imagen.
Sin la política de `select`, las fotos existen y no se ven.

### Qué cambió en las pantallas

Poco, y lo que cambió es lo de siempre: antes esto no podía fallar ni tardar.
`Ficha` cuenta «Subiendo la foto…» y tiene su `Aviso`; `Ajustes` también, para
los logos. Y los mapas ya no se leen a pelo: se pregunta por `imagenes.foto(id)`
y `imagenes.logo(id)`, que bajan el id a minúsculas igual que hace la ruta.

### Comprobado

Contra el proyecto real: al entrar salen las dos peticiones a
`/storage/v1/object/list/imagenes` y la ficha pinta «Sin foto del producto» sin
un solo error en consola. **La subida también está comprobada** contra el
servidor, con `supabase/migracion-04-fotos.sql` ya aplicado: sin ese fichero
—que crea el cubo y sus políticas— lo que se cae es la subida, no la lectura.

---

## 3 undecies. Tocar la foto la amplía

En la lista la miniatura mide 38 px. Sirve para reconocer de un vistazo lo que
ya sabes, pero no para decidir cuál de dos paquetes parecidos es el tuyo: para
eso hay que leer la etiqueta, y a 38 px no se lee. Tocarla abre la de 720 px a
pantalla completa, sobre el marco del móvil.

Se cierra tocando en cualquier sitio, la foto incluida. En el supermercado se va
con una mano y con el carro; buscar una `×` de 44 px es pedir puntería. La `×`
está arriba de todas formas, para quien la busque con la vista.

### Se va la casilla y la foto ocupa la fila

Casilla, miniatura y nombre eran **un solo botón** que marcaba comprado. Para
que tocar la foto haga otra cosa hay que partirlo: un botón dentro de otro no es
HTML válido.

Partido el botón, la casilla sobra. Lo que decía —comprado o no— lo dicen ya el
tachado del nombre y el 50 % de opacidad de la fila entera, la foto incluida; y
sus 30 px más el hueco son justo lo que hace falta para que la miniatura pase de
38 px a **76**. Esa es la diferencia entre reconocer lo que ya sabes y poder leer
la etiqueta desde el carro. Marcar comprado es tocar el nombre.

**La fila no crece**: sigue midiendo los 80 px que fija la columna del `+` y el
`−` (§3 nonies), y la foto los ocupa casi enteros. Medido en el navegador: 81 px
de alto, foto de 76.

Lo que cuesta: **la casilla era el sitio evidente donde tocar**, y ahora hay que
saber que se toca el nombre. Y sin foto no hay tile que tocar, así que la inicial
se queda dentro del botón del nombre —un hueco muerto de 76 px en la fila que más
se toca se paga en cada compra—.

### En el catálogo no hace falta

Ahí tocar la fila ya lleva a la ficha, que enseña la misma foto de 720 px. Meter
el visor sería un camino de más para llegar a lo mismo.

---

## 3 duodecies. La copia de seguridad se hace a mano

El plan gratuito de Supabase **no hace copias**: ni volcado diario ni
recuperación a un punto en el tiempo —eso empieza en Pro, y el PITR es un extra
sobre Pro—. Además, un proyecto gratuito se pausa a los siete días sin uso. Los
datos no se pierden por eso, pero el único respaldo que hay de la compra de
meses es el que uno se haga.

`npm run copia` lo hace —`scripts/copia-seguridad.ps1`—. Deja en
`copias\AAAA-MM-DD-HHmm\` el esquema, los datos y **las imágenes de verdad**.

### Las fotos no van en el volcado

`pg_dump` del esquema `public` no se lleva las imágenes: viven en Storage, que
por dentro es el esquema `storage`, y los bytes ni siquiera están en la base. Una
copia que solo volcase `public` parecería completa y no lo sería.

Por eso el script hace la segunda mitad: lista `storage.objects` por SQL y baja
cada fichero por su URL pública. Que el cubo sea público (§3 decies) es lo que
permite bajarlos sin firmar nada.

### Por qué no vale `supabase db dump`

El CLI está instalado (`npm i -D supabase`), pero **no lleva `pg_dump` dentro**:
lo ejecuta dentro de un contenedor, así que exige Docker Desktop para volcar una
base que está en internet. En su lugar se usan los binarios portables de
PostgreSQL 17, descomprimidos en `herramientas\pgsql\` —sin instalador, sin
servicio y fuera de Git—.

### Hay que ir por el «pooler»

La conexión directa, `db.<ref>.supabase.co`, hoy **solo resuelve a IPv6** en el
plan gratuito, y desde una red doméstica sin IPv6 de salida el puerto 5432 no
llega a abrirse: comprobado, `TcpTestSucceeded: False`. La que sí escucha en
IPv4 es la del pooler, con el usuario `postgres.<ref>`.

El servidor del pooler cuelga de la región del proyecto, y la región no se puede
deducir de la URL pública. El script prueba las candidatas hasta que una
autentica; la de este proyecto es **`aws-1-eu-west-1.pooler.supabase.com`**, y va
la primera de la lista. Los dos noes se distinguen por el texto, y eso es lo que
hace útil el sondeo: `tenant/user not found` es región equivocada,
`password authentication failed` es la región buena.

### La contraseña no se guarda

Es la de la base —Project Settings → Database—, distinta de la clave
`sb_publishable_` del `.env`, y se teclea al vuelo (`Read-Host -AsSecureString`).
Puede venir de `SUPABASE_DB_PASSWORD` para no repetirla, pero no se escribe en
ningún fichero del repositorio.

---

## 3 duodecies. Los iconos dejan de ser letras

Los iconos de la interfaz eran glifos tipográficos heredados del prototipo:
`☰ ⊞ ⚙ ⌂ ✓ − + × ‹ ›`. Se ven, pero **los dibuja la fuente del sistema**, y eso
significa un grosor distinto, un tamaño óptico distinto y una altura sobre la
línea distinta en cada móvil. Ninguno se podía alinear de verdad con el texto de
al lado: se centraban a ojo con `fontSize` y un hueco. El sistema visual
*Classical* especifica **Lucide**, que es la geometría que hay ahora.

### Se copió la geometría, no se instaló el paquete

Se intentó lo evidente —`npm install lucide-react`— y no salió: la versión 1.33.0
llega con **todos sus ficheros de tipos vacíos**, 0 bytes, así que TypeScript no
la reconoce como módulo (`TS2306`). Y bajar de versión tampoco se pudo: en esta
máquina `npm install` falla al crear los paquetes opcionales de TypeScript y
deshace la instalación entera, así que la versión rota es la única que entra.

La salida fue dibujar los doce iconos a mano en `src/presentacion/iconos.tsx`,
con la geometría de Lucide —es ISC— sobre su misma rejilla de 24. Sale más barato
que arrastrar el problema: son una o dos líneas de `path` cada uno, y la
aplicación sigue sin más dependencias que React y Supabase. Es la misma decisión
que ya se tomó con los iconos de la PWA, que se generan con GDI+ en vez de meter
una herramienta de imágenes.

Si algún día hace falta el juego entero, se instala el paquete y **solo cambia
ese fichero**: las pantallas no importan de `lucide-react`, importan de
`../iconos`.

### Un fichero, y por qué

El nombre del icono es una decisión de diseño, no de la pantalla. Que «atrás»
sea un `chevron-left` y no una flecha se decide una vez y se lee en un sitio, en
lugar de repartido por doce ficheros. Con él van los valores por defecto: lado 20
y grosor **1.75**, no el 2 de Lucide, que junto a una tipografía serif se ve
tosco.

Tres detalles que no son adorno:

- **`currentColor`**: el color lo pone quien lo usa, con la misma variable de
  tema que el texto de al lado. Sin esto, cada icono tendría su color escrito a
  mano y el tema oscuro los dejaría fuera.
- **`aria-hidden` en todos**: el icono nunca es la etiqueta. Cada botón lleva ya
  texto visible o `aria-label`, así que anunciar además el icono sería decir lo
  mismo dos veces.
- **`settings-2` en vez de la rueda dentada** para Ajustes: a 22 px los dientes
  de `settings` se convierten en un borrón.

### La `×` de borrar pasa a ser una papelera

En Ajustes, borrar un supermercado era una `×`. La misma `×` que cerrar la hoja
que hay encima. Dos acciones irreversibles de distinta gravedad no pueden
compartir símbolo, así que borrar es ahora `trash-2` y `×` se queda solo para
cerrar. Es el único cambio de esta tanda que altera lo que **significa** un
control, no solo cómo está dibujado.

### Lo que sigue siendo texto

No todo lo que parecía un icono lo era:

- El `−` de `variacionATexto` («−3%») es **contenido**: un signo menos dentro de
  una cifra, no un botón.
- El `×` de `Dictar` («×2») es una multiplicación, no una cruz de cerrar.

Cambiar esos dos por iconos habría sido confundir el símbolo con el dibujo.

### Comprobado

`tsc` y la compilación pasan limpios, y las 29 trazas de los doce iconos se
midieron en el navegador: todas dibujan algo y todas caben en la rejilla de 24,
que es donde se cuela una errata al copiar coordenadas. **En pantalla no están
vistos todavía**: la aplicación pide sesión y las capturas no se pudieron hacer.
Queda mirar con los ojos la barra de pestañas, el `+`/`−` de una lista y el
visor de fotos.

---

## 3 terdecies. Artículos favoritos

El catálogo y la lista de supermercados han crecido lo bastante como para que
buscar por nombre ya no baste: para montar la compra de la semana se repiten
siempre los mismos veinte artículos, y había que ir dando con ellos entre todos
los demás.

### Una columna, no una tabla

`productos.favorito boolean not null default false` (migración 05). **No** una
tabla `favoritos` por usuario: la aplicación la usan dos personas que comparten
catálogo, listas y precios, así que el favorito es del artículo y no de quien
lo marca. Una tabla aparte sería inventar una distinción que en esta casa no
existe, y costaría un `join` en cada listado del catálogo.

El índice es **parcial** (`where favorito`): indexa solo las filas marcadas,
que son pocas. Con un catálogo doméstico daría igual, pero no cuesta nada.

### El puerto gana un método, no un campo en `editar`

`marcarFavorito(id, favorito)` es su propio método de `RepositorioArticulos`,
por lo mismo que `marcarComprado` no pasa por `guardarItems` (§3 septies): es
un booleano, quien llama ya sabe el valor que quiere dejar, y meterlo en
`editar` obligaría a mandar también el nombre y la unidad. Es **idempotente**:
si el artículo ya no está, el `update` no toca ninguna fila y no da error,
porque la otra persona puede haberlo borrado.

No devuelve el artículo, y la acción del `AppProvider` **no recarga nada**: ni
la instantánea ni el resumen. El favorito no entra en ninguna de las tres
cuentas de inicio —artículos, sin precio, pendientes—, así que pedir el
catálogo entero para cambiar un booleano que ya conocemos sería justo lo que se
quitó en §3 septies. Se aplica en memoria después del `await`, con `enArticulo`.

### Dónde se marca, y por qué NO en la fila

El primer intento puso la estrella como **columna propia de la fila del
catálogo**, entre el nombre y «Ed». Se probó en el navegador y estaba mal: la
fila ya iba justa y esos 46 px se comieron el nombre —«aceite …», «chulet…»—.

Así que la estrella se marca desde **«Editar artículo»**, el diálogo donde ya
se cambian el nombre y la unidad, y en la fila queda solo como **indicador**
pegado al nombre. De paso se fue de la fila la **etiqueta de unidad**, que
tampoco se ganaba el sitio: quien la necesita la ve en la ficha o al apuntar un
precio.

En el diálogo, el favorito se guarda **aparte** del alta o la edición, con su
propia llamada. En `editArt` se manda sobre el id **que devuelve** `editar`, no
sobre el de entrada: contra Supabase el id es el nombre, así que renombrar
cambia la identidad y la estrella caería sobre un artículo que ya no existe.

### El filtro

Un interruptor «Favoritos» junto al buscador, en el catálogo **y** en el panel
de añadir a una lista, que es donde de verdad hacía falta. Tres decisiones:

- Los dos filtros **se cruzan**, no se suman: buscar «lech» con el filtro
  puesto da las leches favoritas, no todas las leches más todos los favoritos.
- El interruptor **no aparece** mientras no haya ningún favorito. Un filtro que
  solo puede dejar la pantalla vacía no es una ayuda.
- Con el filtro puesto, un hueco **no ofrece crear el artículo**: lo que falta
  no es el artículo, es la estrella. Sin esto, buscar un favorito que no lo era
  invitaba a crear un duplicado del que ya está en el catálogo.

El estado del filtro vive en el `AppProvider` junto a `q`, por lo mismo que
`q`: las dos pantallas enseñan el mismo catálogo, y quien lo deja puesto en el
catálogo espera encontrárselo puesto al añadir a una lista.

### Comprobado

`tsc` y la compilación, limpios. En el navegador, contra los datos de la
semilla: la fila enseña el nombre entero, la estrellita sale en los favoritos y
el filtro deja solo esos. **Contra la base real no está probado todavía**:
falta ejecutar la migración 05 en Supabase.

---

## 3 quaterdecies. El panel de añadir se pega arriba, no abajo

### El problema

En una lista de la compra, «Añadir artículo del catálogo» abría una hoja pegada
al **borde de abajo**: buscador arriba del todo de la hoja y resultados debajo,
los dos en la mitad inferior de la pantalla. En el móvil, esa mitad la ocupa el
teclado en cuanto el buscador coge el foco. Se escribía a ciegas y no se veía
ni una fila de resultados, que es justo lo único que hay que ver ahí.

Es un fallo que no se ve en el escritorio, porque en el escritorio no hay
teclado que suba.

### El arreglo: la hoja puede pegarse a los dos bordes

`HojaInferior` pasa a llamarse **`Hoja`** y gana `desde: 'arriba' | 'abajo'`
(por defecto, `'abajo'`). El nombre viejo mentía en cuanto la hoja podía ir
arriba.

Con `desde="arriba"` cambian tres cosas, y ninguna es cosmética: el
`justifyContent` del velo, el borde por el que se despega —el filete y el
redondeo van siempre en el lado contrario al que está pegada— y la animación de
entrada, que es la de siempre del revés (`baja`, junto a `rise` en
`tokens.css`).

La regla, escrita en el propio componente para que no haya que deducirla:
**abajo lo que se toca, arriba lo que se escribe**.

### Por qué esto y no `visualViewport`

La otra salida era medir el hueco real con `window.visualViewport` y encoger la
hoja a lo que quede libre. Es más exacto, y es lo que habría hecho falta si la
hoja tuviera que seguir abajo. Pero pegarla arriba resuelve lo mismo sin ningún
oyente de eventos, sin estado que mantener y sin depender de una API que en
Android e iOS no se comporta igual: el buscador y las primeras filas quedan por
encima del teclado, y lo que el teclado tape es el final de una lista que ya se
podía desplazar.

Si algún día hace falta la medida exacta —una hoja que tenga que ir abajo **y**
abrir teclado—, el sitio es `Hoja` y no cada pantalla.

### Lo que NO ha cambiado

`HojaDePrecio` sigue pegada abajo: es la que se usa con el pulgar, apuntando
precios en el pasillo. Tiene el mismo teclado numérico encima y **puede tener
el mismo problema**; queda sin comprobar en un móvil de verdad, y no se ha
tocado porque cambiarla a ciegas movería la hoja que más se usa.

### Comprobado

En el navegador, a 375×812: la hoja entra desde arriba, el buscador queda en la
primera franja de la pantalla y el filtro de favoritos y los resultados debajo.
La hoja de precio sigue entrando desde abajo, igual que antes. **Con un teclado
de verdad no está probado**: en el escritorio no sube ninguno.

---

## 3 quindecies. Cuándo se creó cada lista, y duplicar una cerrada

Dos cosas que van juntas porque la segunda depende de la primera: sin la fecha
a la vista, dos listas duplicadas con el mismo nombre no se distinguen.

### La fecha ya estaba en la base

`listas.created_at` existe desde el esquema inicial, con `default now()`. **No
ha hecho falta migración**: lo único que pasaba es que el repositorio no la
pedía y el dominio no la tenía. Ahora `Lista.creada` viaja con la lista.

Es un **instante**, no un día, y por eso no va en `YYYY-MM-DD` como
`Precio.fecha`. La diferencia no es teórica: `created_at` es un `timestamptz`,
y cortar su ISO por la `T` da el día **en UTC**, que a partir de las diez de la
noche en España ya es el de mañana. Una lista creada anoche saldría con la
fecha de hoy. El día se calcula en la pantalla, en la zona de quien mira.

La pone la base y no la aplicación, además, porque el reloj bueno es el del
servidor: es el mismo para los dos móviles.

### Cómo se cuenta

`cuandoSeCreo` (en `formato.ts`) dice «hoy», «ayer», «hace 5 días» y, a partir
de la semana, la fecha entera. Dos detalles que costaron más de lo que parece:

- El «hoy» **se pasa desde fuera**, del reloj de la aplicación, que es un
  puerto (`Reloj`). Mirar `Date` aquí dentro haría que esto no se pudiera
  comprobar sin tocar la hora de la máquina.
- La cuenta se hace sobre el **día local** de cada fecha, no sobre las horas
  que las separan. Si no, una lista de ayer a las once de la noche seguiría
  diciendo «hoy» hasta la mañana siguiente. Y se compara a mediodía, para que
  el cambio de hora no mueva la resta de un día entero.

Sale en las dos secciones de la pantalla de listas, abiertas y cerradas. La
pantalla de inicio **no** la enseña y por eso `resumen_inicio()` no se ha
tocado: habría sido una migración para un dato que allí no se pide.

### Duplicar

`duplicarLista` es un caso de uso, no un método nuevo del puerto: se compone de
`obtener` + `crear` + `guardarItems`, que ya estaban. Son tres peticiones, y la
tercera se salta si la original está vacía. Aquí `guardarItems` **sí** es lo que
toca —es un cambio en bloque, que es para lo que existe (§3 septies)—.

Cuatro decisiones:

- **Lo comprado no se copia.** La copia nace con todo por coger; si no, sería
  una lista terminada, que no sirve para ir a comprar.
- **El nombre se repite tal cual**, sin «(copia)» ni fecha. Decidido a
  sabiendas de que deja dos «Semanal» en la pantalla: las distingue *cuándo se
  crearon*, que es lo que acaba de aparecer ahí. Meter la fecha en el nombre la
  metería también en el título de la pantalla de la lista, donde estorba.
- **Se lee del repositorio, no de la instantánea de la pantalla.** La app la
  usan dos personas: se copia lo que hay guardado ahora, no lo que se pintó
  hace un rato.
- **La copia se abre nada más crearse.** Duplicar es el principio de una
  compra, no un archivado. Si el caso de uso devuelve `null` es que la lista ya
  no estaba —la otra la borró—, y entonces no hay a dónde ir.

El caso de uso **no** exige que la lista esté cerrada: el puerto no distingue y
no hay motivo para prohibirlo. Quién ofrece el botón es cosa de la pantalla, y
hoy lo ofrece solo en las cerradas.

### Comprobado

Contra la **base real**, en el navegador: las fechas salen en las listas
abiertas y cerradas, y duplicar crea la copia con todo por coger y entra en
ella. En memoria, con la semilla, se ven los tres formatos —«hoy», «ayer» y
«29/7/2026»—, que es para lo que la semilla lleva ahora fechas relativas.

---

## 3 sexdecies. La letra del nombre, de 17 a 21

### El problema

En el pasillo el móvil va a la distancia del brazo, con el carro en la otra
mano. El nombre del artículo es lo único de la fila que hay que reconocer de un
vistazo, y estaba a 17px: se lee, pero hay que pararse a leerlo.

Medido antes de tocar nada, en el navegador a 375px de ancho: al nombre le
quedaban **91px de ancho** de los 375 de la pantalla. Los otros 284 eran
chrome —foto 76 más su hueco, columna del `+` y el `−` 46, bloque de precio
126— y relleno. Con 91px, «yogur natural» ya partía en dos líneas **a 17px**.
Subir el cuerpo de letra sin más habría partido en dos casi todo.

### Letra y ancho van juntos, y el ancho sale del precio

El nombre pasa a **21px**. Para que quepa, el bloque de precio baja de **126 a
96px** y su relleno de `0 6px 0 10px` a `0 4px 0 8px`.

De ahí y no de otro sitio: §3 nonies dejó escrito que si alguna vez había que
apretar la fila, lo que se recorta es el bloque de precio, **nunca los 40px de
alto del `+` y el `−`** —por debajo de 40 el dedo falla, y el `−` con cantidad 1
quita el artículo de la lista—. La foto tampoco se toca: sus 76px son §3
undecies enteros.

Resultado medido: el nombre pasa de **91 a 121px** de ancho. Con eso, «pollo
entero» vuelve a caber en una línea a pesar de que la letra es más gorda.

### Los interlineados pasan a ir fijos

Esto es lo que costó, y no se veía venir. La fila mide 80px porque los fija la
columna del `+` y el `−`, y lo que decide si los respeta es la altura del
contenido del botón del nombre: dos líneas de nombre más la línea de cantidad
más el relleno.

Con el interlineado en `normal` esa cuenta la decide el navegador. A 17px salía
79 y colaba de milagro; a 21px se iba a **84**, medido con foto. Así que ahora
van **fijos**: `lineHeight: '24px'` en el nombre y `'16px'` en la cantidad, y el
relleno vertical del botón baja de 12 a 8.

Comprobado en el navegador: **81px en todas las filas**, también en las de
nombre de dos líneas —«yogur natural», «papel higiénico»—. Sin fijar los
interlineados, ajustar esto al píxel es ajustarlo contra un número que el
navegador puede cambiar.

### «sin precio» baja a 13px

Estrechada la columna a 96, «sin precio» —la cadena más larga que pasa por
ahí— se partía en dos líneas. Baja a 13px y va con `white-space: nowrap`. El
importe se queda en 14: es lo que se lee, y es lo que no puede encoger.

### De paso, una medida que estaba mal apuntada

§3 undecies decía que la fila mide 81px. Es verdad **con foto**. Sin foto el
recuadro de la inicial va dentro del botón del nombre y se come su relleno, y la
fila medía **101px**: la lista tenía dos alturas distintas y no estaba escrito.
Con el relleno a 8 son 93. Siguen siendo dos, pero ahora la diferencia es de
12px en vez de 20, y está apuntada.

### Comprobado

En `--mode memoria` a 375x812, midiendo en el DOM, no a ojo:

- Anchura del nombre: 91 → 121px.
- Altura de fila con foto: 81px en las ocho filas, con nombres de una y de dos
  líneas. Comprobado forzando una foto en todas las filas con un parche
  temporal, porque el modo memoria arranca sin fotos; el parche está revertido.
- Altura de fila sin foto: 93px, igual en las ocho.
- Ni el importe ni el nombre de la tienda se parten ni se recortan; «sin
  precio» entra en una línea.
- La página no coge barra horizontal.
- `tsc --noEmit` limpio.

Lo que **no** está comprobado: nada de esto se ha visto en el móvil de verdad
todavía, solo en el navegador a tamaño de móvil.

---

## 4. Lo que queda fuera de la fase 2

- ~~**Fotos**~~: **hechas** (§3 decies). Van a Supabase Storage, reducidas en el
  navegador a 80 y 720 px, con la ruta deducida del nombre. Aquí quedaban
  listados cinco problemas y los cinco están cerrados; el quinto —la foto
  huérfana al renombrar— no desaparece solo por mudarse a Storage, lo cierra
  `acompanaImagen`.

  Quedaba fuera **borrar las fotos que no usa nadie**: si un artículo se borra
  desde otro sitio que no sea la aplicación, su fichero se queda en el cubo para
  siempre. **Descartado el 21 de agosto de 2026**, y no por pereza: son unos
  kilobytes que nadie ve, en un cubo que usan dos personas. El día que estorbe,
  estorbará en la factura, y entonces se sabrá cuánto ocupa.
- **Sincronización entre los dos usuarios**: escritura optimista con cola de
  envío. El estado de error ya está diseñado y se puede forzar desde
  Ajustes → Demostración de estados. Para `comprado` y `cantidad`, resolución
  última-escritura-gana por campo.
- ~~**Iconos**~~: **hechos** (§3 duodecies). Ya no son glifos tipográficos.
- ~~**Favoritos**~~: **hechos** (§3 terdecies). Columna en `productos`, filtro
  en el catálogo y en el panel de añadir.

---

## 4 bis. Pendientes, apuntados el 21 de agosto de 2026

Por orden de lo que molesta al usarla, no de lo que cuesta hacerlo.

### 1. ~~Al añadir un artículo, el teclado tapa la lista~~ — hecho (§3 quaterdecies)

### 2. ~~Duplicar una lista cerrada~~ — hecho (§3 quindecies)

### 3. ~~La letra de la descripción, más gorda en la lista de la compra~~ — hecho (§3 sexdecies)

### 4. Fallo: los artículos con acentos rompen la subida de fotos

**Es un fallo, no una mejora.** Un artículo con acentos —«plátano», «café
molido»— da error de Supabase al subirle la foto.

Lo que se sabe: la ruta del fichero se deduce del nombre en minúsculas
(§3 decies, `fotos/<nombre>-80.jpg`), y las claves de Supabase Storage no
admiten cualquier carácter. Los acentos y la `ñ` del catálogo entran ahí tal
cual.

Lo que hay que decidir al arreglarlo, y no es menor: **plegar los acentos
cambia la ruta**, así que las fotos que ya estén subidas de artículos sin
acentos siguen valiendo, pero cualquier esquema nuevo deja huérfanas las que
haya. Y si se pliega «plátano» a «platano», hay que asegurarse de que dos
artículos distintos no acaben en el mismo fichero. La otra salida es la que ya
está escrita en la migración 04: una columna `foto text` en la tabla, y
entonces la ruta deja de deducirse del nombre.

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
  (§3 quáter). Arriba no lo ve quien está tocando la última fila. Vale también
  para la ronda, que es igual de larga (§3 quinquies).
- **El `onConflict` de los precios apunta a `unique (producto, supermercado,
  fecha)`, no a la clave primaria** (§3 quinquies). La clave es un `id bigint`
  automático: contra ella el upsert no encontraría conflicto nunca y duplicaría.
- **`listar()` de precios se pagina por el `count` exacto**, no por «la página
  vino corta» (§3 quinquies). El servidor corta a 1000 filas sin avisar y
  `.limit()` no lo sube.
- **El borrador de una fila de la ronda solo se descarta cuando el servidor
  acepta** (§3 quinquies). Al revés, un rechazo se lleva por delante lo que la
  persona acaba de teclear.
- **En la comparativa se toca la fila entera, no un símbolo** (§3 quinquies). El
  € no vale como control en una app donde el € es contenido.
- **El `base` de Vite solo se aplica a la compilación**, y también a `preview`
  (§3 ter). En desarrollo debe quedarse en `/` o cambia la dirección con la que
  se abre desde el móvil.
- **El manifiesto de la PWA va con rutas relativas** (§3 ter). Vite no lo
  reescribe, así que con rutas absolutas se rompe al servirlo bajo un
  subdirectorio.
- **Inicio se alimenta del resumen, no de la instantánea** (§3 sexies). Volver a
  leer `datos` allí devuelve el arranque a cinco peticiones y al histórico
  completo.
- **`resumen_inicio()` cuenta, pero no elige la compra en curso** (§3 sexies).
  Ese criterio es de producto y vive en la pantalla; bajarlo a SQL convierte
  cambiarlo en una migración.
- **La instantánea completa se carga al salir de inicio, no al entrar**
  (§3 sexies). Y las acciones solo la refrescan si ya se había pedido.
- **`guardarItems` es solo para cambios en bloque** (§3 septies). Usarlo para
  tocar un item devuelve el toque de 2 peticiones a 3, y obliga a leer la lista
  entera antes para saber de qué se parte.
- **`cambiarCantidad` recibe la cantidad resultante, no un `delta`** (§3 septies).
  Volver al `delta` obliga a leer la lista, que es justo lo que se quitó.
- **`marcarComprado` y `cambiarCantidad` no pasan por `tras`** (§3 septies).
  Meterlas ahí devuelve las cuatro peticiones de la instantánea a cada toque.
- **La lista cerrada la protege la interfaz, no la base** (§3 septies). Se
  decidió a sabiendas; si aparece una escritura que no venga de la pantalla,
  toca el trigger en Postgres.
- **La función lleva `revoke execute` a `anon`** (§3 sexies). Sin eso, una
  sesión caducada ve ceros en vez de un error, que es peor que fallar.
- **El precio se guarda con tres decimales** (§3 octies). El importe va por
  unidad de medida: a dos decimales, la comparativa entre tiendas la decide el
  redondeo. Y el redondeo del dominio (`aMilesimas`) tiene que seguir siendo el
  mismo que el de la columna, o vuelve el guardado silencioso de otro número.
- **La ruta de la imagen se deduce del nombre, en minúsculas** (§3 decies). Sin
  el plegado a minúsculas, «Leche» y «leche» —que para la base son el mismo
  artículo, porque el nombre es `citext`— serían dos ficheros distintos.
- **Las imágenes no viajan con `cargarTodo`** (§3 decies). Meterlas ahí devuelve
  dos listados de Storage a cada `+` de una lista, para algo que cambia una vez
  cada muchos meses.
- **La imagen se reduce en el navegador antes de subirla** (§3 decies). Subir el
  original y redimensionar en el servidor es del plan de pago, y manda 4 MB por
  4G para pintarlos a 80 px.
- **Renombrar mueve la imagen a mano** (§3 decies). Es lo que compensa no tener
  columna: sin `acompanaImagen`, renombrar vuelve a dejar la foto huérfana.
- **La fila de la lista son tres botones, no uno** (§3 undecies). Volver a
  juntarlos deja la foto sin poder abrirse: un botón dentro de otro no es HTML
  válido.
- **El visor se cierra tocando en cualquier sitio** (§3 undecies). Obligar a
  acertar en la `×` es pedir puntería a quien va con una mano y con el carro.
- **El velo del visor es del 88 %** (§3 undecies). Ese 12 % que deja pasar es
  intencionado: se sigue viendo dónde estás.
- **El favorito es del artículo, no de quien lo marca** (§3 terdecies). Es una
  columna en `productos` y no una tabla por usuario: el catálogo es compartido.
- **El favorito se marca desde «Editar», no desde la fila** (§3 terdecies). Se
  probó como columna de la fila y se comía el nombre del artículo.
- **`marcarFavorito` no recarga nada, ni el resumen** (§3 terdecies). El
  favorito no entra en ninguna de sus tres cuentas.
- **La fila del catálogo ya no enseña la unidad** (§3 terdecies). Volver a
  meterla es volver a recortar el nombre.
- **El panel de añadir se pega ARRIBA** (§3 quaterdecies). Abajo lo tapa el
  teclado del móvil, y ahí no se ve ni una fila de resultados. Regla general:
  abajo lo que se toca, arriba lo que se escribe.
- **`Lista.creada` es un instante, no un día** (§3 quindecies). Cortar el ISO
  por la `T` da el día en UTC, y de noche eso ya es mañana.
- **La copia de una lista lleva el mismo nombre** (§3 quindecies). Lo que las
  distingue es la fecha; meterla en el nombre la mete en el título.
- **`duplicarLista` no es un método del puerto** (§3 quindecies). Se compone de
  `obtener` + `crear` + `guardarItems`, que ya estaban.
- **Los interlineados de la fila van FIJOS, no en `normal`** (§3 sexdecies). Los
  80px de la fila se ajustan al píxel, y con `normal` ese píxel lo decide el
  navegador: a 17px colaba por uno y a 21px se iba a 84.
- **El ancho para la letra más gorda sale del bloque de precio** (§3 sexdecies,
  §3 nonies). Nunca de los 40px de alto del `+` y el `−`, ni de los 76 de la
  foto.

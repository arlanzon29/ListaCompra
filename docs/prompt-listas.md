Sigo con la fase 2 de ListaCompra (D:\IA\ListaCompra): conectar las listas a
Supabase. Ya están hechos la autenticación, los supermercados y los artículos;
toca el mismo trabajo para las listas y sus items.

Lee primero docs/estado-del-proyecto.md y src/infraestructura/supabase/
articulos.ts: ese adaptador es el patrón a seguir.

QUÉ HAY QUE ESCRIBIR
- src/infraestructura/supabase/listas.ts, implementando RepositorioListas de
  src/dominio/puertos/index.ts contra las tablas `listas` y `lista_items` de
  supabase/schema.sql.
- Enchufarlo en src/infraestructura/contenedor.ts, en dependenciasPorDefecto.
  Con eso el almacén en memoria deja de usarse salvo para precios.
No toques el dominio ni los casos de uso salvo que te lo pida abajo. Las
pantallas, solo para tratar errores.

DECIDE ESTO ANTES DE ESCRIBIR NADA, Y PREGÚNTAME
`listas.cerrada` NO EXISTE en el esquema. El dominio lo tiene (Lista.cerrada),
los casos de uso lo respetan (abiertaONada) y hay pantallas que lo usan —cerrar
y reabrir—, pero la tabla no tiene esa columna. Es el único bloqueo real y no lo
resuelvas por tu cuenta: dime qué opciones ves y cuál recomiendas.
Para valorarlo: la base de datos está marcada como cerrada en la documentación,
pero eso ya se ha discutido antes y no es sagrado. Lo que sí quiero es saber qué
implica cada camino antes de tocar el esquema.

LO QUE NO SE REABRE
- La identidad aquí SÍ es directa: listas.id es un uuid de verdad, así que
  Lista.id === listas.id. No repitas el truco de id = nombre, que es exclusivo
  de productos y supermercados.
- ItemLista.artId es el NOMBRE del artículo, porque lista_items.producto
  referencia productos(nombre). Encaja solo, sin traducción.
- RepositorioListas.guardarItems SUSTITUYE los items de la lista por los que se
  le pasan. Es el contrato del puerto y así lo usan todos los casos de uso.

CUIDADO CON guardarItems
Es la parte delicada. «Sustituir» desde el cliente son dos operaciones —borrar
las que sobran e insertar las nuevas— y PostgREST no te da una transacción, así
que un fallo a mitad deja la lista inconsistente. Piénsalo y cuéntame qué haces:
me vale una función RPC en Postgres si te parece lo correcto, pero dímelo antes.
Ojo también a que se llama en cada toque de la interfaz: marcar comprado o subir
una cantidad reescribe la lista entera. Con AppProvider recargando la
instantánea después, cada + son varios viajes al servidor. Si ves que va lento,
dímelo; no lo optimices por tu cuenta.

ERRORES QUE HAY QUE TRATAR
Traduce los códigos de Postgres a castellano como en articulos.ts:
- 23505 -> clave duplicada.
- 23503 -> clave ajena: el artículo o la lista ya no existen. Es plausible de
  verdad, porque somos dos personas usando los mismos datos a la vez.
- 23514 -> check: nombre de lista de 1 a 50 caracteres, cantidad mayor que 0.
- 42501 -> RLS.
Las pantallas se escribieron contra mocks que no fallaban nunca. DialogoApp
(nuevaLista, cerrarLista), PanelAnadir y Dictar ya capturan y muestran el error
con componentes/Aviso.tsx. Los que faltan están en DetalleLista.tsx y Listas.tsx,
y son llamadas lanzadas sin esperar (void acciones...), así que hoy un fallo se
pierde sin que nadie se entere:
- DetalleLista.tsx:53 y Listas.tsx:139 - reabrirLista
- DetalleLista.tsx:129 - alternarComprado
- DetalleLista.tsx:194 y 210 - cambiarCantidad
Piensa dónde va el Aviso en una lista larga: si el error sale arriba del todo y
el usuario está tocando una fila del final, no lo va a ver.

LO QUE ESTO ARREGLA DE PASO
insertarDictado estaba medio conectado y ahora queda entero: ya no crea
artículos y, cuando las listas sean de Supabase, tampoco escribirá en memoria.
Confírmame que es así cuando termines.

CÓMO VERIFICARLO
El servidor de desarrollo se lanza con la configuración "lista-compra" de
.claude/launch.json. La sesión de Supabase está viva en el navegador del
preview; si te la pide, la contraseña la escribo yo, tú no.
Prueba contra la base de datos real desde las pantallas de Listas y Detalle:
crear lista, añadir artículos, cambiar cantidades, marcar y desmarcar comprado,
quitar un artículo, cerrar y reabrir, y recargar la página para comprobar que
todo sigue ahí —que es justo lo que hoy no pasa—. Verifica cada cambio
consultando las tablas, no solo mirando la pantalla.
Comprueba también el on delete cascade: borrar un artículo del catálogo tiene
que llevarse sus filas de lista_items.
Deja `listas` y `lista_items` como las encuentres: borra lo que crees para
probar. Termina con npm run typecheck limpio.

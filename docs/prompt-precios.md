Cierro la fase 2 de ListaCompra (D:\IA\ListaCompra): conectar los precios a
Supabase. Ya están hechos la autenticación, los supermercados, los artículos y
las listas; precios es el último puerto que queda en memoria.

Lee primero docs/estado-del-proyecto.md y src/infraestructura/supabase/
articulos.ts y listas.ts: entre los dos está todo el patrón.

QUÉ HAY QUE ESCRIBIR
- src/infraestructura/supabase/precios.ts, implementando RepositorioPrecios de
  src/dominio/puertos/index.ts contra la tabla `precios` de supabase/schema.sql.
- Enchufarlo en src/infraestructura/contenedor.ts, en dependenciasPorDefecto.
  Con eso el almacén en memoria deja de usarse del todo: fíjate en que el spread
  de enMemoria(almacenVacio()) pasa a aportar solo el reloj, y dilo si crees que
  conviene dejarlo explícito.
No toques el dominio ni los casos de uso. Las pantallas, solo para tratar
errores.

DECIDE ESTO ANTES DE ESCRIBIR NADA, Y PREGÚNTAME
`listar()` devuelve HOY el histórico entero, y cargarTodo lo pide de nuevo tras
cada acción, porque AppProvider recarga la instantánea al terminar. Eso significa
que cada + de una lista se trae todos los precios que hayamos apuntado nunca. Con
un mes de uso da igual; con dos años, no lo sé.
En el esquema hay una vista `precios_actuales` (el último precio por producto y
tienda) que no usa nadie, y parece escrita justo para esto. Pero el histórico
completo lo necesitan la ficha —evolución— y serieHistorica.
No lo resuelvas por tu cuenta: dime qué opciones ves, qué implica cada una para
la forma del puerto, y cuál recomiendas. Si la respuesta es «déjalo simple, son
cuatro filas», me vale, pero con el razonamiento delante.

LO QUE NO SE REABRE
- Aquí la identidad SÍ es el nombre, como en artículos y supermercados:
  Precio.artId es productos(nombre) y Precio.superId es supermercados(nombre).
  No es el caso de las listas, que llevan uuid.
- El dominio dice `importe` y la columna se llama `precio`. Hay que traducirlo
  en los dos sentidos.
- `guardar` SUSTITUYE el precio de esa fecha en esa tienda, no duplica. Es un
  upsert sobre unique (producto, supermercado, fecha), que NO es la clave
  primaria de la tabla —la clave es un id bigint automático—, así que comprueba
  que el onConflict apunta a la restricción correcta.
- Precio 0 o vacío borra el precio de hoy. Está en guardarPrecio
  (aplicacion/casos/precios.ts) y es una decisión tomada: es la forma de deshacer
  un apunte equivocado sin salir del teclado.

ERRORES QUE HAY QUE TRATAR
Traduce los códigos de Postgres a castellano como en articulos.ts y listas.ts:
- 23503 -> clave ajena: el artículo o la tienda ya no existen. Distingue cuál
  por el nombre de la restricción (precios_producto_fkey vs
  precios_supermercado_fkey), como se hizo en listas.ts. Es plausible de verdad,
  porque somos dos personas tocando los mismos datos a la vez.
- 23514 -> check: el precio no puede ser negativo.
- 22003 -> la columna es numeric(10,2), así que se desborda por encima de
  99999999,99. Es alcanzable: el teclado de HojaDePrecio limita a dos decimales
  pero no limita los enteros.
- 42501 -> RLS.
- 23505 no debería salir si el upsert está bien; si sale, es que el onConflict
  está mal.
Comprueba los códigos y los nombres de restricción provocándolos de verdad
contra la base, no de memoria. En listas.ts eso destapó que pasarse de largo en
un varchar no es un 23514 sino un 22001.

DONDE HOY UN FALLO SE PIERDE
Las dos pantallas que apuntan precios se escribieron contra mocks que no fallaban
nunca, y ninguna captura nada:
- HojaDePrecio.tsx:49 - `guardar` hace await y luego setHoja(null). Si el
  servidor rechaza, la promesa queda sin capturar y la hoja se cierra igual, como
  si hubiera ido bien.
- Ronda.tsx:33 - `confirma` BORRA el borrador antes de await guardarPrecio. Si
  falla, se pierde lo que la persona acaba de teclear y no se entera. Esto me
  parece lo más grave de los dos; arréglalo aunque implique reordenar la función.
Usa componentes/Aviso.tsx, como en el resto. La regla del proyecto es que si el
servidor rechaza, el formulario se queda abierto con lo escrito intacto. Y piensa
dónde va el aviso en la ronda, que es una lista larga: el mismo problema que
tuvimos en DetalleLista, donde acabó pegado a la fila que falla.

CÓMO VERIFICARLO
El servidor de desarrollo se lanza con la configuración "lista-compra" de
.claude/launch.json. La sesión de Supabase está viva en el navegador del preview;
si te la pide, la contraseña la escribo yo, tú no.
Prueba desde las pantallas: apuntar un precio en la hoja, volver a apuntarlo el
mismo día para ver que sustituye y no duplica, ponerlo a 0 para borrarlo, y la
ronda entera con su contador de «apuntados hoy». Verifica cada cambio
consultando la tabla, no solo mirando la pantalla.
Comprueba también que la comparativa de la ficha ordena bien y que el sobrecoste
en % sale del dato real, y que un artículo sin precio sigue diciendo «sin
precio» y nunca 0,00 €.
Deja la tabla `precios` como la encuentres: borra lo que crees para probar, y no
toques los precios que ya haya. Termina con npm run typecheck limpio.

CUANDO ACABES
Con esto la fase 2 queda cerrada. Dime si queda algún camino vivo que siga
pasando por infraestructura/memoria fuera del caso «sin .env», y actualiza
docs/estado-del-proyecto.md: §1, la lista de Hecho/Falta de §3 y la tabla de
códigos de error.

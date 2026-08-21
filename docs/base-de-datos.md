# Diseño de la base de datos

Proyecto: lista de la compra + comparativa de precios entre supermercados.
Motor: PostgreSQL (Supabase).

Estado: **cerrado**, con una excepción registrada (`listas.cerrada`, §6). El
esquema ejecutable está en [`supabase/schema.sql`](../supabase/schema.sql); las
bases ya creadas se ponen al día con los ficheros `supabase/migracion-*.sql`.

---

## 1. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Clave de `productos` y `supermercados` | El **nombre** es la clave primaria (clave natural) | Menos indirección: las consultas y la app leen el nombre directamente en vez de manejar UUIDs |
| Clave de `listas` | `uuid` generado | El nombre de una lista no es único ni estable ("Compra semanal" se repite) |
| Tipos de texto | `varchar(n)` en vez de `text` | En Postgres se almacenan igual; `varchar` añade un límite de longitud que evita datos basura |
| Clave de `precios` | `id` numérico automático, más un `unique` sobre `(producto, supermercado, fecha)` | El id simplifica editar y borrar una fila concreta; el `unique` conserva la regla de un precio por día y tienda |
| Precios | Se guarda **histórico**: la fecha distingue cada entrada | Permite ver la evolución del precio, no solo el último valor |
| Origen de los precios | Introducidos **a mano** por el usuario | Sin scraping: más simple, fiable y sin depender de webs de terceros |
| Granularidad del producto | **Genérico, sin marca ni formato**: "leche", "pimiento verde", "chuleta de cerdo" | Guardar la marca impediría comparar entre supermercados, que es justo el objetivo de la app |
| Significado del precio | **Por unidad de medida** (€/l, €/kg, €/ud), no por envase | Es la única forma de que dos tiendas con formatos distintos sean comparables |
| Unidad de medida | Campo `unidad` **en el producto**, con valores `l`, `kg` o `ud` | Cada artículo se mide siempre igual: la leche por litro, el pimiento por kilo, los huevos por unidad |
| Usuarios | Dos cuentas (yo y mi pareja) **compartiendo los mismos datos** | Una lista de la compra doméstica es común; separar datos por usuario no aportaría nada |
| Mayúsculas y acentos | Extensión `citext` activada | "Leche" y "leche" son el mismo producto, así la clave natural no acumula duplicados |

### Sobre `text` vs `varchar`

En PostgreSQL `text` **no** significa "texto largo". `text` y `varchar(n)` usan el
mismo almacenamiento y tienen el mismo rendimiento; la única diferencia es que
`varchar(n)` añade una comprobación de longitud. Ampliar el límite más adelante
(`alter table ... alter column ... type varchar(120)`) no reescribe la tabla.

Todas las columnas de nombre usan **50** caracteres. Sobra de largo, porque los
nombres son genéricos y cortos: "leche", "pimiento verde", "chuleta de cerdo".

### Sobre las claves naturales

Usar el nombre como clave primaria tiene dos consecuencias que hay que gestionar:

1. **Renombrar debe propagarse.** Todas las claves ajenas llevan
   `on update cascade`, para que cambiar "Leche" por "Leche entera" actualice
   automáticamente `precios` y `lista_items`.
2. **Mayúsculas y acentos crean duplicados.** "Leche", "leche" y "LECHE" serían
   tres productos distintos. Se resuelve con la extensión `citext`, que compara
   texto ignorando mayúsculas. Queda activada.

Como `citext` no admite un límite de longitud propio (no existe `citext(50)`),
el tope de 50 caracteres se impone con un `check (char_length(nombre) <= 50)`.

Las columnas de claves ajenas se declaran con el mismo tipo que la columna a la
que apuntan; por eso `precios.producto` y `lista_items.producto` son `citext`.

---

## 2. Esquema

Versión resumida. El fichero ejecutable, con comentarios, índices, vista y
políticas, es [`supabase/schema.sql`](../supabase/schema.sql).

```sql
create extension if not exists citext;

create table supermercados (
  nombre      citext primary key check (char_length(nombre) between 1 and 50),
  created_at  timestamptz not null default now()
);

create table productos (
  nombre      citext primary key check (char_length(nombre) between 1 and 50),
  unidad      varchar(2) not null default 'ud'
                check (unidad in ('l', 'kg', 'ud')),
  created_at  timestamptz not null default now()
);

create table precios (
  id            bigint generated always as identity primary key,
  producto      citext not null references productos(nombre)
                  on update cascade on delete cascade,
  supermercado  citext not null references supermercados(nombre)
                  on update cascade on delete cascade,
  fecha         date not null default current_date,
  precio        numeric(10,3) not null check (precio >= 0),
  created_at    timestamptz not null default now(),

  -- Un único precio por producto, supermercado y día
  unique (producto, supermercado, fecha)
);

create table listas (
  id          uuid primary key default gen_random_uuid(),
  nombre      varchar(50) not null,
  cerrada     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table lista_items (
  lista     uuid not null references listas(id) on delete cascade,
  producto  citext not null references productos(nombre)
              on update cascade on delete cascade,
  cantidad  numeric(10,2) not null default 1 check (cantidad > 0),
  comprado  boolean not null default false,
  primary key (lista, producto)
);
```

### Tablas, una a una

**`supermercados`** — catálogo de tiendas donde compras: Mercadona, Lidl, Alcampo…

**`productos`** — catálogo de artículos, siempre **genéricos**: "leche",
"pimiento verde", "chuleta de cerdo". Nunca marca ni formato, porque comparar
"Leche Pascual" con "Leche Hacendado" no responde a la pregunta que hace la app.

`unidad` indica en qué se mide el producto (`ud` unidades, `kg` peso, `l`
volumen) y es la referencia del precio: si `unidad = 'l'`, el precio guardado es
**euros por litro**, no lo que cuesta el brick. Sin esa normalización un brick de
1 L y otro de 1,5 L no serían comparables.

`favorito` marca los que se compran siempre, para poder filtrarlos cuando el
catálogo crece. Es del **producto** y no de quien lo marca: los dos usuarios
comparten catálogo, listas y precios, así que una tabla `favoritos` por usuario
inventaría una distinción que no existe y metería un `join` en cada listado.

**`precios`** — cuánto cuesta un producto en un supermercado en una fecha dada.
Es el corazón de la comparativa.

Lleva un `id` numérico automático como clave primaria (`generated always as
identity`, el equivalente moderno al antiguo `serial`): Postgres asigna el
siguiente número solo y la app no puede escribirlo a mano.

La regla de negocio "un solo precio por producto, supermercado y día" se mantiene
aparte, como restricción `unique (producto, supermercado, fecha)`. Sin ella,
apuntar dos veces el mismo precio el mismo día crearía filas duplicadas y la
comparativa sumaría de más. Con ella, volver a apuntar el mismo día **sobrescribe**
(vía `upsert`), y apuntarlo otro día **añade** una entrada al histórico.

Tener `id` propio además simplifica la app: editar o borrar un precio concreto es
`where id = ...` en vez de arrastrar las tres columnas de la clave.

**`listas`** — cada lista de la compra. Se identifica por `uuid` porque el
nombre puede repetirse. `cerrada` marca la compra ya hecha: la lista deja de
aparecer entre las abiertas y pasa a ser de solo consulta, pero se puede
reabrir.

**`lista_items`** — qué productos hay en cada lista, en qué cantidad, y si ya
están comprados. La clave `(lista, producto)` impide que el mismo producto
aparezca dos veces en la misma lista.

### Diagrama de relaciones

```
supermercados ──┐
                ├──< precios >──┐
productos ──────┘               │
    │                           │
    └──< lista_items >── listas ┘
```

Un producto tiene muchos precios (uno por supermercado y fecha) y puede estar en
muchas listas.

---

## 3. Consultas previstas

### Precio actual de cada producto en cada supermercado

Como `precios` guarda histórico, el precio vigente es el de fecha más reciente:

```sql
create view precios_actuales as
select distinct on (producto, supermercado)
       producto, supermercado, precio, fecha
from   precios
order  by producto, supermercado, fecha desc;
```

`distinct on` es específico de Postgres: devuelve la primera fila de cada grupo
según el `order by`. Al ordenar por fecha descendente, esa primera fila es la más
reciente.

### Coste de una lista en cada supermercado

Es el objetivo de la app: "esta compra te sale por X en Mercadona y por Y en Lidl".

```sql
select   pa.supermercado,
         sum(li.cantidad * pa.precio) as total,
         count(*)                     as productos_con_precio
from     lista_items li
join     precios_actuales pa on pa.producto = li.producto
where    li.lista = $1
group by pa.supermercado
order by total;
```

Aviso importante: un supermercado en el que falten precios saldrá artificialmente
barato. Por eso la consulta devuelve también `productos_con_precio`, para poder
avisar en la interfaz de que la comparación está incompleta.

### Evolución del precio de un producto

```sql
select supermercado, fecha, precio
from   precios
where  producto = $1
order  by fecha;
```

---

## 4. Seguridad (RLS)

La clave de Supabase que viaja en el móvil es **pública**. Sin Row Level Security
cualquiera con esa clave podría leer y escribir la base de datos entera.

Por tanto: `alter table ... enable row level security` en **todas** las tablas,
más una política de acceso en cada una.

**Modelo elegido: datos compartidos entre las dos cuentas.** Cualquier usuario
autenticado ve y edita los mismos productos, precios y listas; quien no ha
iniciado sesión no ve nada. La política es la misma en las cinco tablas:

```sql
alter table productos enable row level security;

create policy "usuarios autenticados" on productos
  for all to authenticated using (true) with check (true);
```

> **Paso obligatorio en Supabase.** Con este modelo, cualquiera que consiga
> crear una cuenta entra a los datos. Hay que desactivar el registro público:
> *Authentication → Providers → Email → "Allow new users to sign up" = OFF*,
> y crear las dos cuentas a mano desde *Authentication → Users*.

La vista `precios_actuales` se declara con `security_invoker = on` para que
respete estas políticas. Sin esa opción, una vista puede saltarse el RLS de las
tablas que consulta.

---

## 5. Puntos a tener en cuenta

**Borrar arrastra.** `on delete cascade` significa que borrar un producto borra
también todo su histórico de precios y su presencia en las listas, sin
preguntar. Si algún día molesta, se cambia por `on delete restrict`, que impide
borrar un producto mientras tenga precios.

**Al meter precios hay que normalizar a mano.** Como el precio se guarda por
unidad de medida, un brick de 1,5 L a 1,80 € se apunta como 1,20 €/l. La
interfaz debería mostrar la unidad del producto junto al campo para no
equivocarse.

**Comparativas incompletas.** Un supermercado con precios sin rellenar saldrá
artificialmente barato en el total. Por eso la consulta de comparativa devuelve
`productos_con_precio`, y la interfaz debe avisar cuando no cubre la lista
entera.

**Las imágenes no están aquí.** Las fotos de producto y los logos de tienda
viven en el cubo `imagenes` de Storage, y **su ruta se deduce del nombre**:
`fotos/<nombre en minúsculas>-80.jpg` y `-720.jpg`, igual para `logos/`. No hay
columna que las apunte, y por eso:

- Renombrar un producto o una tienda **no mueve su imagen**. El
  `on update cascade` arrastra precios e items; el fichero de Storage no se
  entera, y moverlo es cosa de la aplicación.
- Borrar tampoco la borra en cascada. Lo hace el caso de uso; si alguien borra
  la fila desde el editor de Supabase, el fichero se queda.

Las minúsculas no son cosmética: `nombre` es `citext`, así que «Leche» y
«leche» son la misma fila, y sin plegar el nombre serían dos ficheros.

---

## 6. Historial de cambios

- 2026-08-19 — Primera versión del borrador.
- 2026-08-19 — `precios` pasa a tener `id` automático como clave primaria; la
  combinación `(producto, supermercado, fecha)` se conserva como `unique`.
- 2026-08-19 — Productos genéricos, sin marca ni formato. `productos.nombre` baja
  a 50 caracteres y el precio se define por unidad de medida.
- 2026-08-19 — Decisiones cerradas: dos usuarios con datos compartidos, `citext`
  activado, y `unidad` (`l` / `kg` / `ud`) fijada a nivel de producto. Esquema
  ejecutable en `supabase/schema.sql`.
- 2026-08-20 — Añadida `listas.cerrada` (`boolean not null default false`).
  Migración en `supabase/migracion-01-lista-cerrada.sql`.

  Es el único punto donde la fase 2 ha abierto el esquema, y se hizo a
  conciencia: el dominio tiene `Lista.cerrada` desde la fase 1 y hay pantallas
  que cierran y reabren, pero la tabla nació sin esa columna, así que cerrar una
  lista no se guardaba en ninguna parte. Las alternativas sin tocar la base eran
  peores: en `localStorage` cada móvil vería un estado distinto, que rompe lo
  que da sentido al proyecto; y derivarlo de «todos los items comprados» haría
  que una lista vacía naciera cerrada y dejaría *reabrir* sin significado.

  El RLS no cambia: la política de `listas` es `for all`, así que cubre la
  columna nueva.
- 2026-08-20 — Cubo `imagenes` en Storage, público, con políticas de escritura
  para `authenticated`. Migración en `supabase/migracion-04-fotos.sql`.

  **No hay tabla ni columna nueva**: la ruta se deduce del nombre (§5). La
  política de `select` hace falta aunque el cubo sea público, porque leer la
  imagen por su URL no pasa por RLS pero **listar la carpeta sí**, y la
  aplicación lista las dos carpetas al entrar.
- 2026-08-21 — Añadida `productos.favorito` (`boolean not null default false`)
  con índice parcial `where favorito`. Migración en
  `supabase/migracion-05-favoritos.sql`.

  Columna y no tabla por usuario: el favorito es del producto, porque el
  catálogo es compartido. `default false` evita tener que rellenar las filas
  que ya están, y el `not null` evita que la aplicación trate el `null` como un
  tercer estado. El RLS no cambia: la política de `productos` es `for all`.

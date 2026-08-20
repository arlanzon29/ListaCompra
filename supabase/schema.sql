-- ============================================================================
--  Lista de la compra + comparativa de precios
--  Esquema para Supabase (PostgreSQL)
--
--  Cómo ejecutarlo:
--    Supabase -> SQL Editor -> pegar este fichero -> Run
--
--  Diseño y motivos: ../docs/base-de-datos.md
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensiones
-- ----------------------------------------------------------------------------

-- citext = "case-insensitive text": las comparaciones ignoran mayúsculas.
-- Con esto 'Leche', 'leche' y 'LECHE' son el MISMO producto, y la clave
-- primaria natural no se llena de duplicados.
create extension if not exists citext;


-- ----------------------------------------------------------------------------
-- 2. Tablas
-- ----------------------------------------------------------------------------

-- Tiendas donde compras: Mercadona, Lidl, Alcampo...
create table supermercados (
  nombre      citext primary key
                check (char_length(nombre) between 1 and 50),
  created_at  timestamptz not null default now()
);


-- Artículos SIEMPRE genéricos: 'leche', 'pimiento verde', 'chuleta de cerdo'.
-- Nunca marca ni formato: guardar la marca impediría comparar entre tiendas.
create table productos (
  nombre      citext primary key
                check (char_length(nombre) between 1 and 50),

  -- Unidad de medida en la que se expresa el precio de este producto.
  --   'l'  -> el precio es euros por litro
  --   'kg' -> el precio es euros por kilo
  --   'ud' -> el precio es euros por unidad
  unidad      varchar(2) not null default 'ud'
                check (unidad in ('l', 'kg', 'ud')),

  created_at  timestamptz not null default now()
);


-- Precio de un producto en un supermercado en una fecha.
-- OJO: el precio va SIEMPRE en la unidad declarada en productos.unidad.
create table precios (
  id            bigint generated always as identity primary key,

  producto      citext not null references productos(nombre)
                  on update cascade on delete cascade,
  supermercado  citext not null references supermercados(nombre)
                  on update cascade on delete cascade,

  fecha         date not null default current_date,
  precio        numeric(10,3) not null check (precio >= 0),
  created_at    timestamptz not null default now(),

  -- Un único precio por producto, supermercado y día.
  -- Volver a apuntar el mismo día sobrescribe (upsert);
  -- apuntarlo otro día añade una entrada al histórico.
  unique (producto, supermercado, fecha)
);

-- Índice para la consulta "evolución del precio de un producto".
create index precios_producto_fecha_idx on precios (producto, fecha desc);


-- Cada lista de la compra. Id propio porque el nombre puede repetirse.
create table listas (
  id          uuid primary key default gen_random_uuid(),
  nombre      varchar(50) not null check (char_length(nombre) >= 1),

  -- Una lista cerrada es de solo consulta: la compra ya se hizo. Se conserva
  -- para poder mirarla, y se puede reabrir.
  cerrada     boolean not null default false,

  created_at  timestamptz not null default now()
);


-- Qué productos hay en cada lista.
create table lista_items (
  lista     uuid not null references listas(id) on delete cascade,
  producto  citext not null references productos(nombre)
              on update cascade on delete cascade,
  cantidad  numeric(10,2) not null default 1 check (cantidad > 0),
  comprado  boolean not null default false,

  -- Impide que el mismo producto aparezca dos veces en la misma lista.
  primary key (lista, producto)
);


-- ----------------------------------------------------------------------------
-- 3. Vistas
-- ----------------------------------------------------------------------------

-- Precio vigente de cada producto en cada supermercado = el más reciente.
--
-- 'distinct on' es propio de Postgres: devuelve la primera fila de cada grupo
-- según el order by. Ordenando por fecha descendente, esa primera fila es la
-- más reciente.
--
-- security_invoker = on hace que la vista respete las políticas RLS de quien
-- la consulta. Sin esto una vista puede saltarse la seguridad de las tablas.
create view precios_actuales
with (security_invoker = on)
as
select distinct on (producto, supermercado)
       producto,
       supermercado,
       precio,
       fecha
from   precios
order  by producto, supermercado, fecha desc;


-- ----------------------------------------------------------------------------
-- 4. Seguridad (RLS)
-- ----------------------------------------------------------------------------
--
-- La clave anónima de Supabase viaja dentro de la app del móvil y es PÚBLICA.
-- Sin RLS, cualquiera con esa clave leería y escribiría toda la base de datos.
--
-- Modelo elegido: datos COMPARTIDOS entre los usuarios registrados (tú y tu
-- pareja). Cualquier usuario autenticado ve y edita los mismos datos; un
-- visitante sin sesión iniciada no ve nada.
--
-- IMPORTANTE: esto implica que quien consiga crear una cuenta entra. Hay que
-- DESACTIVAR el registro público en Supabase:
--   Authentication -> Providers -> Email -> "Allow new users to sign up" = OFF
-- y crear las dos cuentas a mano desde Authentication -> Users.

alter table supermercados enable row level security;
alter table productos     enable row level security;
alter table precios       enable row level security;
alter table listas        enable row level security;
alter table lista_items   enable row level security;

create policy "usuarios autenticados" on supermercados
  for all to authenticated using (true) with check (true);

create policy "usuarios autenticados" on productos
  for all to authenticated using (true) with check (true);

create policy "usuarios autenticados" on precios
  for all to authenticated using (true) with check (true);

create policy "usuarios autenticados" on listas
  for all to authenticated using (true) with check (true);

create policy "usuarios autenticados" on lista_items
  for all to authenticated using (true) with check (true);


-- ----------------------------------------------------------------------------
-- 5. Imágenes (Storage)
-- ----------------------------------------------------------------------------
--
-- Las fotos de producto y los logos de tienda NO están en estas tablas: viven
-- en el cubo `imagenes` de Storage, y su ruta se deduce del nombre.
--
--     fotos/<nombre en minúsculas>-80.jpg  ·  -720.jpg
--     logos/<nombre en minúsculas>-80.jpg  ·  -720.jpg
--
-- Meter la imagen en la propia tabla quedó descartado: `cargarTodo` se trae el
-- catálogo entero después de cada acción, así que cada `+` de una lista
-- arrastraría las fotos.
--
-- La contrapartida de que la ruta se deduzca: al renombrar, el
-- `on update cascade` de arriba arrastra precios e items, pero no la imagen.
-- Eso lo hace la aplicación a mano.
--
-- El cubo y sus políticas se crean en migracion-04-fotos.sql. No se repiten
-- aquí porque tocan `storage.objects`, que ya existe en cualquier proyecto de
-- Supabase y no forma parte de este esquema.


-- ----------------------------------------------------------------------------
-- 6. Datos de ejemplo (opcional)
-- ----------------------------------------------------------------------------
-- Descomenta para tener algo con lo que probar.

-- insert into supermercados (nombre) values
--   ('Mercadona'), ('Lidl'), ('Alcampo');
--
-- insert into productos (nombre, unidad) values
--   ('leche',             'l'),
--   ('pimiento verde',    'kg'),
--   ('chuleta de cerdo',  'kg'),
--   ('huevos',            'ud');
--
-- insert into precios (producto, supermercado, precio) values
--   ('leche',          'Mercadona', 0.95),
--   ('leche',          'Lidl',      0.89),
--   ('pimiento verde', 'Mercadona', 2.40),
--   ('pimiento verde', 'Lidl',      2.15);

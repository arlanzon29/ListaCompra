-- ---------------------------------------------------------------------------
-- Migración 04: fotos de producto y logos de tienda en Storage
-- ---------------------------------------------------------------------------
--
-- Hasta ahora las imágenes eran data-URLs en el `localStorage` del navegador.
-- Eso significaba que la foto que hacía uno el otro no la veía nunca, que el
-- cupo del navegador se llenaba con dos fotos y las perdía en silencio, y que
-- las de `localhost` y las de GitHub Pages eran mundos distintos.
--
-- Aquí no hay tabla nueva. La ruta del fichero SE DEDUCE DEL NOMBRE:
--
--     fotos/<nombre en minúsculas>-80.jpg     miniatura de las filas
--     fotos/<nombre en minúsculas>-720.jpg    plato de la ficha
--     logos/<nombre en minúsculas>-80.jpg     logo de la tienda
--     logos/<nombre en minúsculas>-720.jpg
--
-- Minúsculas porque `productos.nombre` y `supermercados.nombre` son `citext`:
-- para la base «Leche» y «leche» son el mismo artículo, y sin plegar el nombre
-- serían dos ficheros distintos.
--
-- Lo que esto cuesta, y conviene tenerlo escrito: al no haber columna, el
-- `on update cascade` que arrastra precios e items al renombrar NO llega a la
-- imagen. Moverla es cosa de la aplicación (`acompanaImagen`, en
-- aplicacion/casos/imagenes.ts). Si algún día eso da guerra, la salida es una
-- columna `foto text` en cada tabla, y entonces la ruta deja de deducirse.
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ---------------------------------------------------------------------------


-- 1. El cubo -----------------------------------------------------------------
--
-- PÚBLICO a propósito: la URL es directa, estable y la cachea el CDN, sin una
-- llamada de firma por cada miniatura. Son fotos de un brik de leche y las
-- URLs no se publican en ningún sitio. Lo que sigue exigiendo sesión es
-- ESCRIBIR, que es lo que dicen las políticas de abajo.
--
-- El límite de 2 MB es holgado: la aplicación reduce la imagen en el navegador
-- antes de subirla y una foto de 720 px ronda los 80 KB. Está para que un
-- fallo de la reducción no acabe en un fichero de doce megapíxeles.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagenes', 'imagenes', true, 2097152, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 2. Ver el cubo desde una sesión normal (opcional) --------------------------
--
-- `storage.buckets` es una tabla con RLS activado y sin ninguna política, así
-- que la fila del cubo existe pero una sesión normal no la ve: los endpoints
-- de administración —`getBucket`, `listBuckets`— contestan `Bucket not found`
-- a un cubo que está sirviendo imágenes en ese mismo momento.
--
-- **La aplicación no necesita esto**: no llama a ninguno de los dos. Subir,
-- listar, leer y borrar ficheros van contra `storage.objects` y funcionan sin
-- esta política. Está aquí porque sin ella no se puede comprobar desde fuera
-- si el cubo está bien montado, y eso convierte cualquier fallo de subida en
-- una tarde de adivinanzas. Si prefieres el mínimo privilegio, se puede
-- quitar; lo que se pierde es el diagnóstico.
--
-- Creándolo desde el panel no se nota, porque el panel también va con la clave
-- de servicio. Por eso el síntoma es tan desconcertante: la fila está ahí y la
-- aplicación jura que no.
drop policy if exists "imagenes cubo visible" on storage.buckets;
create policy "imagenes cubo visible" on storage.buckets
  for select to authenticated
  using (id = 'imagenes');


-- 3. Políticas de los ficheros -----------------------------------------------
--
-- Son sobre `storage.objects`, que es otra tabla con RLS: las de §4 del
-- esquema no cubren esto.
--
-- El `select` hace falta AUNQUE el cubo sea público: leer la imagen por su URL
-- pública no pasa por RLS, pero LISTAR la carpeta sí, y la aplicación lista
-- las dos carpetas al entrar para saber quién tiene imagen.

drop policy if exists "imagenes lectura" on storage.objects;
create policy "imagenes lectura" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagenes');

drop policy if exists "imagenes alta" on storage.objects;
create policy "imagenes alta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagenes');

-- `update` es lo que usa el `upsert` al sustituir una foto, y también la
-- segunda mitad de un `move` al renombrar.
drop policy if exists "imagenes cambio" on storage.objects;
create policy "imagenes cambio" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagenes')
  with check (bucket_id = 'imagenes');

drop policy if exists "imagenes baja" on storage.objects;
create policy "imagenes baja" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagenes');

# Prompt para claude.ai/design

Copia el bloque de abajo y pégalo en un proyecto de Design.

---

Diseña una aplicación web móvil para gestionar la lista de la compra y comparar
precios entre supermercados. Es una app de uso doméstico, para dos personas
(una pareja) que comparten los mismos datos.

## Contexto técnico

- Se usa **en el móvil**, en vertical, muchas veces **de pie en un pasillo del
  supermercado y con una mano**. La comodidad de uso con una sola mano y los
  objetivos táctiles grandes importan más que la densidad de información.
- Se implementará como **PWA en React**, así que necesito componentes web
  (HTML/CSS), no diseño de app nativa.
- Interfaz **en español**, moneda en euros.
- Debe funcionar bien en modo claro y oscuro.

## Modelo de datos (ya está cerrado, no lo cambies)

- **Artículo**: nombre genérico + unidad de medida.
  - El nombre es siempre **genérico, sin marca ni formato**: "leche", "pimiento
    verde", "chuleta de cerdo". Nunca "Leche Pascual 1L". El objetivo es
    comparar el mismo producto entre tiendas, no comparar marcas.
  - La unidad es **litro, kilo o unidad**, y es fija por artículo: la leche
    siempre por litro, el pimiento siempre por kilo, los huevos por unidad.
- **Supermercado**: solo un nombre (Mercadona, Lidl, Alcampo...).
- **Precio**: artículo + supermercado + fecha + importe.
  - El importe es **siempre por unidad de medida** (€/l, €/kg, €/ud), nunca el
    precio del envase. Esto es importante en el diseño: al introducir un precio
    hay que dejar clarísimo que se pide "euros por litro", no "lo que cuesta el
    brick", porque es el error más fácil de cometer.
  - Se guarda **histórico**: un precio por artículo, tienda y día. Se puede ver
    la evolución en el tiempo.
- **Lista de la compra**: nombre + artículos, cada uno con cantidad y una marca
  de "ya comprado".

## Pantallas

**Mantenimiento**

1. **Artículos** — listado con alta, edición y borrado. Cada artículo muestra su
   unidad de medida. Con búsqueda, porque el catálogo crecerá.
2. **Supermercados** — alta, edición y borrado. Muy simple, solo el nombre.
   Decide tú si merece pantalla propia o vive dentro de ajustes.

**Precios**

3. **Captura de precios** — la pantalla más importante y la que decide si la app
   se usa o se abandona. Se usa dentro del supermercado, deprisa. **Propón tú el
   flujo que creas mejor**: no tengo decidido si conviene fijar primero el
   supermercado e ir recorriendo artículos, o capturar de uno en uno, o
   integrarlo en la propia lista de la compra. Me interesa tu criterio, y ver
   una alternativa si crees que hay dos enfoques defendibles.
4. **Ficha de artículo** — precio actual en cada supermercado, ordenado de más
   barato a más caro, y evolución histórica del precio.

**Compra**

5. **Listas** — las listas creadas, con opción de crear una nueva.
6. **Detalle de lista** — añadir artículos, ajustar cantidades, e ir marcando lo
   que ya has cogido. Es la pantalla de uso diario mientras compras.
7. **Comparativa** — para la lista abierta: cuánto costaría en cada
   supermercado, de más barato a más caro.
   - Detalle crítico: un supermercado al que le falten precios sale
     **artificialmente barato**. El diseño tiene que avisar de cuántos artículos
     de la lista no tienen precio en esa tienda, para que el total no engañe.
8. **Login** — email y contraseña. Sin registro público: las cuentas se crean a
   mano. Pantalla mínima.

## Navegación

Propón tú la estructura de navegación y cuál debería ser la pantalla de inicio.
Ten en cuenta que el uso se reparte en dos momentos muy distintos: preparar la
compra en casa (listas, comparativa) y estar dentro de la tienda (marcar lo
comprado, apuntar precios).

## Lo que NO quiero

- Nada de escanear códigos de barras ni importar precios automáticamente: los
  precios se meten a mano.
- Nada de marcas ni de formatos de envase en ningún sitio.
- Nada de funciones sociales, compartir con terceros ni recomendaciones.

## Qué espero de ti

Un sistema de componentes coherente y las pantallas anteriores diseñadas, con
los estados que hagan falta (lista vacía, cargando, error, artículo sin precios
en ninguna tienda). Prioriza que se pueda usar deprisa y con una mano por encima
de que sea bonito.

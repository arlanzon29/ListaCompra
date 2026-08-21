/**
 * La clave con la que se indexa una imagen: de `id` a nombre de fichero.
 *
 * Va con el puerto y no dentro del adaptador porque es **contrato de las dos
 * partes**: quien implementa `RepositorioImagenes` guarda con esta clave, y
 * quien lee los mapas que devuelve `listar` tiene que preguntar con la misma.
 * Antes esto era un `.toLowerCase()` repetido en tres sitios y un párrafo de
 * comentario pidiendo que no se olvidara.
 *
 * ## Por qué no basta con bajar a minúsculas
 *
 * Era un fallo de verdad: **un artículo con acentos no podía tener foto**.
 * «plátano» daba error al subirla. Reproducido contra el proyecto real, la
 * respuesta de Storage es:
 *
 *     {"statusCode":"400","error":"InvalidKey",
 *      "message":"Invalid key: fotos/plátano-720.jpg","code":"InvalidKey"}
 *
 * Midiendo carácter a carácter contra el servidor, y no de memoria, Storage
 * acepta exactamente esto y nada más:
 *
 *     espacio ! $ & ' ( ) * + , - . / : ; = ? @ _ 0-9 A-Z a-z
 *
 * Y rechaza `" # % < > [ \ ] ^ ` { | } ~` **y todo lo que no sea ASCII**. O
 * sea: no son solo los acentos y la `ñ`. «leche 1,5 %» o unas comillas en el
 * nombre rompen igual, así que esto no puede ser una lista de acentos: es una
 * lista blanca.
 *
 * ## La `/` se queda fuera aunque Storage la acepte
 *
 * Es el caso silencioso, y el peor. «aceite 1/2 l» no daría error: subiría el
 * fichero a una **subcarpeta**, y `listar` solo mira el primer nivel, así que
 * la foto existiría y no se vería nunca. Un error se arregla; esto no se nota.
 *
 * ## Las fotos que ya están subidas siguen valiendo
 *
 * Es la condición que hacía falta antes de tocar la ruta, y se cumple por
 * construcción: **si el id en minúsculas ya es una clave válida, se devuelve
 * tal cual**. Un fichero que hoy existe en el cubo tiene, por fuerza, una
 * clave que Storage aceptó, así que su id sigue cayendo en la misma ruta. Lo
 * que cambia de ruta es solo lo que hoy no puede tener fichero.
 *
 * ## Dos artículos distintos no acaban en el mismo fichero
 *
 * Plegar «plátano» a «platano» los junta con un artículo llamado «platano», y
 * también junta «peña» con «pena». Por eso lo plegado **no se usa solo**: lleva
 * detrás la huella del nombre entero, la de antes de plegar. «plátano» va a
 * `platano-a3f1c204` y «platano» a `platano`, que no es lo mismo.
 *
 * La huella es de 32 bits. Con un catálogo doméstico —cientos de artículos, de
 * ellos unas decenas con acentos— la probabilidad de que dos caigan en la
 * misma ronda 1 entre 10 millones, muy por debajo de cualquier otro fallo de
 * este sistema. Si algún día el catálogo fuese de otro tamaño, la salida está
 * escrita en `migracion-04-fotos.sql`: una columna `foto text` y dejar de
 * deducir la ruta.
 */

/**
 * Lo que Storage acepta, menos la `/`.
 *
 * Solo minúsculas porque la clave se baja antes: `productos.nombre` es
 * `citext` y para la base «Leche» y «leche» son el mismo artículo.
 */
const SEGURO = /^[a-z0-9 !$&'()*+,\-.:;=?@_]$/

const esSeguro = (s: string): boolean => [...s].every((c) => SEGURO.test(c))

/**
 * FNV-1a de 32 bits, en 8 dígitos hexadecimales.
 *
 * No hace falta que sea criptográfica: lo que tiene que hacer es separar dos
 * nombres que al plegarse se parecen. Se recorre por punto de código para que
 * dos emojis distintos no se vean iguales.
 */
const huella = (s: string): string => {
  let h = 0x811c9dc5
  for (const c of s) {
    h ^= c.codePointAt(0) as number
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export const claveImagen = (id: string): string => {
  const bajo = id.toLowerCase()
  if (esSeguro(bajo)) return bajo

  // `NFD` separa la letra de su tilde, y el rango son los diacríticos
  // combinantes: así «á» queda en «a» y «ñ» en «n». Es solo para que la
  // carpeta se pueda leer; lo que garantiza que no haya dos iguales es la
  // huella de la línea siguiente.
  const plegado = bajo.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const limpio = [...plegado].map((c) => (SEGURO.test(c) ? c : '-')).join('')
  return `${limpio}-${huella(bajo)}`
}

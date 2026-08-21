/**
 * Los iconos de la interfaz, en un solo sitio.
 *
 * Hasta ahora eran glifos tipográficos (`☰ ⊞ ⚙ ⌂ ✓ − + × ‹ ›`). Se veían, pero
 * cada uno lo dibujaba la fuente del sistema: distinto grosor, distinto tamaño
 * óptico y distinta altura sobre la línea en cada móvil, y ninguno se podía
 * alinear con el texto de al lado. El sistema visual *Classical* especifica
 * **Lucide**, que es la geometría que se dibuja aquí.
 *
 * POR QUÉ NO SE USA EL PAQUETE `lucide-react`. Se instaló, y su versión 1.33.0
 * llega con **todos los ficheros de tipos vacíos**, así que TypeScript no la
 * reconoce como módulo (`TS2306`). Bajar de versión tampoco se pudo: `npm
 * install` falla en esta máquina por los paquetes opcionales de TypeScript y
 * deshace la instalación entera.
 *
 * Copiar la geometría sale más barato que arrastrar ese problema. Son doce
 * iconos de una o dos líneas cada uno, Lucide es ISC —se puede— y así la app
 * sigue sin más dependencias que React y Supabase. Si algún día hace falta un
 * juego entero, se instala el paquete y se cambia solo este fichero.
 *
 * Todos van en la rejilla de 24, que es la de Lucide: las coordenadas se pueden
 * copiar tal cual de su web sin recalcular nada.
 *
 * El `aria-hidden` va puesto a propósito: **el icono nunca es la etiqueta**.
 * Todos los botones llevan ya texto visible o `aria-label`, así que anunciar
 * además el icono sería decir lo mismo dos veces.
 *
 * `currentColor` es lo que permite que el color lo ponga quien lo usa, con la
 * misma variable de tema que el texto que lo acompaña.
 */

type Props = {
  /** Lado en píxeles. */
  size?: number
  /** Por defecto hereda el color del texto. */
  color?: string
}

/**
 * El marco común. `strokeWidth` 1.75 y no el 2 de Lucide: con una tipografía
 * serif al lado, el 2 se ve tosco.
 */
const Svg = ({
  size = 20,
  color = 'currentColor',
  children,
}: Props & { children: React.ReactNode }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
    style={{ flex: 'none' }}
  >
    {children}
  </svg>
)

// ─── Las cuatro pestañas ───

/** `house` */
export const IconoInicio = (p: Props) => (
  <Svg {...p}>
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
)

/** `menu` */
export const IconoListas = (p: Props) => (
  <Svg {...p}>
    <path d="M4 5h16" />
    <path d="M4 12h16" />
    <path d="M4 19h16" />
  </Svg>
)

/** `layout-grid` */
export const IconoCatalogo = (p: Props) => (
  <Svg {...p}>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </Svg>
)

/**
 * `settings-2`, no la rueda dentada.
 *
 * A 22 px los dientes de `settings` se convierten en un borrón; estos dos
 * mandos se leen igual de bien en la barra que en una pantalla grande.
 */
export const IconoAjustes = (p: Props) => (
  <Svg {...p}>
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </Svg>
)

// ─── Navegación ───

/** `chevron-left`. Atrás, en la cabecera. */
export const IconoAtras = (p: Props) => (
  <Svg {...p}>
    <path d="m15 18-6-6 6-6" />
  </Svg>
)

/** `chevron-right`. «Esto lleva a otro sitio», al final de una fila que se toca. */
export const IconoAvanzar = (p: Props) => (
  <Svg {...p}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
)

// ─── Acciones ───

/** `plus` */
export const IconoMas = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </Svg>
)

/** `minus` */
export const IconoMenos = (p: Props) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

/** `x`. Cerrar una hoja o un panel. Nunca «borrar»: para eso está el de abajo. */
export const IconoCerrar = (p: Props) => (
  <Svg {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Svg>
)

/**
 * `trash-2`. Borrar de verdad, con su diálogo de confirmación detrás.
 *
 * Antes esto también era una `×`, la misma que cerrar. Dos cosas irreversibles
 * de distinta gravedad no pueden compartir símbolo: en Ajustes, la `×` de
 * borrar un supermercado se parecía demasiado a la de cerrar la hoja.
 */
export const IconoBorrar = (p: Props) => (
  <Svg {...p}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Svg>
)

/** `check`. Elegido, en la lista de añadir artículos. */
export const IconoElegido = (p: Props) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)

/**
 * `star`. Favorito, en el catálogo y en el panel de añadir.
 *
 * Es el único icono que se pinta relleno: el favorito es un estado con dos
 * valores y hay que distinguirlos de un vistazo, con el carro en la otra mano.
 * `relleno` mete el mismo color por dentro; sin él es el contorno de siempre.
 */
export const IconoFavorito = ({ relleno = false, ...p }: Props & { relleno?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={p.size ?? 20}
    height={p.size ?? 20}
    viewBox="0 0 24 24"
    fill={relleno ? (p.color ?? 'currentColor') : 'none'}
    stroke={p.color ?? 'currentColor'}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
    style={{ flex: 'none' }}
  >
    <path d="M11.5 3.2a.55.55 0 0 1 1 0l2.2 4.46a.55.55 0 0 0 .41.3l4.93.72a.55.55 0 0 1 .3.94l-3.56 3.47a.55.55 0 0 0-.16.49l.84 4.9a.55.55 0 0 1-.79.58l-4.41-2.32a.55.55 0 0 0-.51 0l-4.4 2.32a.55.55 0 0 1-.8-.58l.84-4.9a.55.55 0 0 0-.15-.49L3.38 9.62a.55.55 0 0 1 .3-.94l4.94-.72a.55.55 0 0 0 .41-.3Z" />
  </svg>
)

// ─── Tema ───

/** `sun` */
export const IconoClaro = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </Svg>
)

/** `moon` */
export const IconoOscuro = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Svg>
)

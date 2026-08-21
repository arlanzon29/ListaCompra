import { useApp } from '../estado/AppProvider'
import { IconoFavorito } from '../iconos'

/**
 * El filtro «solo favoritos», que usan el catálogo y el panel de añadir.
 *
 * Marcar y desmarcar NO se hace desde la fila: la fila del catálogo ya iba
 * justa de ancho y una columna más se comía el nombre del artículo. La
 * estrella se pone desde «Editar», donde ya se cambian el nombre y la unidad;
 * en la fila queda solo como indicador, pegada al nombre.
 *
 * Se comporta como un interruptor —queda hundido cuando está puesto— y
 * desaparece mientras no haya ningún favorito: un filtro que solo puede dejar
 * la pantalla vacía no es una ayuda, es una trampa.
 */
export const FiltroFavoritos = ({ cuantos }: { cuantos: number }) => {
  const { soloFav, setSoloFav } = useApp()
  if (cuantos === 0) return null

  return (
    <button
      onClick={() => setSoloFav(!soloFav)}
      aria-pressed={soloFav}
      style={{
        flex: 'none',
        height: 48,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${soloFav ? 'var(--color-accent)' : 'var(--color-divider)'}`,
        background: soloFav ? 'var(--color-accent-100)' : 'transparent',
        color: soloFav ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
        fontSize: 14,
        whiteSpace: 'nowrap',
      }}
    >
      <IconoFavorito
        size={17}
        relleno={soloFav}
        color={soloFav ? 'var(--color-accent)' : undefined}
      />
      <span>{soloFav ? `Solo favoritos (${cuantos})` : 'Favoritos'}</span>
    </button>
  )
}


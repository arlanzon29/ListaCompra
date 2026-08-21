import { useState } from 'react'
import { infoUnidad } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { buscaArticulos, lista } from '../estado/consultas'
import { HojaInferior } from './HojaInferior'
import { Aviso, textoError } from './Aviso'
import { IconoCerrar, IconoElegido, IconoMas } from '../iconos'

/**
 * Panel de añadir artículos del catálogo a la lista abierta.
 *
 * Lo que ya está en la lista sale marcado con ✓ sobre tinte y no se duplica.
 * Si la búsqueda no encuentra nada, el propio buscador se convierte en la
 * forma de crear el artículo: es como entra al catálogo casi todo lo nuevo.
 */
export const PanelAnadir = () => {
  const { datos, acciones, nav, q, setQ, setPanelAnadir, setDlg } = useApp()
  const [error, setError] = useState<string | null>(null)

  const listaId = nav.ruta.n === 'lista' ? nav.ruta.id : null
  const actual = listaId ? lista(datos, listaId) : undefined
  if (!listaId || !actual) return null

  const filtrados = buscaArticulos(datos, q)
  const sinResultados = q.trim().length > 0 && filtrados.length === 0

  const cerrar = () => {
    setPanelAnadir(false)
    setQ('')
  }

  /**
   * El panel no crea artículos —de eso se encarga el diálogo `nuevoArt`, que
   * ya enseña sus errores—, pero añadir sí toca el repositorio, y desde que
   * son de verdad puede fallar. Sin esto la fila no se marcaría y no habría
   * ninguna explicación.
   */
  const anadir = async (artId: string) => {
    setError(null)
    try {
      await acciones.anadirArticuloALista(listaId, artId)
    } catch (e) {
      setError(textoError(e))
    }
  }

  return (
    <HojaInferior z={25} alturaMaxima="82%">
      <div
        style={{
          padding: '14px 14px 10px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          borderBottom: '1px solid var(--color-divider)',
        }}
      >
        <input
          className="input"
          style={{ minHeight: 48, fontSize: 16 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar o crear artículo…"
          autoFocus
        />
        <button
          style={{
            width: 44,
            height: 44,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-neutral-700)',
          }}
          onClick={cerrar}
          aria-label="Cerrar"
        >
          <IconoCerrar size={20} />
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px 0' }}>
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtrados.map((a) => {
          const enLista = actual.items.some((x) => x.artId === a.id)
          return (
            <button
              key={a.id}
              onClick={() => {
                if (!enLista) void anadir(a.id)
              }}
              style={{
                width: '100%',
                minHeight: 58,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 14px',
                borderBottom: '1px solid var(--color-divider)',
                textAlign: 'left',
                background: enLista ? 'var(--color-accent-100)' : 'transparent',
              }}
            >
              <span style={{ flex: 1, fontSize: 17 }}>{a.nombre}</span>
              <span className="tag tag-neutral">{infoUnidad(a.unidad).etiqueta}</span>
              <span
                style={{ color: 'var(--color-accent)', display: 'flex', alignItems: 'center' }}
              >
                {enLista ? <IconoElegido size={18} /> : <IconoMas size={18} />}
              </span>
            </button>
          )
        })}

        {sinResultados && (
          <div style={{ padding: '22px 14px' }}>
            <button
              className="btn btn-primary"
              style={{ minHeight: 50, width: '100%' }}
              onClick={() => {
                setPanelAnadir(false)
                setDlg({ tipo: 'nuevoArt', valor: q.trim(), anadirALista: listaId })
              }}
            >
              Crear «{q.trim()}» y añadir
            </button>
          </div>
        )}
      </div>
    </HojaInferior>
  )
}

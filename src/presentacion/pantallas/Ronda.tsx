import { useState } from 'react'
import { infoUnidad, porFechaDesc } from '../../dominio/modelo'
import { apuntadosHoy, variacion } from '../../dominio/servicios/precios'
import { importeDesdeTexto } from '../../aplicacion/casos/precios'
import { useApp } from '../estado/AppProvider'
import { articulo, supermercado } from '../estado/consultas'
import { eur, importeATexto, variacionATexto } from '../formato'

type Props = { superId: string; ids: string[]; origen: string }

/**
 * Entrada masiva de precios: una tienda, muchos artículos.
 *
 * Cada fila se guarda al salir del campo, no con un botón: se está de pie en el
 * pasillo pasando de un lineal a otro, y confirmar cada precio costaría más
 * que escribirlo. Dejar el campo en blanco borra el precio de hoy.
 */
export const Ronda = ({ superId, ids, origen }: Props) => {
  const { casos, datos, acciones, nav, q, setQ } = useApp()
  const [borradores, setBorradores] = useState<Record<string, string>>({})

  const tienda = supermercado(datos, superId)
  const hoy = casos.hoy()
  const filtro = q.trim().toLowerCase()

  const articulos = ids
    .map((id) => articulo(datos, id))
    .filter((a) => !!a)
    .filter((a) => !filtro || a.nombre.toLowerCase().includes(filtro))

  const hechos = apuntadosHoy(datos.precios, superId, ids, hoy)

  const confirma = async (artId: string) => {
    const crudo = borradores[artId]
    if (crudo === undefined) return
    setBorradores((b) => {
      const siguiente = { ...b }
      delete siguiente[artId]
      return siguiente
    })
    await acciones.guardarPrecio(artId, superId, importeDesdeTexto(crudo))
  }

  return (
    <div>
      <div
        style={{
          padding: '10px 14px',
          position: 'sticky',
          top: 0,
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-divider)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--color-neutral-700)', flex: 1 }}>
            Precios de {origen} en {tienda?.nombre ?? ''}
          </span>
          <span
            className="cifra"
            style={{ fontSize: 12, color: 'var(--color-accent-700)' }}
          >
            {hechos} de {ids.length} hoy
          </span>
        </div>
        <input
          className="input"
          style={{ minHeight: 44, fontSize: 16 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar artículos…"
        />
      </div>

      <div
        className="kicker-neutral"
        style={{ display: 'flex', padding: '8px 14px 6px', letterSpacing: '.12em' }}
      >
        <span style={{ flex: 1 }}>Artículo</span>
        <span style={{ width: 78, textAlign: 'right' }}>Antes</span>
        <span style={{ width: 96, textAlign: 'right' }}>Precio hoy</span>
      </div>

      {articulos.map((a) => {
        const anterior = datos.precios
          .filter((p) => p.artId === a.id && p.superId === superId && p.fecha !== hoy)
          .sort(porFechaDesc)[0]
        const deHoy = datos.precios.find(
          (p) => p.artId === a.id && p.superId === superId && p.fecha === hoy,
        )
        const borrador = borradores[a.id]
        const valor =
          borrador !== undefined ? borrador : deHoy ? importeATexto(deHoy.importe) : ''

        let nota = infoUnidad(a.unidad).nombre
        let notaColor = 'var(--color-neutral-600)'
        if (deHoy && anterior) {
          const d = variacion(deHoy.importe, anterior.importe)
          nota = `guardado · ${
            d === 0 ? 'igual que antes' : `${variacionATexto(d)} vs ${eur(anterior.importe)}`
          }`
          notaColor = d > 5 ? 'var(--color-accent-700)' : 'var(--color-neutral-600)'
        } else if (deHoy) {
          nota = 'guardado · primer precio aquí'
          notaColor = 'var(--color-accent-700)'
        }

        return (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid var(--color-divider)',
              minHeight: 62,
              background: deHoy ? 'var(--color-accent-100)' : 'transparent',
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="elipsis" style={{ display: 'block', fontSize: 16 }}>
                {a.nombre}
              </span>
              <span
                className="cifra"
                style={{ display: 'block', fontSize: 11, color: notaColor }}
              >
                {nota}
              </span>
            </span>
            <span
              className="cifra"
              style={{
                width: 66,
                textAlign: 'right',
                fontSize: 13,
                color: 'var(--color-neutral-600)',
              }}
            >
              {anterior ? importeATexto(anterior.importe) : '—'}
            </span>
            <span style={{ width: 104, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                className="input cifra"
                style={{
                  minHeight: 46,
                  fontSize: 17,
                  textAlign: 'right',
                  paddingInline: 8,
                  borderColor: deHoy ? 'var(--color-accent)' : 'var(--color-divider)',
                }}
                inputMode="decimal"
                value={valor}
                aria-label={`Precio de ${a.nombre} hoy`}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.,]/g, '').replace('.', ',')
                  setBorradores((b) => ({ ...b, [a.id]: v }))
                }}
                onBlur={() => void confirma(a.id)}
                placeholder="0,00"
              />
              <span
                style={{ fontSize: 12, color: 'var(--color-neutral-600)', width: 26 }}
              >
                {infoUnidad(a.unidad).etiqueta.replace('€', '')}
              </span>
            </span>
          </div>
        )
      })}

      {articulos.length === 0 && (
        <div
          style={{
            padding: '34px 18px',
            textAlign: 'center',
            fontSize: 14,
            color: 'var(--color-neutral-700)',
          }}
        >
          Ningún artículo con «{q.trim()}».
        </div>
      )}

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
          Cada precio se guarda al salir del campo. Deja en blanco lo que no veas.
        </div>
        <button
          className="btn btn-primary btn-tinte"
          style={{ minHeight: 50 }}
          onClick={nav.atras}
        >
          {hechos
            ? `Listo · ${hechos} ${hechos === 1 ? 'precio guardado' : 'precios guardados'}`
            : 'Salir'}
        </button>
      </div>
    </div>
  )
}

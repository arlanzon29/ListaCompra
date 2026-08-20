import { useState } from 'react'
import { infoUnidad } from '../../dominio/modelo'
import { parseaDictado } from '../../dominio/servicios/dictado'
import { useApp } from '../estado/AppProvider'
import { lista } from '../estado/consultas'
import { Aviso, textoError } from '../componentes/Aviso'

const ETIQUETA = {
  catalogo: { texto: 'del catálogo', clase: 'tag-neutral' },
  ya: { texto: 'ya está', clase: 'tag-neutral' },
} as const

/**
 * Meter muchos artículos de golpe, dictando con el teclado del móvil o pegando
 * una lista. Se enseña la previa antes de insertar: al dictar se cuela ruido, y
 * ver qué se va a añadir evita sorpresas.
 *
 * El dictado solo añade artículos que ya están en el catálogo. Lo que no casa
 * se descarta en silencio y no llega a la previa: la previa es exactamente lo
 * que se va a insertar.
 */
export const Dictar = ({ listaId }: { listaId: string }) => {
  const { datos, acciones, nav } = useApp()
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)

  const actual = lista(datos, listaId)
  const filas = parseaDictado(texto, datos.articulos, actual)
  const aInsertar = filas.filter((f) => f.estado !== 'ya').length

  /**
   * Insertar ya no escribe en el catálogo, pero sí guarda los items, y ese
   * repositorio acabará siendo de verdad. Si falla nos quedamos aquí con el
   * motivo y el texto intacto, en vez de volver atrás como si hubiera entrado.
   */
  const insertar = async () => {
    if (!filas.length) return
    setError(null)
    try {
      await acciones.insertarDictado(listaId, texto)
    } catch (e) {
      setError(textoError(e))
      return
    }
    setTexto('')
    nav.atras()
  }

  return (
    <div
      style={{ padding: '14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-700)' }}>
        Escribe o dicta con el teclado del móvil, un artículo por línea o separados por comas.
        Puedes poner la cantidad delante: «2 leche, pan, 6 huevos».
      </p>

      <textarea
        className="input"
        style={{ minHeight: 150, fontSize: 16, lineHeight: 1.5, resize: 'vertical' }}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setError(null)
        }}
        placeholder={'2 leche\npan\n6 huevos\ntomate'}
      />

      {error && <Aviso>{error}</Aviso>}

      {filas.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kicker-neutral">Se añadirán a «{actual?.nombre ?? ''}»</div>
          {filas.map((f, i) => {
            const et = ETIQUETA[f.estado]
            const nota =
              f.estado === 'ya'
                ? 'ya estaba en la lista, se suma la cantidad'
                : infoUnidad(
                    datos.articulos.find((a) => a.id === f.artId)?.unidad ?? 'ud',
                  ).etiqueta
            return (
              <div
                key={`${f.nombre}:${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  minHeight: 52,
                }}
              >
                <span
                  className="cifra"
                  style={{ width: 34, fontSize: 16, color: 'var(--color-accent-700)' }}
                >
                  ×{f.cant}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16 }}>{f.nombre}</span>
                  <span
                    style={{ display: 'block', fontSize: 11, color: 'var(--color-neutral-600)' }}
                  >
                    {nota}
                  </span>
                </span>
                <span className={`tag ${et.clase}`}>{et.texto}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>
          Aún no hay nada que insertar.
        </div>
      )}

      <button
        className="btn btn-primary btn-tinte"
        style={{ minHeight: 52, fontSize: 16 }}
        onClick={() => void insertar()}
        disabled={filas.length === 0}
      >
        {aInsertar
          ? `Añadir ${aInsertar} ${aInsertar === 1 ? 'artículo' : 'artículos'}`
          : 'Nada nuevo que añadir'}
      </button>
    </div>
  )
}

import { useState } from 'react'
import { infoUnidad } from '../../dominio/modelo'
import { variacion } from '../../dominio/servicios/precios'
import { importeDesdeTexto } from '../../aplicacion/casos/precios'
import { useApp } from '../estado/AppProvider'
import { articulo, supermercado, ultimo } from '../estado/consultas'
import { eur, eurPorUnidad, variacionATexto } from '../formato'
import { HojaInferior } from './HojaInferior'
import { Aviso, textoError } from './Aviso'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ',', '⌫']

/**
 * Apunte individual de precio.
 *
 * Trae teclado propio en lugar del del sistema: en el pasillo se teclea con
 * una mano, y así la cifra grande y el aviso de unidad no quedan tapados. El
 * aviso está por una razón concreta: lo que se apunta es el precio de UN litro,
 * no el del brick.
 */
export const HojaDePrecio = () => {
  const { hoja } = useApp()
  if (!hoja) return null
  return <Contenido key={`${hoja.artId}:${hoja.superId}`} />
}

const Contenido = () => {
  const { casos, datos, acciones, hoja, setHoja } = useApp()
  const [buf, setBuf] = useState('')
  // Si el servidor rechaza, la hoja se queda abierta con la cifra tecleada.
  const [fallo, setFallo] = useState<string | null>(null)

  const art = hoja ? articulo(datos, hoja.artId) : undefined
  const tienda = hoja ? supermercado(datos, hoja.superId) : undefined
  if (!hoja || !art || !tienda) return null

  const u = infoUnidad(art.unidad)
  const anterior = ultimo(datos, art.id, tienda.id)
  const valor = importeDesdeTexto(buf) ?? 0

  /**
   * Teclear un 0 borra el precio de hoy, que es como se deshace un apunte
   * equivocado sin salir del teclado. Hasta ahora el botón se quedaba apagado
   * con el 0 y esta hoja no tenía forma de borrar nada: la regla existía en
   * `guardarPrecio` pero solo se alcanzaba desde la ronda, dejando el campo en
   * blanco.
   *
   * Dos condiciones, y las dos importan. Que haya **algo tecleado**: con el
   * campo vacío el botón debe seguir apagado, o abrir la hoja y darle sin
   * querer borraría el precio. Y que **haya precio de hoy** que borrar: si el
   * último apunte es de otro día, un 0 no borraría nada y el botón estaría
   * prometiendo algo que no pasa.
   */
  const borrando = buf !== '' && valor === 0 && anterior?.fecha === casos.hoy()

  const pulsa = (t: string) => {
    setBuf((b) => {
      if (t === '⌫') return b.slice(0, -1)
      if (t === ',') return b.includes(',') ? b : (b || '0') + ','
      const decimales = b.split(',')[1]
      if (decimales && decimales.length >= 2) return b // máximo dos decimales
      return b + t
    })
  }

  /**
   * Cierra la hoja **solo** si el guardado ha ido bien.
   *
   * Antes esto hacía el `await` sin capturar y cerraba a continuación: si el
   * servidor rechazaba —la tienda borrada por la otra persona, un precio
   * imposible, la conexión caída en el pasillo— la promesa quedaba sin
   * recoger, la hoja se cerraba igual y lo tecleado se perdía como si se
   * hubiera guardado.
   */
  const guardar = async () => {
    if (!valor && !borrando) return
    setFallo(null)
    try {
      await acciones.guardarPrecio(art.id, tienda.id, valor)
    } catch (e) {
      setFallo(textoError(e))
      return
    }
    setHoja(null)
  }

  const referencia = (() => {
    if (anterior && valor) {
      const d = variacion(valor, anterior.importe)
      return {
        texto: `Antes ${eur(anterior.importe)} · ${variacionATexto(d)}`,
        color: d > 5 ? 'var(--color-accent-700)' : 'var(--color-neutral-600)',
      }
    }
    if (anterior) {
      return {
        texto: `Último apuntado aquí: ${eurPorUnidad(anterior.importe, art.unidad)}`,
        color: 'var(--color-neutral-600)',
      }
    }
    return {
      texto: 'Primer precio de este artículo aquí',
      color: 'var(--color-neutral-600)',
    }
  })()

  return (
    <HojaInferior z={20}>
      <div
        style={{
          padding: '0 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            position: 'sticky',
            top: 0,
            background: 'var(--color-bg)',
            padding: '12px 0 8px',
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kicker">{tienda.nombre}</div>
            <div
              style={{ fontFamily: 'var(--font-heading)', fontSize: 25, fontWeight: 600 }}
            >
              {art.nombre}
            </div>
          </div>
          <button
            style={{
              width: 44,
              height: 44,
              flex: 'none',
              fontSize: 20,
              color: 'var(--color-neutral-700)',
            }}
            onClick={() => setHoja(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div
          style={{
            border: '1px solid var(--color-accent)',
            background: 'var(--color-accent-100)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 21,
              fontWeight: 600,
              color: 'var(--color-accent-800)',
            }}
          >
            Euros por {u.nombre.toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-accent-800)', opacity: 0.85 }}>
            {u.aviso}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 8,
            padding: '2px 0',
          }}
        >
          <span
            className="cifra"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 48,
              lineHeight: 1,
              color: buf ? 'var(--color-text)' : 'var(--color-neutral-400)',
            }}
          >
            {buf || '0,00'}
          </span>
          <span
            style={{
              fontSize: 20,
              color: 'var(--color-neutral-600)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {u.etiqueta}
          </span>
        </div>

        <div
          className="cifra"
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: referencia.color,
            minHeight: 18,
          }}
        >
          {referencia.texto}
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}
          role="group"
          aria-label="Teclado numérico"
        >
          {TECLAS.map((t) => (
            <button
              key={t}
              className="cifra"
              onClick={() => pulsa(t)}
              style={{
                minHeight: 50,
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                background: 'var(--color-neutral-100)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {fallo && <Aviso>{fallo}</Aviso>}

        <button
          className="btn btn-primary btn-tinte"
          style={{
            minHeight: 56,
            fontSize: 17,
            position: 'sticky',
            bottom: 0,
            zIndex: 3,
            boxShadow: '0 -8px 12px var(--color-bg)',
          }}
          onClick={() => void guardar()}
          disabled={!valor && !borrando}
        >
          {borrando
            ? 'Borrar el precio de hoy'
            : valor
              ? `Guardar ${eur(valor)} por ${u.nombre}`
              : 'Guardar'}
        </button>
      </div>
    </HojaInferior>
  )
}

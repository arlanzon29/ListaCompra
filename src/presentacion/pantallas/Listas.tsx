import { useState } from 'react'
import { pendientes } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { listasAbiertas, listasCerradas } from '../estado/consultas'
import { Aviso, textoError } from '../componentes/Aviso'

export const Listas = () => {
  const { datos, acciones, nav, setDlg } = useApp()
  const [verCerradas, setVerCerradas] = useState(false)
  // Qué lista ha fallado al reabrirse. El aviso sale dentro de su propia fila,
  // no arriba de la pantalla, para que se vea sin buscarlo.
  const [fallo, setFallo] = useState<{ id: string; texto: string } | null>(null)

  const reabrir = (id: string) => {
    setFallo(null)
    void acciones.reabrirLista(id).catch((e: unknown) => setFallo({ id, texto: textoError(e) }))
  }

  const abiertas = listasAbiertas(datos)
  const cerradas = listasCerradas(datos)

  return (
    <div
      style={{ padding: '14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {abiertas.map((l) => {
        const pend = pendientes(l).length
        return (
          <button
            key={l.id}
            onClick={() => nav.ir({ n: 'lista', id: l.id })}
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 14px',
              border: '1px solid var(--color-divider)',
              borderRadius: 'var(--radius-md)',
              minHeight: 72,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 19 }}
              >
                {l.nombre}
              </div>
              <div
                className="cifra"
                style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}
              >
                {l.items.length
                  ? `${l.items.length - pend} de ${l.items.length} cogidos`
                  : 'Sin artículos'}
              </div>
            </div>
            <div
              className="cifra"
              style={{
                width: 46,
                height: 46,
                flex: 'none',
                borderRadius: '50%',
                border: '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--color-accent)',
              }}
            >
              {l.items.length ? pend : '—'}
            </div>
            <span style={{ color: 'var(--color-neutral-500)', fontSize: 18 }}>›</span>
          </button>
        )
      })}

      <div style={{ height: 1, background: 'var(--color-divider)', margin: '4px 0' }} />

      <button
        className="btn btn-primary btn-tinte"
        style={{ minHeight: 52, fontSize: 16 }}
        onClick={() => setDlg({ tipo: 'nuevaLista' })}
      >
        + Lista nueva
      </button>

      {cerradas.length > 0 && (
        <button
          onClick={() => setVerCerradas((v) => !v)}
          style={{
            minHeight: 46,
            fontSize: 13,
            color: 'var(--color-accent-700)',
            textAlign: 'left',
            padding: '0 2px',
          }}
        >
          {verCerradas ? 'Ocultar' : 'Ver'} listas cerradas ({cerradas.length})
        </button>
      )}

      {verCerradas && cerradas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cerradas.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px dashed var(--color-divider)',
                borderRadius: 'var(--radius-md)',
                minHeight: 64,
                paddingLeft: 14,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => nav.ir({ n: 'lista', id: l.id })}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '10px 0' }}
              >
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-heading)',
                    fontSize: 18,
                    color: 'var(--color-neutral-700)',
                  }}
                >
                  {l.nombre}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: 'var(--color-neutral-600)',
                  }}
                >
                  {l.items.length ? `cerrada · ${l.items.length} artículos` : 'cerrada · vacía'}
                </span>
              </button>
              <button
                className="btn btn-secondary"
                style={{ minHeight: 44, marginRight: 10, fontSize: 13 }}
                onClick={() => reabrir(l.id)}
              >
                Reabrir
              </button>
              {fallo?.id === l.id && (
                <div style={{ flexBasis: '100%', padding: '0 10px 12px' }}>
                  <Aviso>{fallo.texto}</Aviso>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

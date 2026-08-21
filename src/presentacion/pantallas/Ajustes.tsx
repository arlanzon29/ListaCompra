import { useEffect, useState } from 'react'
import { useApp } from '../estado/AppProvider'
import type { Simulacion } from '../estado/rutas'
import { Miniatura } from '../componentes/Miniatura'
import { Aviso, textoError } from '../componentes/Aviso'
import { IconoBorrar, IconoMas } from '../iconos'

export const Ajustes = () => {
  const { casos, datos, acciones, sesion, salir, tema, imagenes, sim, setSim, setDlg } =
    useApp()
  const [nueva, setNueva] = useState('')
  const [error, setError] = useState<string | null>(null)
  const hoy = casos.hoy()

  // Cualquier cambio en la lista de tiendas —renombrar, borrar, o el alta de
  // la otra persona— deja obsoleto el aviso del alta anterior.
  useEffect(() => setError(null), [datos.supermercados])

  const anadirTienda = async () => {
    const n = nueva.trim()
    if (!n) return
    setError(null)
    try {
      await acciones.crearSupermercado(n)
      // El campo se vacía solo si ha entrado: si falla, lo escrito sigue ahí
      // para corregirlo.
      setNueva('')
    } catch (e) {
      setError(textoError(e))
    }
  }

  return (
    <div
      style={{ padding: '14px 14px 30px', display: 'flex', flexDirection: 'column', gap: 22 }}
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="kicker-neutral">Supermercados</div>
        {datos.supermercados.map((s) => {
          const n = datos.precios.filter((p) => p.superId === s.id && p.fecha === hoy).length
          return (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--color-divider)',
                minHeight: 56,
              }}
            >
              <button
                onClick={() => imagenes.pideImagen('logo', s.id, false)}
                disabled={imagenes.ocupado === s.id}
                aria-label={`Poner logo de ${s.nombre}`}
                style={{ flex: 'none', display: 'flex' }}
              >
                <Miniatura src={imagenes.logo(s.id)} nombre={s.nombre} tamano={40} redonda />
              </button>
              <span style={{ flex: 1, fontSize: 17 }}>{s.nombre}</span>
              <span
                className="cifra"
                style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}
              >
                {n ? `${n} hoy` : 'sin datos de hoy'}
              </span>
              <button
                onClick={() => setDlg({ tipo: 'renTienda', id: s.id })}
                aria-label={`Renombrar ${s.nombre}`}
                style={{ width: 44, height: 44, color: 'var(--color-accent)', fontSize: 15 }}
              >
                Ed
              </button>
              <button
                onClick={() => setDlg({ tipo: 'borrarTienda', id: s.id })}
                aria-label={`Borrar ${s.nombre}`}
                style={{
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)',
                }}
              >
                <IconoBorrar size={18} />
              </button>
            </div>
          )
        })}
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <input
            className="input"
            style={{ minHeight: 48, fontSize: 16 }}
            value={nueva}
            onChange={(e) => {
              setNueva(e.target.value)
              setError(null)
            }}
            placeholder="Añadir supermercado"
            aria-label="Nombre del supermercado nuevo"
          />
          <button
            className="btn btn-primary"
            style={{ minHeight: 48, paddingInline: 18 }}
            onClick={() => void anadirTienda()}
            aria-label="Añadir supermercado"
          >
            <IconoMas size={20} />
          </button>
        </div>
        {error && <Aviso>{error}</Aviso>}
        {/* El logo se sube a Storage, así que también puede fallar. */}
        {imagenes.error && <Aviso>{imagenes.error}</Aviso>}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="kicker-neutral">Apariencia</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 52 }}>
          <span style={{ flex: 1, fontSize: 16 }}>Tema</span>
          <div className="seg">
            <label className="seg-opt" style={{ minHeight: 44, paddingInline: 16 }}>
              <input
                type="radio"
                name="tema"
                checked={tema.tema === 'light'}
                onChange={() => tema.setTema('light')}
              />
              Claro
            </label>
            <label className="seg-opt" style={{ minHeight: 44, paddingInline: 16 }}>
              <input
                type="radio"
                name="tema"
                checked={tema.tema === 'dark'}
                onChange={() => tema.setTema('dark')}
              />
              Oscuro
            </label>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="kicker-neutral">Demostración de estados</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>
          Fuerza el estado del detalle de lista para revisar el diseño.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              [null, 'Normal'],
              ['loading', 'Cargando'],
              ['error', 'Error'],
            ] as Array<[Simulacion, string]>
          ).map(([valor, etiqueta]) => (
            <button
              key={etiqueta}
              className="btn btn-secondary"
              style={{
                minHeight: 46,
                borderColor: sim === valor ? 'var(--color-accent)' : undefined,
              }}
              onClick={() => setSim(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="kicker-neutral">Cuenta</div>
        <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
          {sesion?.email} · datos compartidos con 1 persona más
        </div>
        <button
          className="btn btn-secondary"
          style={{ minHeight: 48 }}
          onClick={() => void salir()}
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useApp } from '../estado/AppProvider'

/**
 * Entrada a la aplicación. No hay registro: las dos cuentas se crean a mano,
 * que es todo lo que necesita una casa.
 */
export const Login = () => {
  const { entrar } = useApp()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    try {
      await entrar(email, pass)
    } catch (e) {
      // Con autenticación real no todo fallo es la contraseña: puede ser la red.
      setError(e instanceof Error ? e.message : 'Correo o contraseña incorrectos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void enviar(e)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 26px',
        gap: 26,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
          Uso doméstico
        </div>
        <h1 style={{ fontSize: 40, margin: 0, fontWeight: 400 }}>Compra</h1>
        <div style={{ height: 1, background: 'var(--color-divider)', margin: '6px 0 2px' }} />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-700)' }}>
          Lista compartida y precios por unidad de medida.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            className="input"
            /* 16px es lo mínimo para que iOS no haga zoom al enfocar. */
            style={{ minHeight: 48, fontSize: 16 }}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            placeholder="tu@correo.es"
          />
        </div>
        <div className="field">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            className="input"
            style={{ minHeight: 48, fontSize: 16 }}
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value)
              setError(null)
            }}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            role="alert"
            style={{
              fontSize: 13,
              padding: '10px 12px',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-100)',
              color: 'var(--color-accent-800)',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-tinte"
          style={{ minHeight: 52, fontSize: 16 }}
          disabled={enviando}
        >
          Entrar
        </button>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            textAlign: 'center',
            color: 'var(--color-neutral-600)',
          }}
        >
          Las cuentas se crean a mano. No hay registro.
        </p>
      </div>
    </form>
  )
}

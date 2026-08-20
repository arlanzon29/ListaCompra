/**
 * Mensaje de error de una acción, con la voz del sistema visual: filete de oro
 * y fondo de acento claro, nunca rojo de alarma.
 *
 * Existe desde que los repositorios son de verdad: en memoria ninguna
 * operación fallaba, y las pantallas se escribieron sin sitio donde contarlo.
 */
export const Aviso = ({ children }: { children: string }) => (
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
    {children}
  </div>
)

/**
 * El texto de un fallo, sea lo que sea lo que se haya lanzado.
 *
 * Los repositorios ya traducen los códigos de Postgres a castellano, pero si
 * la petición no llega a salir —cobertura de sótano en el supermercado— el
 * error lo lanza el navegador y viene en inglés y con nombre de clase:
 * «TypeError: Failed to fetch». Eso no se enseña.
 */
export const textoError = (e: unknown): string => {
  if (!(e instanceof Error)) return 'No se ha podido completar la operación.'
  if (/failed to fetch|networkerror|load failed/i.test(e.message)) {
    return 'Sin conexión con el servidor. Inténtalo otra vez.'
  }
  return e.message
}

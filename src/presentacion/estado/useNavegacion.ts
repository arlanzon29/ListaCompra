import { useCallback, useMemo, useState } from 'react'
import type { Ruta, Pestana } from './rutas'

/**
 * Navegación con pila, igual que en el prototipo: `ir` apila, `atras`
 * desapila y cambiar de pestaña vacía la pila. El buscador se limpia en cada
 * transición porque pertenece a la pantalla, no a la sesión.
 */
export const useNavegacion = (onCambio?: () => void) => {
  const [ruta, setRuta] = useState<Ruta>({ n: 'inicio' })
  const [pila, setPila] = useState<Ruta[]>([])

  const ir = useCallback(
    (destino: Ruta) => {
      setPila((p) => p.concat([ruta]))
      setRuta(destino)
      onCambio?.()
    },
    [ruta, onCambio],
  )

  /** Como `ir`, pero fijando la pila: se usa al saltar desde Inicio. */
  const irDesde = useCallback(
    (destino: Ruta, base: Ruta[]) => {
      setPila(base)
      setRuta(destino)
      onCambio?.()
    },
    [onCambio],
  )

  const atras = useCallback(() => {
    setRuta(pila.length ? pila[pila.length - 1] : { n: 'inicio' })
    setPila((p) => p.slice(0, -1))
    onCambio?.()
  }, [pila, onCambio])

  const pestana = useCallback(
    (p: Pestana) => {
      setRuta({ n: p })
      setPila([])
      onCambio?.()
    },
    [onCambio],
  )

  const reemplaza = useCallback((destino: Ruta) => setRuta(destino), [])

  return useMemo(
    () => ({ ruta, pila, ir, irDesde, atras, pestana, reemplaza }),
    [ruta, pila, ir, irDesde, atras, pestana, reemplaza],
  )
}

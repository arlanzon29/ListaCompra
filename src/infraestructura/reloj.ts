import type { Reloj } from '../dominio/puertos'

/** El reloj real del dispositivo, en hora local: «hoy» es el día del usuario. */
export const relojDelSistema = (): Reloj => ({
  hoy(): string {
    const d = new Date()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mes}-${dia}`
  },
})

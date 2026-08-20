/**
 * Los tres sellos que `vite.config.ts` incrusta al compilar (`define`).
 *
 * No son variables de entorno ni se leen en tiempo de ejecución: Vite los
 * sustituye por su literal dentro del paquete, así que en el navegador ya son
 * cadenas. Por eso hay que declararlos aquí para TypeScript.
 */
declare const __VERSION__: string
declare const __COMPILADA__: string
declare const __ENTORNO__: 'compilada' | 'dev'

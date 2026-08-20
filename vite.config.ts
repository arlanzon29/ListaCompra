import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * HTTPS en la red local.
 *
 * Android solo instala una web como aplicación de verdad —sin barra de
 * direcciones— si la sirve un origen seguro. `http://192.168.1.32:5173` no lo
 * es, así que el servidor de desarrollo necesita certificado.
 *
 * Los certificados los genera `mkcert` en `certs/` y NO se versionan: son de
 * esta máquina. Si no están, el servidor arranca en HTTP como siempre, para
 * que el proyecto siga funcionando recién clonado.
 *
 *   mkcert -install
 *   mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem \
 *          localhost 127.0.0.1 192.168.1.32
 */
const ruta = (f: string) => fileURLToPath(new URL(`./certs/${f}`, import.meta.url))

const clave = ruta('dev-key.pem')
const certificado = ruta('dev-cert.pem')
const hayCertificado = existsSync(clave) && existsSync(certificado)

/**
 * La compilación va a GitHub Pages, que sirve el proyecto en un subdirectorio:
 * `https://arlanzon29.github.io/ListaCompra/`. Sin `base`, el HTML pediría los
 * ficheros en la raíz del dominio y saldría una página en blanco.
 *
 * Solo se aplica al compilar. En desarrollo se queda en `/`, para que seguir
 * abriéndola desde el móvil en la red local no cambie de dirección.
 *
 * `isPreview` no sobra: `vite preview` sirve lo ya compilado, pero llega aquí
 * con `command === 'serve'`. Sin comprobarlo, la comprobación previa al
 * despliegue serviría en la raíz una compilación que pide todo desde
 * `/ListaCompra/`, y saldría una página en blanco que no es un fallo real.
 */
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/ListaCompra/' : '/',
  plugins: [react()],
  server: {
    host: true,
    ...(hayCertificado
      ? { https: { key: readFileSync(clave), cert: readFileSync(certificado) } }
      : {}),
  },
}))

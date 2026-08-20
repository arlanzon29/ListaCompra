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

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    ...(hayCertificado
      ? { https: { key: readFileSync(clave), cert: readFileSync(certificado) } }
      : {}),
  },
})

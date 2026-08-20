import { useApp } from './estado/AppProvider'
import { lista, articulo, supermercado } from './estado/consultas'
import type { Ruta } from './estado/rutas'
import { Cabecera } from './componentes/Cabecera'
import { BarraPestanas } from './componentes/BarraPestanas'
import { BarraAnadir } from './componentes/BarraAnadir'
import { DialogoApp } from './componentes/DialogoApp'
import { HojaDePrecio } from './componentes/HojaDePrecio'
import { PanelAnadir } from './componentes/PanelAnadir'
import { Login } from './pantallas/Login'
import { Inicio } from './pantallas/Inicio'
import { Listas } from './pantallas/Listas'
import { DetalleLista } from './pantallas/DetalleLista'
import { Dictar } from './pantallas/Dictar'
import { Catalogo } from './pantallas/Catalogo'
import { Ficha } from './pantallas/Ficha'
import { Ronda } from './pantallas/Ronda'
import { Ajustes } from './pantallas/Ajustes'
import type { Instantanea } from '../aplicacion'

/**
 * Marco de la aplicación: el móvil de 440px centrado, con cabecera fija,
 * contenido con scroll propio y la barra de pestañas abajo. Las capas que
 * flotan (hoja de precio, diálogo, panel de añadir) se posicionan contra este
 * marco, no contra la ventana.
 */
export const App = () => {
  const { sesion, comprobandoSesion, nav, datos, imagenes, panelAnadir } = useApp()

  return (
    <div
      className="marco-fondo"
      style={{
        display: 'flex',
        justifyContent: 'center',
        background: 'var(--color-neutral-300)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        className="marco-app"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          borderInline: '1px solid var(--color-divider)',
        }}
      >
        {/* Un único input de fichero para fotos de producto y logos de tienda. */}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={imagenes.inputRef}
          onChange={imagenes.recibeImagen}
        />

        {comprobandoSesion ? null : !sesion ? (
          <Login />
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Cabecera {...tituloDe(nav.ruta, datos)} />
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <Pantalla ruta={nav.ruta} />
              </div>
              <BarraPestanas />
            </div>
            <BarraAnadir />
            {panelAnadir && <PanelAnadir />}
            <HojaDePrecio />
            <DialogoApp />
          </>
        )}
      </div>
    </div>
  )
}

const Pantalla = ({ ruta }: { ruta: Ruta }) => {
  switch (ruta.n) {
    case 'inicio':
      return <Inicio />
    case 'listas':
      return <Listas />
    case 'lista':
      return <DetalleLista listaId={ruta.id} />
    case 'dictar':
      return <Dictar listaId={ruta.id} />
    case 'articulos':
      return <Catalogo />
    case 'ficha':
      return <Ficha artId={ruta.id} />
    case 'ronda':
      return <Ronda superId={ruta.superId} ids={ruta.ids} origen={ruta.origen} />
    case 'ajustes':
      return <Ajustes />
  }
}

const tituloDe = (ruta: Ruta, datos: Instantanea): { kicker: string; titulo: string } => {
  switch (ruta.n) {
    case 'inicio':
      return { kicker: 'Casa', titulo: 'Compra' }
    case 'listas':
      return { kicker: 'Compra', titulo: 'Listas' }
    case 'articulos':
      return { kicker: 'Catálogo', titulo: 'Artículos' }
    case 'ajustes':
      return { kicker: 'Casa', titulo: 'Ajustes' }
    case 'lista':
      return { kicker: 'Lista', titulo: lista(datos, ruta.id)?.nombre ?? '' }
    case 'ficha':
      return { kicker: 'Artículo', titulo: articulo(datos, ruta.id)?.nombre ?? '' }
    case 'dictar':
      return { kicker: 'De golpe', titulo: 'Dictar o pegar' }
    case 'ronda':
      return {
        kicker: 'Apuntando precios en',
        titulo: supermercado(datos, ruta.superId)?.nombre ?? '',
      }
  }
}

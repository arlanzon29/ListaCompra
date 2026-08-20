import type { Unidad } from '../../dominio/modelo'

const OPCIONES: Array<{ valor: Unidad; etiqueta: string }> = [
  { valor: 'l', etiqueta: 'litro' },
  { valor: 'kg', etiqueta: 'kilo' },
  { valor: 'ud', etiqueta: 'unidad' },
]

/**
 * Unidad de medida del artículo. Es fija: se elige al crearlo y solo se cambia
 * editándolo, porque cambiarla invalida la comparación de sus precios.
 */
export const SelectorUnidad = ({
  valor,
  onCambio,
}: {
  valor: Unidad
  onCambio: (u: Unidad) => void
}) => (
  <div className="seg" style={{ width: '100%' }}>
    {OPCIONES.map((o) => (
      <label
        key={o.valor}
        className="seg-opt"
        style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
      >
        <input
          type="radio"
          name="unidad"
          checked={valor === o.valor}
          onChange={() => onCambio(o.valor)}
        />
        {o.etiqueta}
      </label>
    ))}
  </div>
)

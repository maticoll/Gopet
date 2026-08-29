import {
  TRAMOS,
  calcularTotales,
  resolverItems,
  mensajeDePedido,
  type ItemCarrito,
} from '@/lib/carrito'
import { catalogo } from '@/lib/catalogo'

/** Arma items resueltos a partir de pares [id, varianteIdx, cantidad]. */
const armar = (...items: [string, number, number][]) =>
  resolverItems(items.map(([productoId, varianteIdx, cantidad]) => ({ productoId, varianteIdx, cantidad })))

describe('resolverItems', () => {
  it('cruza el item con el producto y la variante del catálogo', () => {
    const [item] = armar(['lg-a', 0, 1])
    expect(item.producto.marca).toBe('Lager')
    expect(item.variante.etiqueta).toBe('22+3 kg')
    expect(item.importe).toBe(1940)
  })

  it('multiplica el importe por la cantidad', () => {
    expect(armar(['lg-a', 0, 3])[0].importe).toBe(5820)
  })

  it('descarta un producto que ya no está en el catálogo', () => {
    expect(armar(['producto-borrado', 0, 1])).toHaveLength(0)
  })

  it('descarta una variante que dejó de existir', () => {
    expect(armar(['lg-a', 99, 1])).toHaveLength(0)
  })

  it('descarta cantidades inválidas en vez de romper', () => {
    const rotos: ItemCarrito[] = [
      { productoId: 'lg-a', varianteIdx: 0, cantidad: 0 },
      { productoId: 'lg-a', varianteIdx: 0, cantidad: -2 },
      { productoId: 'lg-a', varianteIdx: 0, cantidad: NaN },
    ]
    expect(resolverItems(rotos)).toHaveLength(0)
  })
})

describe('calcularTotales — escalones de descuento', () => {
  it('sin nada en el carrito no hay descuento', () => {
    const t = calcularTotales([])
    expect(t.subtotal).toBe(0)
    expect(t.porcentaje).toBe(0)
    expect(t.total).toBe(0)
  })

  it('abajo de $6.000 no hay descuento', () => {
    // Lager Adulto 22+3 kg × 3 = $5.820
    const t = calcularTotales(armar(['lg-a', 0, 3]))
    expect(t.subtotal).toBe(5820)
    expect(t.porcentaje).toBe(0)
    expect(t.descuento).toBe(0)
    expect(t.total).toBe(5820)
  })

  it('justo en $6.000 ya hace el 10%', () => {
    // Lager Adulto 10 kg ($1.020) × 5 = $5.100 + Maxine Cachorros 21 kg... armamos $6.000 exacto:
    // Lager Adulto 22+3 kg ($1.940) × 3 = $5.820 + no llega. Usamos 10 kg de Lager Senior:
    // $1.940 × 3 = $5.820 + $1.020 = $6.840. Para el borde exacto usamos un item sintético.
    const t = calcularTotales([
      { productoId: 'lg-a', varianteIdx: 0, cantidad: 1, producto: catalogo[0], variante: { etiqueta: 'test', precio: 6000 }, importe: 6000 },
    ])
    expect(t.subtotal).toBe(6000)
    expect(t.porcentaje).toBe(10)
    expect(t.descuento).toBe(600)
    expect(t.total).toBe(5400)
  })

  it('un peso menos que $6.000 todavía no descuenta', () => {
    const t = calcularTotales([
      { productoId: 'x', varianteIdx: 0, cantidad: 1, producto: catalogo[0], variante: { etiqueta: 'test', precio: 5999 }, importe: 5999 },
    ])
    expect(t.porcentaje).toBe(0)
  })

  it('arriba de $6.000 hace 10%', () => {
    // Lager Adulto 22+3 kg × 4 = $7.760
    const t = calcularTotales(armar(['lg-a', 0, 4]))
    expect(t.subtotal).toBe(7760)
    expect(t.porcentaje).toBe(10)
    expect(t.descuento).toBe(776)
    expect(t.total).toBe(6984)
  })

  it('el 10% es el techo: por más que sume, no sube', () => {
    // Maxine Gatos 21 kg ($3.860) × 4 = $15.440
    const t = calcularTotales(armar(['mx-g', 0, 4]))
    expect(t.subtotal).toBe(15440)
    expect(t.porcentaje).toBe(10)
    expect(t.descuento).toBe(1544)
    expect(t.total).toBe(13896)
  })

  it('el descuento queda redondeado a peso entero', () => {
    // $6.845 × 10% = $684,5 → $685 (redondeo normal, no fracciones de peso)
    const t = calcularTotales([
      { productoId: 'x', varianteIdx: 0, cantidad: 1, producto: catalogo[0], variante: { etiqueta: 'test', precio: 6845 }, importe: 6845 },
    ])
    expect(t.descuento).toBe(685)
    expect(Number.isInteger(t.total)).toBe(true)
  })
})

describe('calcularTotales — datos para la barra de progreso', () => {
  it('con el carrito vacío apunta al primer escalón', () => {
    const t = calcularTotales([])
    expect(t.tramoActual).toBeNull()
    expect(t.tramoSiguiente).toEqual(TRAMOS[0])
    expect(t.falta).toBe(6000)
    expect(t.progreso).toBe(0)
  })

  it('avisa cuánto falta para el próximo escalón', () => {
    // $5.820 → faltan $180 para el 10%
    const t = calcularTotales(armar(['lg-a', 0, 3]))
    expect(t.falta).toBe(180)
    expect(t.tramoSiguiente?.porcentaje).toBe(10)
  })

  it('pasado el escalón no queda ninguno más por alcanzar', () => {
    const t = calcularTotales(armar(['lg-a', 0, 4])) // $7.760
    expect(t.tramoActual?.porcentaje).toBe(10)
    expect(t.tramoSiguiente).toBeNull()
    expect(t.falta).toBe(0)
  })

  it('en el escalón máximo no falta nada más', () => {
    const t = calcularTotales(armar(['mx-g', 0, 4])) // $15.440
    expect(t.tramoSiguiente).toBeNull()
    expect(t.falta).toBe(0)
  })

  it('el progreso se topea en 100 y nunca se pasa', () => {
    expect(calcularTotales(armar(['mx-g', 0, 10])).progreso).toBe(100)
  })

  it('cuenta las unidades sumando cantidades, no líneas', () => {
    expect(calcularTotales(armar(['lg-a', 0, 3], ['mx-g', 1, 2])).unidades).toBe(5)
  })
})

describe('mensajeDePedido', () => {
  it('lista cada línea con cantidad, producto, tamaño e importe', () => {
    const items = armar(['lg-a', 0, 2])
    const msg = mensajeDePedido(items, calcularTotales(items))
    expect(msg).toContain('• 2× Lager Adultos 22+3 kg — $3.880')
  })

  it('cuando hay descuento lo muestra como línea aparte', () => {
    const items = armar(['lg-a', 0, 4]) // $7.760 → 10%
    const msg = mensajeDePedido(items, calcularTotales(items))
    expect(msg).toContain('Subtotal: $7.760')
    expect(msg).toContain('Descuento 10%: -$776')
    expect(msg).toContain('Total: $6.984')
  })

  it('sin descuento no menciona ninguna línea de descuento', () => {
    const items = armar(['lg-a', 0, 1])
    const msg = mensajeDePedido(items, calcularTotales(items))
    expect(msg).not.toContain('Descuento')
    expect(msg).toContain('Total: $1.940')
  })
})

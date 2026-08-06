import { repartirPrecioPromo, totalVentas } from '@/lib/promos'

describe('repartirPrecioPromo', () => {
  // Promo real: Lager Adulto 22+3 kg ($1850) + Lager Adulto 10 kg ($1020) = $2450
  const promoLager = [
    { producto: 'Lager Adulto 22+3 kg', tamañoBolsaKg: 25, precio: 1850, cantidad: 1 },
    { producto: 'Lager Adulto 10 kg', tamañoBolsaKg: 10, precio: 1020, cantidad: 1 },
  ]

  it('pone el total en la bolsa más grande y 0 en el resto', () => {
    const r = repartirPrecioPromo(promoLager, 2450)
    expect(r[0].precio).toBe(2450)
    expect(r[1].precio).toBe(0)
  })

  it('el total facturado es exactamente el precio de la promo', () => {
    expect(totalVentas(repartirPrecioPromo(promoLager, 2450))).toBe(2450)
  })

  it('no pierde el descuento: nunca factura la suma de los precios de lista', () => {
    const sumaLista = totalVentas(promoLager) // 2870
    expect(totalVentas(repartirPrecioPromo(promoLager, 2450))).toBeLessThan(sumaLista)
  })

  it('encuentra la bolsa más grande aunque venga en otro orden', () => {
    const invertida = [promoLager[1], promoLager[0]]
    const r = repartirPrecioPromo(invertida, 2450)
    expect(r[0].precio).toBe(0)
    expect(r[1].precio).toBe(2450)
    expect(r[1].tamañoBolsaKg).toBe(25)
  })

  it('conserva el resto de los campos de cada venta', () => {
    const r = repartirPrecioPromo(promoLager, 2450)
    expect(r[0].producto).toBe('Lager Adulto 22+3 kg')
    expect(r[1].producto).toBe('Lager Adulto 10 kg')
    expect(r).toHaveLength(2)
  })

  it('no rompe con un array vacío', () => {
    expect(repartirPrecioPromo([], 2450)).toEqual([])
  })

  it('funciona con promos de más de dos bolsas', () => {
    const tres = [
      { tamañoBolsaKg: 10, precio: 1020 },
      { tamañoBolsaKg: 25, precio: 1850 },
      { tamañoBolsaKg: 7.5, precio: 990 },
    ]
    const r = repartirPrecioPromo(tres, 3200)
    expect(r.map(v => v.precio)).toEqual([0, 3200, 0])
    expect(totalVentas(r)).toBe(3200)
  })
})

describe('totalVentas', () => {
  it('multiplica precio por cantidad', () => {
    expect(totalVentas([{ precio: 1850, cantidad: 2 }, { precio: 0, cantidad: 2 }])).toBe(3700)
  })

  it('asume cantidad 1 si no viene', () => {
    expect(totalVentas([{ precio: 1850 }])).toBe(1850)
  })

  it('trata precio null como 0', () => {
    expect(totalVentas([{ precio: null }, { precio: 1020 }])).toBe(1020)
  })
})

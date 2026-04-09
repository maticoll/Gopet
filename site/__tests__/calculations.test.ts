import {
  calcularFechaFinPerro,
  calcularFechaFinGato,
  calcularGramosPorDia,
  diasHastaFin,
} from '@/lib/calculations'

describe('calcularGramosPorDia', () => {
  it('multiplica gramos por comida por veces al día', () => {
    expect(calcularGramosPorDia(150, 2)).toBe(300)
    expect(calcularGramosPorDia(200, 3)).toBe(600)
    expect(calcularGramosPorDia(100, 1)).toBe(100)
  })
})

describe('calcularFechaFinPerro', () => {
  it('calcula correctamente para bolsa 15kg, 300g/día', () => {
    const fechaVenta = new Date('2026-01-01')
    const resultado = calcularFechaFinPerro(fechaVenta, 15, 150, 2)
    // 15000g / 300g/día = 50 días → 2026-02-20
    expect(resultado.toISOString().split('T')[0]).toBe('2026-02-20')
  })

  it('redondea hacia abajo los días', () => {
    const fechaVenta = new Date('2026-01-01')
    // 15000 / 350 = 42.857 → 42 días → 2026-02-12
    const resultado = calcularFechaFinPerro(fechaVenta, 15, 175, 2)
    expect(resultado.toISOString().split('T')[0]).toBe('2026-02-12')
  })
})

describe('calcularFechaFinGato', () => {
  it('suma el intervalo a la fecha de venta', () => {
    const fechaVenta = new Date('2026-01-01')
    const resultado = calcularFechaFinGato(fechaVenta, 30)
    expect(resultado.toISOString().split('T')[0]).toBe('2026-01-31')
  })
})

describe('diasHastaFin', () => {
  it('retorna null si fecha es null', () => {
    expect(diasHastaFin(null)).toBeNull()
  })

  it('retorna número positivo si la fecha es futura', () => {
    const futuro = new Date()
    futuro.setDate(futuro.getDate() + 5)
    expect(diasHastaFin(futuro)).toBe(5)
  })

  it('retorna número negativo si la fecha ya pasó', () => {
    const pasado = new Date()
    pasado.setDate(pasado.getDate() - 3)
    expect(diasHastaFin(pasado)).toBe(-3)
  })
})

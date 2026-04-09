import { parsearMensajeVenta, type VentaData } from '@/lib/claude-parser'

jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn()
  class MockAnthropic {
    messages = { create: mockCreate }
  }
  ;(MockAnthropic as any)._mockCreate = mockCreate
  return { __esModule: true, default: MockAnthropic }
})

function getMockCreate() {
  const MockAnthropic = require('@anthropic-ai/sdk').default
  return (MockAnthropic as any)._mockCreate as jest.Mock
}

const successResponse = {
  content: [{ type: 'text', text: JSON.stringify({
    tipo: 'venta',
    ok: true,
    data: {
      clienteNombre: 'Ana García',
      mascotaNombre: 'Luna',
      especie: 'perro',
      tipoPerro: 'adulto',
      pesoKg: 8,
      producto: 'Maxine Adulto 21+4 kg',
      tamañoBolsaKg: 21,
      precio: 1800,
      cantidad: 1,
      pagado: false,
      gramosPorComida: 150,
      vecesAlDia: 2,
      intervaloDiasGato: null,
      clienteDireccion: null,
      clienteTelefono: null,
    },
    faltantes: []
  })}]
}

const missingFieldsResponse = {
  content: [{ type: 'text', text: JSON.stringify({
    tipo: 'venta',
    ok: false,
    faltantes: ['precio', 'gramosPorComida']
  })}]
}

describe('parsearMensajeVenta', () => {
  beforeEach(() => {
    getMockCreate().mockReset()
  })

  it('extrae datos completos de un mensaje de perro', async () => {
    getMockCreate().mockResolvedValue(successResponse)
    const result = await parsearMensajeVenta('Vendí Maxine Adulto 21+4kg a Ana García, perro Luna 8kg adulto 2 veces $1800')
    expect(result.ok).toBe(true)
    expect(result.tipo).toBe('venta')
    const data = result.data as VentaData
    expect(data.clienteNombre).toBe('Ana García')
    expect(data.tamañoBolsaKg).toBe(21)
    expect(data.especie).toBe('perro')
    expect(data.cantidad).toBe(1)
    expect(data.pagado).toBe(false)
  })

  it('devuelve ok=false y mensaje cuando faltan campos', async () => {
    getMockCreate().mockResolvedValue(missingFieldsResponse)
    const result = await parsearMensajeVenta('Vendí comida a un cliente')
    expect(result.ok).toBe(false)
    expect(result.faltantes).toContain('precio')
    expect(result.mensajeRespuesta).toBeDefined()
    expect(result.mensajeRespuesta).toContain('precio')
  })
})

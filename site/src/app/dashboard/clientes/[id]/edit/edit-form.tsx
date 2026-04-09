'use client'

interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  direccion: string | null
}

export function EditClienteForm({
  cliente,
  guardarCliente,
}: {
  cliente: Cliente
  guardarCliente: (formData: FormData) => Promise<void>
}) {
  return (
    <form action={guardarCliente} className="bg-slate-900 rounded-lg p-6 space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-slate-300 text-sm mb-1">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          defaultValue={cliente.nombre}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label htmlFor="telefono" className="block text-slate-300 text-sm mb-1">
          Teléfono
        </label>
        <input
          id="telefono"
          name="telefono"
          defaultValue={cliente.telefono ?? ''}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label htmlFor="direccion" className="block text-slate-300 text-sm mb-1">
          Dirección
        </label>
        <input
          id="direccion"
          name="direccion"
          defaultValue={cliente.direccion ?? ''}
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2 rounded text-sm transition-colors"
      >
        Guardar cambios
      </button>
    </form>
  )
}

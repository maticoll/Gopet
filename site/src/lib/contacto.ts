// Datos de contacto de la web pública. Están acá para que el número no quede
// repetido en cada componente que arma un link de WhatsApp.

export const WA_NUMBER = '59892262052'
export const IG_HANDLE = 'gopet_uy'

export const waURL = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`

export const igURL = `https://www.instagram.com/${IG_HANDLE}`

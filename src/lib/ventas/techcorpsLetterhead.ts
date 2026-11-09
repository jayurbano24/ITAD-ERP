/** Datos de encabezado TECHCORPS en cotizaciones e impresión. */
export const TECHCORPS_LETTERHEAD = {
  legalName: 'TECHCORPS GUATEMALA',
  tradeName: 'TECHCORPS',
  /** UI / pantalla */
  logoSrc: '/branding/techcorps-logo.png',
  /** Alta resolución para PDF e impresión */
  logoPrintSrc: '/branding/techcorps-logo-print.png',
  addressLines: [
    'Boulevard Bosques de San Nicolás',
    'Colonia El Naranjo, 7 Calle 24-53, Bodega 9',
    'Zona 4 de Mixco, Guatemala',
  ],
  hours: 'Lunes a viernes · 9:00 a.m. – 6:00 p.m.',
  phones: ['+502 2436 0336', '+502 2254 0430'],
  phonesDisplay: '+502 2436 0336 · +502 2254 0430',
  email: 'info@techcommwireless.com',
  website: 'www.techcorps.com.gt',
} as const

/** Membrete: una línea por dato (dirección, teléfonos, correo). */
export const TECHCORPS_HEADER_CONTACT_LINES = [
  'Boulevard Bosques de San Nicolás · Colonia El Naranjo, 7 Calle 24-53, Bodega 9 · Zona 4 de Mixco, Guatemala',
  `Tel: ${TECHCORPS_LETTERHEAD.phonesDisplay}`,
  TECHCORPS_LETTERHEAD.email,
] as const

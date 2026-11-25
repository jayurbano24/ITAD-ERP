/** Datos de encabezado Techcorp en cotizaciones e impresión. */
export const TECHCORPS_LETTERHEAD = {
  legalName: 'Techcorp Guatemala',
  tradeName: 'Techcorp',
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
  email: 'info@techcorpca.com',
  websiteUrl: 'https://www.techcorpca.com/',
  websiteDisplay: 'www.techcorpca.com',
  /** Franja inferior con slogan, web y sellos R2 / RIOS (cotización PDF y detalle). */
  certFooterSrc: '/branding/quotation-cert-footer.png',
  certFooterAlt:
    'Tech Corp Latam · End-to-End Technology Lifecycle Solutions · www.techcorpca.com · R2 · RIOS',
} as const

/** Membrete: una línea por dato (dirección, teléfonos, sitio web). */
export const TECHCORPS_HEADER_CONTACT_LINES = [
  'Boulevard Bosques de San Nicolás · Colonia El Naranjo, 7 Calle 24-53, Bodega 9 · Zona 4 de Mixco, Guatemala',
  `Tel: ${TECHCORPS_LETTERHEAD.phonesDisplay}`,
  `Web: ${TECHCORPS_LETTERHEAD.websiteDisplay}`,
] as const

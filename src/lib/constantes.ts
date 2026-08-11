/**
 * Constantes que necesitan tanto el servidor como el navegador.
 *
 * Viven acá y no junto a la lógica que las usa porque `privacidad.ts` importa
 * `node:crypto`: si un componente de cliente importara la constante desde
 * allí, el empaquetado arrastraría el módulo de criptografía de Node al
 * navegador y el build falla.
 */

/** Radio del desplazamiento que se le aplica a la ubicación de un donante. */
export const RADIO_DIFUSO_M = 300;

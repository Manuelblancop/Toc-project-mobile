export const PUNTOS_POR_ANIMO = 5;

export const EMOJIS_ANIMO = [
  { valor: 1, emoji: '😢', etiqueta: 'Muy mal' },
  { valor: 2, emoji: '🙁', etiqueta: 'Mal' },
  { valor: 3, emoji: '😐', etiqueta: 'Más o menos' },
  { valor: 4, emoji: '🙂', etiqueta: 'Bien' },
  { valor: 5, emoji: '😄', etiqueta: 'Muy bien' },
] as const;

export type ValorAnimo = (typeof EMOJIS_ANIMO)[number]['valor'];

export type PuntoEvolucionEmocional = {
  fecha: string;
  valor: ValorAnimo;
};

export function emojiPorValor(valor: number) {
  return EMOJIS_ANIMO.find((item) => item.valor === valor) ?? null;
}

export function valorPorEmoji(emoji: string) {
  return EMOJIS_ANIMO.find((item) => item.emoji === emoji)?.valor ?? null;
}

export function claveHoyArgentina(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

export function saludoDelDia(ahora = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: 'numeric',
      hour12: false,
    }).format(ahora),
  );

  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function puntoDeCheckin(registro: { fecha: string; emoji: string }): PuntoEvolucionEmocional | null {
  const valor = valorPorEmoji(registro.emoji);
  if (valor == null) return null;

  const [anio, mes, dia] = registro.fecha.slice(0, 10).split('-');
  if (!anio || !mes || !dia) return null;

  return { fecha: `${dia}/${mes}`, valor };
}

export function pesos(valor: number) {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

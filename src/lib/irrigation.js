/* Motor de decisión de riego para pepino (Cucumis sativus)
   Rangos agronómicos de referencia:
   - Pepino exige suelo constantemente húmedo pero no encharcado.
   - Umbral recomendado demo: 35% min — 65% máx (capacidad de campo ~60-70%)
*/

export const CULTIVO = {
  nombre: "Pepino (Cucumis sativus)",
  etapa: "Floración / Fructificación",
  humedadOptima: [40, 70],
  phOptimo: "6.0 – 6.8",
  riegoSugerido: "Goteo frecuente, ciclos cortos",
};

export function evaluarRiego({ humedad, umbralMin, umbralMax, riegoActivo, minutosRegando, tiempoMaxRiego }) {
  // Devuelve { accion: 'iniciar' | 'detener' | 'mantener', razon }
  if (!riegoActivo && humedad < umbralMin) {
    return {
      accion: "iniciar",
      razon: `Humedad ${humedad.toFixed(1)}% por debajo del umbral mínimo (${umbralMin}%). El pepino sufre estrés hídrico rápidamente en floración.`,
    };
  }
  if (riegoActivo && humedad >= umbralMax) {
    return {
      accion: "detener",
      razon: `Humedad ${humedad.toFixed(1)}% alcanzó el umbral máximo (${umbralMax}%). Se evita encharcamiento y hongos radiculares.`,
    };
  }
  if (riegoActivo && minutosRegando >= tiempoMaxRiego) {
    return {
      accion: "detener",
      razon: `Se alcanzó el tiempo máximo de riego (${tiempoMaxRiego} min) como medida de seguridad anti-inundación.`,
    };
  }
  return {
    accion: "mantener",
    razon:
      humedad < umbralMin + 5
        ? `Humedad en zona de vigilancia (${humedad.toFixed(1)}%). Próximo a activar riego.`
        : `Humedad estable en rango confortable (${humedad.toFixed(1)}%).`,
  };
}

export function estadoHumedad(humedad, umbralMin, umbralMax) {
  if (humedad < umbralMin - 10) return { etiqueta: "Crítica — seca", tono: "danger", consejo: "Riego urgente. El pepino aborta flores con sequía." };
  if (humedad < umbralMin) return { etiqueta: "Baja", tono: "warn", consejo: "Activar riego en breve." };
  if (humedad <= umbralMax) return { etiqueta: "Óptima", tono: "ok", consejo: "Nivel ideal para pepino en fructificación." };
  if (humedad <= umbralMax + 12) return { etiqueta: "Alta", tono: "warn", consejo: "Suspender riego. Vigilar drenaje." };
  return { etiqueta: "Saturada", tono: "danger", consejo: "Riesgo de pudrición radicular y mildiu." };
}

export function estimarAgua({ minutos, cantidadPlantas, caudalPorPlantaLMin = 0.12 }) {
  // Gotero típico 2 L/h ≈ 0.033 L/min por gotero; usamos 0.12 L/min por planta (varios goteros)
  return minutos * cantidadPlantas * caudalPorPlantaLMin;
}

export function generarSerieInicial(puntos = 48, umbralMin = 35, umbralMax = 65) {
  const ahora = Date.now();
  const serie = [];
  let h = 52;
  for (let i = puntos - 1; i >= 0; i--) {
    h += (Math.random() - 0.5) * 6;
    // deriva natural hacia abajo + picos de riego
    h -= 0.35;
    if (h < umbralMin - 4) h += 14 + Math.random() * 8; // riego histórico simulado
    h = Math.max(12, Math.min(92, h));
    serie.push({ t: ahora - i * 30 * 60 * 1000, humedad: +h.toFixed(1) });
  }
  return serie;
}

export function seedHistorialRiegos() {
  const hoy = new Date();
  const mk = (h, m, dur, agua, motivo) => {
    const d = new Date(hoy);
    d.setHours(h, m, 0, 0);
    return { id: crypto.randomUUID(), inicio: d.toISOString(), duracionMin: dur, aguaL: agua, motivo, origen: d.getHours() < 12 ? "automático" : "automático" };
  };
  return [
    mk(6, 12, 14, 20.2, "Humedad nocturna 31.4% < umbral 35%"),
    mk(11, 40, 9, 13.0, "Caída a 34.1% por calor mediodía"),
    mk(17, 5, 12, 17.3, "Humedad 33.8% tras tarde soleada"),
  ];
}

export function seedDecisiones() {
  const hoy = new Date();
  const mk = (h, m, tipo, titulo, detalle) => {
    const d = new Date(hoy);
    d.setHours(h, m, 0, 0);
    return { id: crypto.randomUUID(), at: d.toISOString(), tipo, titulo, detalle };
  };
  return [
    mk(6, 12, "riego", "Riego iniciado (14 min)", "Humedad 31.4% < umbral mínimo 35%. Ciclo de amanecer para pepino en floración."),
    mk(6, 26, "riego", "Riego detenido", "Humedad recuperada a 58.2%. Dentro de rango óptimo 35–65%."),
    mk(9, 30, "info", "Pico de evaporación detectado", "Descenso de 6.1% en 2 h por temperatura alta. Sistema en vigilancia."),
    mk(11, 40, "riego", "Riego iniciado (9 min)", "Humedad 34.1% bajo umbral. Riego corto de mediodía."),
    mk(11, 49, "alerta", "Límite de seguridad verificado", "Duración 9 min < máximo 20 min. Sin riesgo de encharcamiento."),
    mk(17, 5, "riego", "Riego iniciado (12 min)", "Humedad 33.8% tras tarde soleada. Último ciclo del día."),
  ];
}

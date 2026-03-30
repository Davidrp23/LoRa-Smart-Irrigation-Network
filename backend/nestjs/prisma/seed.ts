import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el sembrado de la Base de Datos FLoRa...');

  // =========================================================================
  // 1. TIPOS DE RIEGO (Eficiencia de aplicación estándar)
  // =========================================================================
  const TIPOS_RIEGO = [
    { nombre: 'Goteo', eficiencia: 0.90 },
    { nombre: 'Microaspersión', eficiencia: 0.85 },
    { nombre: 'Aspersión', eficiencia: 0.75 },
    { nombre: 'Gravedad / Inundación', eficiencia: 0.50 },
    { nombre: 'Subterráneo', eficiencia: 0.95 },
  ];

  for (const riego of TIPOS_RIEGO) {
    await prisma.tipoRiego.upsert({
      where: { nombre: riego.nombre },
      update: riego,
      create: riego,
    });
  }
  console.log(`Insertados ${TIPOS_RIEGO.length} tipos de riego.`);

  // =========================================================================
  // 2. TIPOS DE SUELO (Valores volumétricos % y Dosis Máxima FAO)
  // =========================================================================
  // Capacidad de Campo (CC) y Punto de Marchitez (PM) en % volumétrico.
  // laminaMaximaRiego: Dosis máxima por evento (mm) recomendada basada en
  // las tasas de infiltración básica (mm/h) de la FAO (Riego y Drenaje nº 24).
  const TIPOS_SUELO = [
    // Suelos gruesos (Infiltración muy rápida, retención baja)
    { nombre: 'Arenoso', capacidadCampo: 10.0, puntoMarchitez: 5.0, laminaMaximaRiego: 30.0 }, // Traga hasta 30mm/h sin problema
    { nombre: 'Franco-Arenoso', capacidadCampo: 14.0, puntoMarchitez: 6.0, laminaMaximaRiego: 22.0 },
    
    // Suelos medios (Textura equilibrada, retención e infiltración moderada)
    { nombre: 'Franco', capacidadCampo: 24.0, puntoMarchitez: 11.0, laminaMaximaRiego: 15.0 },
    { nombre: 'Franco-Limoso', capacidadCampo: 27.0, puntoMarchitez: 12.0, laminaMaximaRiego: 12.0 },
    { nombre: 'Limoso', capacidadCampo: 30.0, puntoMarchitez: 13.0, laminaMaximaRiego: 10.0 },
    
    // Suelos finos/pesados (Infiltración lenta, alta retención)
    { nombre: 'Franco-Arcilloso', capacidadCampo: 32.0, puntoMarchitez: 15.0, laminaMaximaRiego: 8.0 },
    { nombre: 'Arcilloso', capacidadCampo: 40.0, puntoMarchitez: 20.0, laminaMaximaRiego: 5.0 }, // Se encharca rápido, riegos cortos (5mm)
    
    // Casos especiales
    { nombre: 'Turba', capacidadCampo: 60.0, puntoMarchitez: 30.0, laminaMaximaRiego: 20.0 },     // Retiene mucho, drena bien
    { nombre: 'Pedregoso', capacidadCampo: 12.0, puntoMarchitez: 4.0, laminaMaximaRiego: 25.0 },  // Similar al arenoso
    { nombre: 'Calcáreo', capacidadCampo: 25.0, puntoMarchitez: 10.0, laminaMaximaRiego: 15.0 },  
    { nombre: 'Salino', capacidadCampo: 28.0, puntoMarchitez: 18.0, laminaMaximaRiego: 10.0 },    
  ];

  for (const suelo of TIPOS_SUELO) {
    await prisma.tipoSuelo.upsert({
      where: { nombre: suelo.nombre },
      update: suelo,
      create: suelo,
    });
  }
  console.log(`Insertados ${TIPOS_SUELO.length} tipos de suelo.`);

  // =========================================================================
  // 3. CULTIVOS (Kc basado en FAO-56 y Humedad Objetivo en base a sensibilidad)
  // =========================================================================
  // humedadObjetivo: Porcentaje orientativo de la humedad ideal respecto al volumen total. 
  const CULTIVOS = [
    // Árboles frutales y tolerantes a sequía (Kc moderado/bajo)
    { nombre: 'Aceituna (Olivo)', kcBase: 0.65, humedadObjetivo: 50.0 },
    { nombre: 'Almendra', kcBase: 0.70, humedadObjetivo: 55.0 },
    { nombre: 'Pistacho', kcBase: 0.75, humedadObjetivo: 55.0 },
    { nombre: 'Uva (Viñedo)', kcBase: 0.70, humedadObjetivo: 55.0 },
    { nombre: 'Higo', kcBase: 0.75, humedadObjetivo: 60.0 },
    { nombre: 'Granada', kcBase: 0.75, humedadObjetivo: 60.0 },
    { nombre: 'Dátil', kcBase: 0.95, humedadObjetivo: 65.0 },
    
    // Frutales estándar
    { nombre: 'Aguacate', kcBase: 0.75, humedadObjetivo: 65.0 },
    { nombre: 'Albaricoque', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Cereza', kcBase: 0.95, humedadObjetivo: 65.0 },
    { nombre: 'Ciruela', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Melocotón', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Nectarina', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Manzana', kcBase: 0.95, humedadObjetivo: 65.0 },
    { nombre: 'Pera', kcBase: 0.95, humedadObjetivo: 65.0 },
    { nombre: 'Membrillo', kcBase: 0.95, humedadObjetivo: 65.0 },
    { nombre: 'Níspero', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Caqui', kcBase: 0.90, humedadObjetivo: 65.0 },
    { nombre: 'Nuez', kcBase: 0.85, humedadObjetivo: 60.0 },
    { nombre: 'Avellana', kcBase: 0.85, humedadObjetivo: 60.0 },

    // Cítricos
    { nombre: 'Limón', kcBase: 0.70, humedadObjetivo: 65.0 },
    { nombre: 'Lima', kcBase: 0.70, humedadObjetivo: 65.0 },
    { nombre: 'Naranja', kcBase: 0.75, humedadObjetivo: 65.0 },
    { nombre: 'Mandarina', kcBase: 0.70, humedadObjetivo: 65.0 },
    { nombre: 'Pomelo', kcBase: 0.70, humedadObjetivo: 65.0 },
    
    // Frutos tropicales
    { nombre: 'Plátano', kcBase: 1.10, humedadObjetivo: 75.0 },
    { nombre: 'Mango', kcBase: 0.80, humedadObjetivo: 65.0 },
    { nombre: 'Papaya', kcBase: 0.95, humedadObjetivo: 70.0 },
    { nombre: 'Piña', kcBase: 0.30, humedadObjetivo: 50.0 },
    { nombre: 'Coco', kcBase: 0.85, humedadObjetivo: 70.0 },
    { nombre: 'Chirimoya', kcBase: 0.80, humedadObjetivo: 65.0 },
    { nombre: 'Cacao', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Café', kcBase: 0.95, humedadObjetivo: 70.0 },

    // Bayas y frutos rojos
    { nombre: 'Arándano', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Frambuesa', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Fresa / Fresón', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Grosella', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Mora', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Zarzamora', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Kiwi', kcBase: 1.05, humedadObjetivo: 75.0 },

    // Hortalizas de fruto (Alto consumo)
    { nombre: 'Tomate', kcBase: 1.15, humedadObjetivo: 70.0 },
    { nombre: 'Pimiento', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Berenjena', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Calabacín', kcBase: 0.95, humedadObjetivo: 70.0 },
    { nombre: 'Calabaza', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Pepino', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Melón', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Sandía', kcBase: 1.00, humedadObjetivo: 70.0 },

    // Hortalizas de hoja y flor (Sensibles a la falta de agua)
    { nombre: 'Lechuga', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Acelga', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Espinaca', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Alcachofa', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Apio', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Brócoli', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Col', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Coliflor', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Repollo', kcBase: 1.05, humedadObjetivo: 75.0 },
    { nombre: 'Endibia', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Escarola', kcBase: 1.00, humedadObjetivo: 75.0 },
    { nombre: 'Rúcula', kcBase: 1.00, humedadObjetivo: 75.0 },

    // Raíces y tubérculos
    { nombre: 'Cebolla', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Ajo', kcBase: 1.00, humedadObjetivo: 65.0 },
    { nombre: 'Puerro', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Zanahoria', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Patata', kcBase: 1.15, humedadObjetivo: 75.0 },
    { nombre: 'Batata', kcBase: 1.10, humedadObjetivo: 70.0 },
    { nombre: 'Remolacha', kcBase: 1.10, humedadObjetivo: 70.0 },
    { nombre: 'Rábano', kcBase: 0.90, humedadObjetivo: 70.0 },
    { nombre: 'Nabo', kcBase: 0.95, humedadObjetivo: 70.0 },
    { nombre: 'Ñame', kcBase: 1.10, humedadObjetivo: 70.0 },
    { nombre: 'Yuca', kcBase: 0.80, humedadObjetivo: 60.0 },

    // Leguminosas
    { nombre: 'Guisante', kcBase: 1.15, humedadObjetivo: 70.0 },
    { nombre: 'Haba', kcBase: 1.15, humedadObjetivo: 70.0 },
    { nombre: 'Judía', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Garbanzo', kcBase: 1.00, humedadObjetivo: 60.0 },
    { nombre: 'Lenteja', kcBase: 1.00, humedadObjetivo: 60.0 },
    { nombre: 'Soja', kcBase: 1.15, humedadObjetivo: 70.0 },
    { nombre: 'Cacahuete', kcBase: 1.05, humedadObjetivo: 65.0 },

    // Cereales y extensivos
    { nombre: 'Trigo', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Cebada', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Avena', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Centeno', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Tritikale', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Maíz', kcBase: 1.20, humedadObjetivo: 75.0 },
    { nombre: 'Arroz', kcBase: 1.20, humedadObjetivo: 100.0 },
    { nombre: 'Sorgo', kcBase: 1.10, humedadObjetivo: 60.0 },
    { nombre: 'Girasol', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Algodón', kcBase: 1.20, humedadObjetivo: 65.0 },
    { nombre: 'Colza', kcBase: 1.15, humedadObjetivo: 65.0 },
    { nombre: 'Lino', kcBase: 1.10, humedadObjetivo: 65.0 },
    { nombre: 'Caña de azúcar', kcBase: 1.25, humedadObjetivo: 80.0 },
    { nombre: 'Alfalfa', kcBase: 1.20, humedadObjetivo: 75.0 },
    { nombre: 'Tabaco', kcBase: 1.15, humedadObjetivo: 75.0 },
    { nombre: 'Lúpulo', kcBase: 1.05, humedadObjetivo: 70.0 },

    // Aromáticas y otras
    { nombre: 'Albahaca', kcBase: 1.00, humedadObjetivo: 70.0 },
    { nombre: 'Espárrago', kcBase: 0.95, humedadObjetivo: 65.0 },
    { nombre: 'Hinojo', kcBase: 1.05, humedadObjetivo: 70.0 },
    { nombre: 'Laurel', kcBase: 0.80, humedadObjetivo: 60.0 },
    { nombre: 'Perejil', kcBase: 1.00, humedadObjetivo: 70.0 },
  ];

  for (const cultivo of CULTIVOS) {
    await prisma.tipoCultivo.upsert({
      where: { nombre: cultivo.nombre },
      update: cultivo,
      create: cultivo,
    });
  }
  console.log(`Insertados ${CULTIVOS.length} tipos de cultivo.`);

  console.log('Seed completado con éxito!');
}

main()
  .catch((e) => {
    console.error(' Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
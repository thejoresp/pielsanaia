import { AlertCircle, Crosshair, Sun, Thermometer, type LucideIcon } from 'lucide-react';

// Contenido educativo de cada condición. Es la única fuente: antes estaba en
// backend/controllers/skin.py (conditions_data) y duplicado en varios componentes.

export type ConditionId = 'acne' | 'rosacea' | 'manchas' | 'lunares';

export interface Condition {
  id: ConditionId;
  title: string;
  /** Texto corto para las tarjetas de la home. */
  summary: string;
  description: string;
  causes: string[];
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  image: string;
  icon: LucideIcon;
}

export const CONDITIONS: Record<ConditionId, Condition> = {
  acne: {
    id: 'acne',
    title: 'Acné',
    summary: 'El acné es una condición común que ocurre cuando los folículos pilosos se obstruyen con grasa y células muertas de la piel.',
    description: 'El acné es una condición común que ocurre cuando los folículos pilosos se obstruyen con grasa y células muertas de la piel, causando granos y espinillas.',
    causes: [
      'Cambios hormonales',
      'Exceso de producción de grasa (sebo)',
      'Bacterias',
      'Ciertos medicamentos',
      'Estrés',
    ],
    symptoms: [
      'Puntos negros y blancos',
      'Espinillas',
      'Protuberancias rojas y dolorosas',
      'Quistes',
      'Cicatrices',
    ],
    treatment: [
      'Limpieza suave de la piel',
      'Medicamentos tópicos (peróxido de benzoilo, retinoides)',
      'Antibióticos',
      'Terapias hormonales',
      'Evitar manipular las lesiones',
    ],
    prevention: [
      'Lavar el rostro regularmente',
      'Evitar productos grasos',
      'No exprimir los granos',
      'Mantener el cabello limpio',
      'Usar protector solar no comedogénico',
    ],
    image: 'https://images.pexels.com/photos/10004287/pexels-photo-10004287.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    icon: AlertCircle,
  },
  rosacea: {
    id: 'rosacea',
    title: 'Rosácea',
    summary: 'La rosácea es una afección crónica que causa enrojecimiento y vasos sanguíneos visibles en la cara.',
    description: 'La rosácea es una afección crónica que causa enrojecimiento y vasos sanguíneos visibles en la cara, a veces con pequeños bultos rojos llenos de pus.',
    causes: [
      'Predisposición genética',
      'Problemas con los vasos sanguíneos faciales',
      'Ácaros microscópicos (Demodex)',
      'Bacterias intestinales (H. pylori)',
      'Desencadenantes ambientales',
    ],
    symptoms: [
      'Enrojecimiento persistente en el centro de la cara',
      'Vasos sanguíneos dilatados visibles',
      'Bultos rojos (pápulas) y pústulas',
      'Sensación de ardor o escozor',
      'Piel sensible y reactiva',
      'Engrosamiento de la piel nasal (rinofima)',
    ],
    treatment: [
      'Medicamentos tópicos (metronidazol, ácido azelaico)',
      'Antibióticos orales',
      'Isotretinoína (casos severos)',
      'Terapias con láser o luz pulsada',
      'Evitar desencadenantes conocidos',
    ],
    prevention: [
      'Usar protector solar diariamente',
      'Evitar extremos de temperatura',
      'Evitar alimentos y bebidas desencadenantes',
      'Usar productos para piel sensible',
      'Mantener una buena rutina de cuidado facial',
    ],
    image: 'https://images.pexels.com/photos/1138531/pexels-photo-1138531.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    icon: Thermometer,
  },
  manchas: {
    id: 'manchas',
    title: 'Manchas Solares',
    summary: 'Las manchas solares son áreas de la piel que se oscurecen debido a la exposición al sol.',
    description: 'Las manchas solares son áreas de la piel que se oscurecen debido a la exposición prolongada al sol, también conocidas como lentigos solares.',
    causes: [
      'Exposición excesiva a la radiación UV',
      'Envejecimiento de la piel',
      'Predisposición genética',
    ],
    symptoms: [
      'Manchas planas y marrones',
      'Aparición en zonas expuestas al sol',
      'No suelen causar dolor ni molestias',
    ],
    treatment: [
      'Cremas despigmentantes',
      'Tratamientos con láser',
      'Peelings químicos',
      'Crioterapia',
      'Protección solar diaria',
    ],
    prevention: [
      'Evitar la exposición solar prolongada',
      'Usar protector solar de amplio espectro',
      'Utilizar ropa protectora',
      'Evitar camas solares',
      'Revisar la piel regularmente',
    ],
    image: 'https://images.pexels.com/photos/7479603/pexels-photo-7479603.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    icon: Sun,
  },
  lunares: {
    id: 'lunares',
    title: 'Lunares',
    summary: 'Los lunares son áreas pequeñas de pigmentación en la piel. La mayoría son inofensivos, pero es importante monitorearlos.',
    description: 'Los lunares son áreas pequeñas de pigmentación en la piel, generalmente inofensivas, pero algunos pueden evolucionar y requerir control dermatológico.',
    causes: [
      'Acumulación de melanocitos',
      'Factores genéticos',
      'Exposición solar',
    ],
    symptoms: [
      'Pequeñas manchas marrones o negras',
      'Pueden ser planas o elevadas',
      'Cambios en el color, tamaño o forma pueden ser signo de alerta',
    ],
    treatment: [
      'Observación regular',
      'Extirpación quirúrgica si es necesario',
      'Biopsia en caso de sospecha de malignidad',
      'Evitar la exposición solar excesiva',
      'Consulta dermatológica ante cambios sospechosos',
    ],
    prevention: [
      'Usar protector solar',
      'Evitar la exposición solar intensa',
      'Autoexamen de la piel',
      'Consultar al dermatólogo ante cambios',
      'No manipular los lunares',
    ],
    image: 'https://images.pexels.com/photos/8058606/pexels-photo-8058606.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    icon: Crosshair,
  },
};

export const getCondition = (id: string | undefined): Condition | undefined =>
  id && id in CONDITIONS ? CONDITIONS[id as ConditionId] : undefined;

import { ParamListBase } from '@react-navigation/native';

export interface AuthStackParamList extends ParamListBase {
  Login: undefined;
  Register: undefined;
}

export interface MainTabParamList extends ParamListBase {
  MyItineraries: undefined;
  SharedItineraries: undefined;
  Profile: undefined;
}

export interface SharedStackParamList extends ParamListBase {
  SharedList: undefined;
  ItineraryDetail: { itineraryId: string };
}

export interface ItineraryStackParamList extends ParamListBase {
  ItineraryList: undefined;
  CreateItinerary: undefined;
  ItineraryDetail: { itineraryId: string };
}

export interface RootStackParamList extends ParamListBase {
  Auth: undefined;
  App: undefined;
}

export type ItineraryStatus = 'upcoming' | 'traveling' | 'completed';
export type SharePermission = 'view' | 'edit' | 'owner';
export type Period = 'manha' | 'tarde' | 'noite' | 'madrugada';

export type ItineraryEmotion =
  | 'summit' | 'pine-tree' | 'waterfall' | 'palm-tree' | 'terrain'
  | 'forest' | 'weather-sunny' | 'flower' | 'leaf' | 'volcano' | 'cactus'
  | 'beach' | 'waves' | 'diving-scuba' | 'sail-boat' | 'ferry'
  | 'fish' | 'anchor' | 'swim' | 'surfing'
  | 'city' | 'bank' | 'drama-masks' | 'music' | 'camera' | 'palette'
  | 'store' | 'stadium' | 'weather-night'
  | 'hiking' | 'bike' | 'run' | 'ski' | 'kayaking'
  | 'paragliding' | 'horse' | 'tent' | 'compass'
  | 'snowflake' | 'snowman' | 'weather-snowy' | 'sledding'
  | 'castle' | 'church' | 'pillar' | 'mosque' | 'crown' | 'shield-cross'
  | 'car' | 'motorbike' | 'train' | 'airplane' | 'bus'
  | 'rv-truck' | 'map-outline' | 'road-variant'
  | 'spa' | 'home-heart' | 'cow' | 'weather-sunset' | 'campfire'
  | 'hot-tub' | 'meditation'
  | 'food-fork-drink' | 'glass-wine' | 'beer' | 'coffee' | 'pizza'
  | 'chef-hat' | 'grill';

export interface ItineraryEmotionOption {
  value: ItineraryEmotion;
  label: string;
  category: string;
}

export const EMOTION_OPTIONS: ItineraryEmotionOption[] = [
  { value: 'summit',           label: 'Montanha',      category: 'Natureza' },
  { value: 'pine-tree',        label: 'Floresta',      category: 'Natureza' },
  { value: 'waterfall',        label: 'Cachoeira',     category: 'Natureza' },
  { value: 'palm-tree',        label: 'Palmeira',      category: 'Natureza' },
  { value: 'terrain',          label: 'Paisagem',      category: 'Natureza' },
  { value: 'forest',           label: 'Mata',          category: 'Natureza' },
  { value: 'weather-sunny',    label: 'Ensolarado',    category: 'Natureza' },
  { value: 'flower',           label: 'Natureza',      category: 'Natureza' },
  { value: 'leaf',             label: 'Verde',         category: 'Natureza' },
  { value: 'volcano',          label: 'Vulcão',        category: 'Natureza' },
  { value: 'cactus',           label: 'Deserto',       category: 'Natureza' },
  { value: 'beach',            label: 'Praia',         category: 'Praia & Água' },
  { value: 'waves',            label: 'Ondas',         category: 'Praia & Água' },
  { value: 'diving-scuba',     label: 'Mergulho',      category: 'Praia & Água' },
  { value: 'sail-boat',        label: 'Veleiro',       category: 'Praia & Água' },
  { value: 'ferry',            label: 'Cruzeiro',      category: 'Praia & Água' },
  { value: 'fish',             label: 'Pesca',         category: 'Praia & Água' },
  { value: 'anchor',           label: 'Porto',         category: 'Praia & Água' },
  { value: 'swim',             label: 'Natação',       category: 'Praia & Água' },
  { value: 'surfing',          label: 'Surf',          category: 'Praia & Água' },
  { value: 'city',             label: 'Cidade',        category: 'Cidade & Cultura' },
  { value: 'bank',             label: 'Monumento',     category: 'Cidade & Cultura' },
  { value: 'drama-masks',      label: 'Teatro',        category: 'Cidade & Cultura' },
  { value: 'music',            label: 'Música',        category: 'Cidade & Cultura' },
  { value: 'camera',           label: 'Fotografia',    category: 'Cidade & Cultura' },
  { value: 'palette',          label: 'Arte',          category: 'Cidade & Cultura' },
  { value: 'store',            label: 'Compras',       category: 'Cidade & Cultura' },
  { value: 'stadium',          label: 'Estádio',       category: 'Cidade & Cultura' },
  { value: 'weather-night',    label: 'Vida noturna',  category: 'Cidade & Cultura' },
  { value: 'hiking',           label: 'Trilha',        category: 'Aventura & Esporte' },
  { value: 'bike',             label: 'Ciclismo',      category: 'Aventura & Esporte' },
  { value: 'run',              label: 'Corrida',       category: 'Aventura & Esporte' },
  { value: 'ski',              label: 'Ski',           category: 'Aventura & Esporte' },
  { value: 'kayaking',         label: 'Caiaque',       category: 'Aventura & Esporte' },
  { value: 'paragliding',      label: 'Parapente',     category: 'Aventura & Esporte' },
  { value: 'horse',            label: 'Equitação',     category: 'Aventura & Esporte' },
  { value: 'tent',             label: 'Camping',       category: 'Aventura & Esporte' },
  { value: 'compass',          label: 'Exploração',    category: 'Aventura & Esporte' },
  { value: 'snowflake',        label: 'Neve',          category: 'Inverno & Neve' },
  { value: 'snowman',          label: 'Boneco de neve',category: 'Inverno & Neve' },
  { value: 'weather-snowy',    label: 'Inverno',       category: 'Inverno & Neve' },
  { value: 'sledding',         label: 'Trenó',         category: 'Inverno & Neve' },
  { value: 'castle',           label: 'Castelo',       category: 'História & Religião' },
  { value: 'church',           label: 'Igreja',        category: 'História & Religião' },
  { value: 'pillar',           label: 'Ruínas',        category: 'História & Religião' },
  { value: 'mosque',           label: 'Mesquita',      category: 'História & Religião' },
  { value: 'crown',            label: 'Realeza',       category: 'História & Religião' },
  { value: 'shield-cross',     label: 'Medieval',      category: 'História & Religião' },
  { value: 'car',              label: 'Road Trip',     category: 'Transporte' },
  { value: 'motorbike',        label: 'Moto',          category: 'Transporte' },
  { value: 'train',            label: 'Trem',          category: 'Transporte' },
  { value: 'airplane',         label: 'Avião',         category: 'Transporte' },
  { value: 'bus',              label: 'Ônibus',        category: 'Transporte' },
  { value: 'rv-truck',         label: 'Motorhome',     category: 'Transporte' },
  { value: 'map-outline',      label: 'Mapa',          category: 'Transporte' },
  { value: 'road-variant',     label: 'Estrada',       category: 'Transporte' },
  { value: 'spa',              label: 'Spa',           category: 'Relax & Bem-estar' },
  { value: 'home-heart',       label: 'Aconchego',     category: 'Relax & Bem-estar' },
  { value: 'cow',              label: 'Fazenda',       category: 'Relax & Bem-estar' },
  { value: 'weather-sunset',   label: 'Pôr do sol',    category: 'Relax & Bem-estar' },
  { value: 'campfire',         label: 'Fogueira',      category: 'Relax & Bem-estar' },
  { value: 'hot-tub',          label: 'Jacuzzi',       category: 'Relax & Bem-estar' },
  { value: 'meditation',       label: 'Meditação',     category: 'Relax & Bem-estar' },
  { value: 'food-fork-drink',  label: 'Gastronomia',   category: 'Gastronomia' },
  { value: 'glass-wine',       label: 'Vinho',         category: 'Gastronomia' },
  { value: 'beer',             label: 'Cerveja',       category: 'Gastronomia' },
  { value: 'coffee',           label: 'Café',          category: 'Gastronomia' },
  { value: 'pizza',            label: 'Pizza',         category: 'Gastronomia' },
  { value: 'chef-hat',         label: 'Alta cozinha',  category: 'Gastronomia' },
  { value: 'grill',            label: 'Churrasco',     category: 'Gastronomia' },
];

export interface User {
  id: string; name: string; username: string;
  email: string; avatarUrl?: string; createdAt: string;
}
export interface UserPreview {
  id: string; name: string; username: string; email: string; avatarUrl?: string;
}
export interface Activity {
  id: string; dayId: string; title: string;
  locationName?: string; latitude?: number; longitude?: number;
  startTime?: string; endTime?: string; notes?: string; orderIndex: number;
}
export interface ItineraryDay {
  id: string; itineraryId: string; dayNumber: number;
  date: string; title?: string; activities: Activity[];
}
export interface Itinerary {
  id: string; ownerId: string; title: string; destination: string;
  emotion: ItineraryEmotion; coverColor?: string; startDate: string;
  endDate: string; status: ItineraryStatus; isPublic: boolean;
  createdAt: string; updatedAt: string;
}
export interface SharedItinerary extends Itinerary {
  permission: 'view' | 'edit'; ownerName: string; isShared: true;
}
export interface ItineraryDetail extends Itinerary {
  days: ItineraryDay[]; permission: SharePermission;
}
export interface CreateItineraryInput {
  title: string; destination: string; emotion: ItineraryEmotion;
  coverColor?: string; startDate: string; endDate: string; isPublic?: boolean;
}
export interface UpdateItineraryInput extends Partial<CreateItineraryInput> {
  status?: ItineraryStatus;
}
export interface CreateActivityInput {
  title: string; locationName?: string; latitude?: number; longitude?: number;
  startTime?: string; endTime?: string; notes?: string; orderIndex?: number;
}
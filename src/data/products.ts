import type { ImageSourcePropType } from 'react-native';
import type { Product as ClientProduct } from '@/types';

export type Universe = 'Mode' | 'Électronique' | 'Maison';

export type Finish = {
  name: string;
  hex: string;
};

export type Feature = {
  label: string;
  value: string;
  icon: string;
  tint: string;
  iconColor: string;
};

export type Review = {
  name: string;
  date: string;
  rating: number;
  text: string;
  verified: boolean;
};

export type Product = {
  id: string;
  title: string;
  category: string;
  headerLabel: string;
  universe: Universe;
  brand: string;
  ref: string;
  price: number;
  oldPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  recommend: number;
  image: ImageSourcePropType;
  images: ImageSourcePropType[];
  finishes: Finish[];
  features: Feature[];
  description: string;
  reviews: Review[];
  alias?: string;
};

const headphones = require('../../assets/products/headphones-hero.png');
const headphonesSide = require('../../assets/products/headphones-side.png');
const headphonesCase = require('../../assets/products/headphones-case.png');
const dress = require('../../assets/products/dress.png');
const espresso = require('../../assets/products/espresso.png');
const cream = require('../../assets/products/cream.png');
const sneakers = require('../../assets/products/sneakers.png');
const diffuser = require('../../assets/products/diffuser.png');

export const seller = {
  name: 'Élan Officiel',
  tagline: 'Vendeur officiel de la marque',
  rating: 4.9,
  reviews: 2400,
  shipping: 'Expédition sous 24h',
};

const defaultReviews: Review[] = [
  {
    name: 'Thomas L.',
    date: 'Il y a 4 j',
    rating: 5,
    verified: true,
    text: 'Conforme à la description, la finition est impeccable. Livraison rapide et emballage très soigné.',
  },
  {
    name: 'Sophie M.',
    date: 'Il y a 1 sem',
    rating: 5,
    verified: true,
    text: 'Très belle qualité, je recommande sans hésiter. Le rapport qualité-prix est excellent.',
  },
  {
    name: 'Amine K.',
    date: 'Il y a 3 sem',
    rating: 4,
    verified: true,
    text: 'Reçu en avance et parfaitement emballé. Le produit correspond exactement aux photos.',
  },
];

const audioReviews: Review[] = [
  {
    name: 'Thomas L.',
    date: 'Il y a 3 j',
    rating: 5,
    verified: true,
    text: 'Qualité audio exceptionnelle, la réduction de bruit est bluffante dans le métro. Confort parfait même après 5 heures de train sans aucune gêne.',
  },
  {
    name: 'Sophie M.',
    date: 'Il y a 1 sem',
    rating: 5,
    verified: true,
    text: 'Très beau design, finitions impeccables et autonomie impressionnante. Livré très rapidement dans un packaging éco-responsable. Bravo Élan !',
  },
  {
    name: 'Amine K.',
    date: 'Il y a 3 sem',
    rating: 4,
    verified: true,
    text: 'Le son est très équilibré et l’application est simple. Je retire une étoile pour l’étui qui aurait pu être plus rigide.',
  },
];

export const products: Product[] = [
  {
    id: 'casque-elan-h1',
    alias: 'p1',
    title: 'Casque Sans Fil Noise-Canceling Élan H1',
    category: 'Audio',
    headerLabel: 'CASQUES HI-FI',
    universe: 'Électronique',
    brand: 'AUDIO PREMIUM · ÉLAN SOUND',
    ref: 'ELN-8840',
    price: 129,
    oldPrice: 159,
    stock: 3,
    rating: 4.8,
    reviewCount: 142,
    recommend: 98,
    image: headphones,
    images: [headphones, headphonesSide, headphonesCase],
    finishes: [
      { name: 'Noir Minéral', hex: '#22252C' },
      { name: 'Bleu Brume', hex: '#C9DAF4' },
      { name: 'Bleu Royal', hex: '#2F4BE0' },
    ],
    features: [
      { label: 'Autonomie', value: '40 heures (ANC)', icon: 'battery-half-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Connexion', value: 'Bluetooth 5.3 apt', icon: 'bluetooth', tint: '#EAF5FF', iconColor: '#2C7DF5' },
      { label: 'Expérience', value: 'Audio Spatial 3D', icon: 'headset-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
      { label: 'Recharge', value: 'USB-C · 5 min = 4 h', icon: 'flash-outline', tint: '#EDF4FF', iconColor: '#3D7BF7' },
    ],
    description:
      'Profitez d’une immersion sonore totale grâce à la réduction de bruit adaptative (ANC) de dernière génération. Les transducteurs sur mesure de 42 mm restituent des basses profondes et des aigus cristallins. La mémoire de forme des coussinets et l’arceau en aluminium garantissent un confort durable, même après plusieurs heures d’écoute. L’autonomie de 40 heures, la charge rapide USB-C et la connexion multipoint en font le compagnon idéal du quotidien.',
    reviews: audioReviews,
  },
  {
    id: 'robe-plissee',
    alias: 'p2',
    title: 'Robe Plissée Émeraude',
    category: 'Mode Femme',
    headerLabel: 'ROBE PLISSÉE',
    universe: 'Mode',
    brand: 'COLLECTION CAPSULE · ÉLAN ÉDITION',
    ref: 'ELN-3312',
    price: 85,
    stock: 2,
    rating: 4.5,
    reviewCount: 64,
    recommend: 92,
    image: dress,
    images: [dress],
    finishes: [
      { name: 'Émeraude', hex: '#1C694F' },
      { name: 'Nuit', hex: '#182438' },
      { name: 'Sable', hex: '#C5B59C' },
    ],
    features: [
      { label: 'Matière', value: '100% Crêpe recyclé', icon: 'shirt-outline', tint: '#EEF9F1', iconColor: '#1D9E5C' },
      { label: 'Entretien', value: 'Lavage délicat 30°', icon: 'water-outline', tint: '#EAF5FF', iconColor: '#2C7DF5' },
      { label: 'Coupe', value: 'Midi ceinturée', icon: 'resize-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Origine', value: 'Atelier certifié', icon: 'shield-checkmark-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
    ],
    description:
      'Une coupe midi fluide, des plis nets dessinés avec précision et une teinte émeraude lumineuse. Confectionnée dans un crêpe fluide issu de matières recyclées, cette robe se porte aussi bien au bureau qu’en soirée. La ceinture amovible permet d’ajuster la taille selon vos envies.',
    reviews: defaultReviews,
  },
  {
    id: 'cafetiere-crema',
    alias: 'p3',
    title: 'Cafetière Espresso Créma',
    category: 'Cuisine',
    headerLabel: 'ESPRESSO PRO',
    universe: 'Maison',
    brand: 'BARISTA · ÉLAN DESIGN',
    ref: 'ELN-9201',
    price: 149,
    stock: 4,
    rating: 4.7,
    reviewCount: 98,
    recommend: 96,
    image: espresso,
    images: [espresso],
    finishes: [
      { name: 'Crème Vintage', hex: '#EADFC9' },
      { name: 'Inox Brossé', hex: '#CBD2DC' },
      { name: 'Noir Mat', hex: '#262930' },
    ],
    features: [
      { label: 'Pression', value: '9 bars italiens', icon: 'speedometer-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Réservoir', value: '1,5 L amovible', icon: 'water-outline', tint: '#EAF5FF', iconColor: '#2C7DF5' },
      { label: 'Matière', value: 'Acier laqué', icon: 'color-fill-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
      { label: 'Accessoires', value: 'Buse vapeur', icon: 'cafe-outline', tint: '#EEF9F1', iconColor: '#1D9E5C' },
    ],
    description:
      'Retrouvez le geste du barista à la maison avec cette machine espresso à pression professionnelle de 9 bars. La buse vapeur orientable prépare une mousse de lait onctueuse, tandis que le réservoir amovible de 1,5 L facilite l’entretien. Un design rétro en acier laqué qui trouve sa place dans toutes les cuisines.',
    reviews: defaultReviews,
  },
  {
    id: 'creme-hydratante',
    alias: 'p4',
    title: 'Crème Hydratante Botanique',
    category: 'Soin Visage',
    headerLabel: 'SOIN VISAGE',
    universe: 'Maison',
    brand: 'SOIN VISAGE · ÉLAN BOTANIQUE',
    ref: 'ELN-5120',
    price: 42,
    stock: 5,
    rating: 4.8,
    reviewCount: 210,
    recommend: 98,
    image: cream,
    images: [cream],
    finishes: [
      { name: 'Naturel', hex: '#F1E9DC' },
      { name: 'Rosé', hex: '#EFD3CB' },
      { name: 'Doré', hex: '#D9B26A' },
    ],
    features: [
      { label: 'Hydratation', value: '48 heures', icon: 'water-outline', tint: '#EAF5FF', iconColor: '#2C7DF5' },
      { label: 'Texture', value: 'Fondante & légère', icon: 'snow-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Peaux', value: 'Tous types', icon: 'leaf-outline', tint: '#EEF9F1', iconColor: '#1D9E5C' },
      { label: 'Format', value: '50 ml', icon: 'flask-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
    ],
    description:
      'Une crème hydratante fondante enrichie en actifs botaniques qui nourrit intensément et renforce la barrière cutanée pendant 48 heures. Sa texture légère pénètre rapidement sans film gras et convient à tous les types de peaux, même sensibles. Un rituel simple pour un éclat naturel au quotidien.',
    reviews: defaultReviews,
  },
  {
    id: 'sneakers-basses',
    alias: 'p5',
    title: 'Sneakers Basses Cuir Blanc',
    category: 'Chaussures',
    headerLabel: 'SNEAKERS',
    universe: 'Mode',
    brand: 'CHAUSSURES · ÉLAN ATELIER',
    ref: 'ELN-6402',
    price: 110,
    stock: 2,
    rating: 4.6,
    reviewCount: 87,
    recommend: 95,
    image: sneakers,
    images: [sneakers],
    finishes: [
      { name: 'Blanc', hex: '#F4F4F2' },
      { name: 'Noir', hex: '#24262B' },
      { name: 'Sable', hex: '#D7C6AE' },
    ],
    features: [
      { label: 'Cuir', value: 'Pleine fleur', icon: 'layers-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
      { label: 'Semelle', value: 'Caoutchouc souple', icon: 'footsteps-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Doublure', value: 'Respirante', icon: 'leaf-outline', tint: '#EEF9F1', iconColor: '#1D9E5C' },
      { label: 'Entretien', value: 'Éponge douce', icon: 'shield-checkmark-outline', tint: '#EAF5FF', iconColor: '#2C7DF5' },
    ],
    description:
      'Des sneakers basses en cuir pleine fleur au design épuré, assemblées à la main. La semelle en caoutchouc souple et la doublure respirante offrent un confort immédiat, du premier pas jusqu’au soir. Un indispensable qui s’accorde avec toutes les tenues.',
    reviews: defaultReviews,
  },
  {
    id: 'diffuseur-ceramique',
    alias: 'p6',
    title: 'Diffuseur Céramique Zen',
    category: 'Maison & Zen',
    headerLabel: 'DIFFUSEUR',
    universe: 'Maison',
    brand: 'MAISON & ZEN · ÉLAN MAISON',
    ref: 'ELN-4471',
    price: 38,
    stock: 3,
    rating: 4.7,
    reviewCount: 64,
    recommend: 94,
    image: diffuser,
    images: [diffuser],
    finishes: [
      { name: 'Céramique', hex: '#EFE6D8' },
      { name: 'Ardoise', hex: '#5C6168' },
      { name: 'Sauge', hex: '#A9B7A2' },
    ],
    features: [
      { label: 'Diffusion', value: '8 heures', icon: 'timer-outline', tint: '#EDF1FF', iconColor: '#2C5BF5' },
      { label: 'Surface', value: 'Jusqu’à 30 m²', icon: 'expand-outline', tint: '#EAF5FF', iconColor: '#2C7DF5' },
      { label: 'Matière', value: 'Céramique', icon: 'color-fill-outline', tint: '#FFF3E6', iconColor: '#E8952F' },
      { label: 'Ambiance', value: 'Lumière réglable', icon: 'bulb-outline', tint: '#EEF9F1', iconColor: '#1D9E5C' },
    ],
    description:
      'Un diffuseur d’arômes à ultrasons au design sculptural en céramique. Sa diffusion douce et silencieuse parfume les pièces jusqu’à 30 m² pendant 8 heures. La lumière d’ambiance réglable et l’arrêt automatique en font un allié discret pour un intérieur apaisé.',
    reviews: defaultReviews,
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id || product.alias === id) ?? products[0];
}

// Données pour l'écran Accueil Client (PRODUCTS)
export const PRODUCTS: ClientProduct[] = [
  {
    id: 'casque-elan-h1',
    name: 'Casque Sans Fil Noise-Canceling Élan H1',
    category: 'Électronique',
    subcategory: 'Audio',
    price: 129,
    oldPrice: 159,
    rating: 4.8,
    reviews: 142,
    stock: 3,
    createdAt: 20260920,
    image: 'https://cdn.salla.sa/aeEgpn/9d999bc8-bd49-4ddf-923e-bf5149f171e8-1000x1000-OcBcjA52hWP5rWdWlSOQSc8ALqd9kpve7CLCWTvB.jpg',
    icon: 'headset',
    tint: '#DBEAFE',
  },
  {
    id: 'robe-plissee',
    name: 'Robe Plissée Émeraude',
    category: 'Mode',
    subcategory: 'Mode Femme',
    price: 85,
    rating: 4.5,
    reviews: 64,
    stock: 2,
    createdAt: 20260915,
    image: 'https://images.asos-media.com/products/closet-london-hooggesloten-geplooide-midi-jurk-in-smaragdgroen/202869092-1-emerald?%24n_640w%24=&fit=constrain&wid=513',
    icon: 'shirt',
    tint: '#D1FAE5',
  },
  {
    id: 'cafetiere-crema',
    name: 'Cafetière Expresso Rétro',
    category: 'Maison',
    subcategory: 'Cuisine',
    price: 149,
    rating: 4.7,
    reviews: 98,
    stock: 4,
    createdAt: 20260901,
    image: 'https://storage.googleapis.com/anjana-images/im86xg4i24tnxckjoh3ddt1jsa4e',
    icon: 'cafe',
    tint: '#FEF3C7',
  },
  {
    id: 'creme-hydratante',
    name: 'Crème Hydratante Visage',
    category: 'Beauté',
    subcategory: 'Soin Visage',
    price: 42,
    rating: 4.3,
    reviews: 77,
    stock: 5,
    createdAt: 20260928,
    image: 'https://d1a66n3120ol3x.cloudfront.net/landing/tools/cosmetics-hero/feature-highlight-1-dbb91a44-6021-4a95-a43b-83cf60523884.jpg',
    icon: 'water',
    tint: '#FCE7F3',
  },
  {
    id: 'sneakers-basses',
    name: 'Sneakers Basses Minimalistes',
    category: 'Mode',
    subcategory: 'Chaussures',
    price: 110,
    rating: 4.6,
    reviews: 210,
    stock: 3,
    createdAt: 20260825,
    image: 'https://images.squarespace-cdn.com/content/v1/5b8c557c8f51308965aa6dd8/1626272853910-352ZLN7AKORK91LLKD1B/ESGRAINEDWHITE.jpg',
    icon: 'footsteps',
    tint: '#E2E8F0',
  },
  {
    id: 'diffuseur-ceramique',
    name: "Diffuseur d'Huiles Essentielles",
    category: 'Maison',
    subcategory: 'Maison & Zen',
    price: 38,
    rating: 4.4,
    reviews: 59,
    stock: 3,
    createdAt: 20260910,
    image: 'https://ecomodernessentials.com.au/cdn/shop/products/CoastalDiffuser_1296x.png?v=1705282979',
    icon: 'flower',
    tint: '#FFEDD5',
  },
  {
    id: 'p7',
    name: 'Montre Connectée Sport',
    category: 'Électronique',
    subcategory: 'Objets connectés',
    price: 199,
    oldPrice: 229,
    rating: 4.4,
    reviews: 53,
    stock: 12,
    createdAt: 20261001,
    icon: 'watch',
    tint: '#E0E7FF',
  },
  {
    id: 'p8',
    name: 'Parure de Lit en Lin',
    category: 'Maison',
    subcategory: 'Chambre',
    price: 95,
    rating: 4.9,
    reviews: 120,
    stock: 0,
    createdAt: 20260720,
    icon: 'bed',
    tint: '#FFF7ED',
  },
  {
    id: 'p9',
    name: 'Sérum Éclat Vitamine C',
    category: 'Beauté',
    subcategory: 'Soin Visage',
    price: 58,
    rating: 4.7,
    reviews: 188,
    stock: 18,
    createdAt: 20260930,
    icon: 'sparkles',
    tint: '#FFE4E6',
  },
  {
    id: 'p10',
    name: 'Panier de Fruits Frais Bio',
    category: 'Alimentation',
    subcategory: 'Fruits & Légumes',
    price: 24,
    rating: 4.2,
    reviews: 45,
    stock: 30,
    createdAt: 20261002,
    icon: 'nutrition',
    tint: '#DCFCE7',
  },
  {
    id: 'p11',
    name: 'Thé Vert Premium (50 sachets)',
    category: 'Alimentation',
    subcategory: 'Boissons',
    price: 14,
    rating: 4.0,
    reviews: 26,
    stock: 60,
    createdAt: 20260705,
    icon: 'leaf',
    tint: '#ECFCCB',
  },
  {
    id: 'p12',
    name: 'Smartphone Android 128 Go',
    category: 'Électronique',
    subcategory: 'Téléphonie',
    price: 320,
    oldPrice: 360,
    rating: 4.5,
    reviews: 305,
    stock: 7,
    createdAt: 20260918,
    icon: 'phone-portrait',
    tint: '#CFFAFE',
  },
];

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  colorName?: string;
  colorHex?: string;
  size?: string;
  price: number;
  sku: string;
  stock: number;
  available: boolean;
  imageUrl?: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  badge?: string;
  featured: boolean;
  published: boolean;
  customisable: boolean;
  shortDescription: string;
  description: string;
  specifications: ProductSpecification[];
  customisationOptions: string;
  shippingInfo: string;
  replacementPolicy: string;
  images: ProductImage[];
  variants: ProductVariant[];
  stock: number;
  tags: string[];
  createdAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
}

export interface PositioningPillar {
  number: string;
  label: string;
  title: string;
  description: string;
  iconName: 'shield' | 'compass' | 'layers' | 'sparkles';
}

export interface SiteConfig {
  brandName: string;
  tagline: string;
  logoUrl: string;
  heroImageUrl: string;
  heroImageObjectFit: 'cover' | 'contain';
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroSubheading: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  positioningHeading: string;
  positioningSubheading: string;
  positioningPillars: PositioningPillar[];
  storyHeadingLine1: string;
  storyHeadingLine2: string;
  storyCopy: string;
  storyImage: string;
  shippingPolicyText: string;
  replacementPolicyText: string;
  privacyPolicyText: string;
  termsText: string;
  whatsappNumber: string;
  instagramHandle: string;
  contactEmail: string;
  websiteDomain: string;
  deliveryFeeInr: number;
  freeDeliveryThresholdInr: number;
  customisationFeeInr: number;
  upiDetails: {
    accountHolderName: string;
    phoneNumber: string;
  };
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  text: string;
  productName?: string;
  verifiedPurchase: boolean;
  isSamplePreview: boolean;
  approved: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  type: 'customisation' | 'contact';
  fullName: string;
  company: string;
  email: string;
  phone: string;
  productInterest: string;
  estimatedQuantity: string;
  customisationRequirements: string;
  message: string;
  status: 'new' | 'in-review' | 'quoted' | 'closed';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  items: OrderItem[];
  subtotal: number;
  customisationRequested: boolean;
  customisationFee: number;
  deliveryCharges: number;
  total: number;
  paymentMode: 'cod' | 'upi';
  paymentStatus: 'cod_pending' | 'upi_pending_verification';
  upiTransactionRef?: string;
  fulfilmentStatus: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  variantId?: string;
  variantLabel?: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  maxStock: number;
  customisable?: boolean;
}

export interface StorefrontBootstrap {
  siteConfig: SiteConfig;
  categories: Category[];
  products: Product[];
  reviews: Review[];
}

export interface SubCategory {
  id: string;
  label: string;
}

export interface ParentCategory {
  id: string;
  label: string;
  image: any;
  subCategories: SubCategory[];
}

export const PARENT_CATEGORIES: ParentCategory[] = [
  {
    id: 'femme',
    label: 'Femme',
    image: require('@/assets/images/categories/1.png'),
    subCategories: [
      { id: 'vetements-femmes', label: 'Vêtements femmes' },
      { id: 'chaussures-femmes', label: 'Chaussures femmes' },
      { id: 'accessoires-femmes', label: 'Accessoires femmes' },
      { id: 'beaute-et-soins-femmes', label: 'Beauté et soins' },
    ],
  },
  {
    id: 'homme',
    label: 'Homme',
    image: require('@/assets/images/categories/2.png'),
    subCategories: [
      { id: 'vetements-hommes', label: 'Vêtements hommes' },
      { id: 'chaussures-hommes', label: 'Chaussures hommes' },
      { id: 'accessoires-hommes', label: 'Accessoires hommes' },
      { id: 'beaute-et-soins-hommes', label: 'Beauté et soins' },
    ],
  },
  {
    id: 'enfants',
    label: 'Enfants',
    image: require('@/assets/images/categories/3.png'),
    subCategories: [
      { id: 'vetements-enfants', label: 'Vêtements enfants' },
      { id: 'chaussures-enfants', label: 'Chaussures enfants' },
      { id: 'accessoires-enfants', label: 'Accessoires enfants' },
      { id: 'beaute-et-soins-enfants', label: 'Beauté et soins' },
    ],
  },
  {
    id: 'deco-maison',
    label: 'Deco & Maison',
    image: require('@/assets/images/categories/4.png'),
    subCategories: [
      { id: 'cuisine', label: 'Cuisine' },
      { id: 'salon', label: 'Salon' },
      { id: 'veranda', label: 'Veranda' },
      { id: 'balcon', label: 'Balcon' },
    ],
  },
];

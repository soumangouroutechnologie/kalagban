export interface SubCategory {
  id: string;
  label: string;
}

export interface ParentCategory {
  id: string;
  label: string;
  subCategories: SubCategory[];
}

export const CATEGORY_TREE: ParentCategory[] = [
  {
    id: 'femme',
    label: 'Femme',
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
    subCategories: [
      { id: 'cuisine', label: 'Cuisine' },
      { id: 'salon', label: 'Salon' },
      { id: 'veranda', label: 'Veranda' },
      { id: 'balcon', label: 'Balcon' },
    ],
  },
  {
    id: 'electronique',
    label: 'Électronique & Tech',
    subCategories: [
      { id: 'smartphones', label: 'Smartphones & Téléphones' },
      { id: 'accessoires-tech', label: 'Accessoires & Câbles' },
      { id: 'audio-ecouteurs', label: 'Audio & Écouteurs' },
      { id: 'informatique', label: 'Informatique & Tablettes' },
    ],
  },
  {
    id: 'beaute',
    label: 'Beauté & Cosmétiques',
    subCategories: [
      { id: 'parfums', label: 'Parfums & Déodorants' },
      { id: 'soins-visage', label: 'Soins Visage & Corps' },
      { id: 'maquillage', label: 'Maquillage' },
      { id: 'cheveux', label: 'Soins Capillaires & Mèches' },
    ],
  },
];

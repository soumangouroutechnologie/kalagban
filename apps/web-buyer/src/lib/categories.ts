export interface SubCategory {
  id: string;
  label: string;
}

export interface ParentCategory {
  id: string;
  label: string;
  image: string;
  subCategories: SubCategory[];
}

export const CATEGORY_TREE: ParentCategory[] = [
  {
    id: "femme",
    label: "Femme",
    image: "/1.png",
    subCategories: [
      { id: "vetements-femmes", label: "Vêtements femmes" },
      { id: "chaussures-femmes", label: "Chaussures femmes" },
      { id: "accessoires-femmes", label: "Accessoires femmes" },
      { id: "beaute-et-soins-femmes", label: "Beauté et soins" },
    ],
  },
  {
    id: "homme",
    label: "Homme",
    image: "/2.png",
    subCategories: [
      { id: "vetements-hommes", label: "Vêtements hommes" },
      { id: "chaussures-hommes", label: "Chaussures hommes" },
      { id: "accessoires-hommes", label: "Accessoires hommes" },
      { id: "beaute-et-soins-hommes", label: "Beauté et soins" },
    ],
  },
  {
    id: "enfants",
    label: "Enfants",
    image: "/3.png",
    subCategories: [
      { id: "vetements-enfants", label: "Vêtements enfants" },
      { id: "chaussures-enfants", label: "Chaussures enfants" },
      { id: "accessoires-enfants", label: "Accessoires enfants" },
      { id: "beaute-et-soins-enfants", label: "Beauté et soins" },
    ],
  },
  {
    id: "deco-maison",
    label: "Deco & Maison",
    image: "/4.png",
    subCategories: [
      { id: "cuisine", label: "Cuisine" },
      { id: "salon", label: "Salon" },
      { id: "veranda", label: "Veranda" },
      { id: "balcon", label: "Balcon" },
    ],
  },
];

export interface CategoryOption {
  id: string;
  label: string;
  parentId?: string;
  isParent?: boolean;
}

// Flat list for dropdown select boxes and simple filtering
export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { id: "all", label: "Toutes les offres" },

  // Parents
  { id: "femme", label: "Femme", isParent: true },
  { id: "vetements-femmes", label: "Vêtements femmes", parentId: "femme" },
  { id: "chaussures-femmes", label: "Chaussures femmes", parentId: "femme" },
  { id: "accessoires-femmes", label: "Accessoires femmes", parentId: "femme" },
  { id: "beaute-et-soins-femmes", label: "Beauté et soins (Femme)", parentId: "femme" },

  { id: "homme", label: "Homme", isParent: true },
  { id: "vetements-hommes", label: "Vêtements hommes", parentId: "homme" },
  { id: "chaussures-hommes", label: "Chaussures hommes", parentId: "homme" },
  { id: "accessoires-hommes", label: "Accessoires hommes", parentId: "homme" },
  { id: "beaute-et-soins-hommes", label: "Beauté et soins (Homme)", parentId: "homme" },

  { id: "enfants", label: "Enfants", isParent: true },
  { id: "vetements-enfants", label: "Vêtements enfants", parentId: "enfants" },
  { id: "chaussures-enfants", label: "Chaussures enfants", parentId: "enfants" },
  { id: "accessoires-enfants", label: "Accessoires enfants", parentId: "enfants" },
  { id: "beaute-et-soins-enfants", label: "Beauté et soins (Enfant)", parentId: "enfants" },

  { id: "deco-maison", label: "Deco & Maison", isParent: true },
  { id: "cuisine", label: "Cuisine", parentId: "deco-maison" },
  { id: "salon", label: "Salon", parentId: "deco-maison" },
  { id: "veranda", label: "Veranda", parentId: "deco-maison" },
  { id: "balcon", label: "Balcon", parentId: "deco-maison" },
];

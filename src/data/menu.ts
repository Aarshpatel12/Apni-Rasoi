export type MenuItem = {
  id: string;
  name: string;
  price: number | { half: number; full: number };
  category: "Main Course" | "Appetizers" | "Drinks";
  description?: string;
  image: string;
  hasVariants?: boolean;
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "m1",
    name: "Veg Burger",
    price: 100,
    category: "Main Course",
    image: "/images/veg_burger.png",
  },
  {
    id: "m2",
    name: "Cheese Burger",
    price: 120,
    category: "Main Course",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400&h=300",
  },
  {
    id: "m3",
    name: "Paneer Burger",
    price: 150,
    category: "Main Course",
    image: "/images/paneer_burger.png",
  },
  {
    id: "m4",
    name: "Pasta",
    price: { half: 80, full: 150 },
    category: "Main Course",
    hasVariants: true,
    image: "/images/pasta.png",
  },
  {
    id: "m5",
    name: "Hakka Noodles",
    price: { half: 90, full: 170 },
    category: "Main Course",
    hasVariants: true,
    image: "/images/hakka_noodles.png",
  },
  {
    id: "m6",
    name: "White Sauce Pasta",
    price: { half: 100, full: 200 },
    category: "Main Course",
    hasVariants: true,
    image: "/images/white_sauce_pasta.png",
  },
  {
    id: "a1",
    name: "French Fries",
    price: 50,
    category: "Appetizers",
    image: "/images/french_fries.png",
  },
  {
    id: "a2",
    name: "Samosa",
    price: 15,
    category: "Appetizers",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=400&h=300",
  },
  {
    id: "a3",
    name: "Pizza Samosa",
    price: 25,
    category: "Appetizers",
    image: "/images/pizza_samosa.png",
  },
  {
    id: "a4",
    name: "Dahi k sholay [6pcs]",
    price: 160,
    category: "Appetizers",
    image: "/images/dahi_k_sholay.png",
  },
  {
    id: "a5",
    name: "Vada Pao",
    price: 40,
    category: "Appetizers",
    image: "/images/vada_pao.png",
  },
  {
    id: "d1",
    name: "Masala Chaas",
    price: 20,
    category: "Drinks",
    description: "300ML",
    image: "/images/masala_chaas.png",
  },
  {
    id: "d2",
    name: "Dry fruit Lassi",
    price: 60,
    category: "Drinks",
    description: "300ML",
    image: "/images/dry_fruit_lassi.png",
  },
  {
    id: "d3",
    name: "Lassi",
    price: 40,
    category: "Drinks",
    description: "300ML",
    image: "/images/lassi.png",
  },
  {
    id: "d4",
    name: "Aam Panna",
    price: 50,
    category: "Drinks",
    description: "300ML",
    image: "/images/aam_panna.png",
  },
  {
    id: "d5",
    name: "Lemon Soda",
    price: 60,
    category: "Drinks",
    description: "300ML",
    image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400&h=300",
  },
  {
    id: "d6",
    name: "Cold Coffee",
    price: 90,
    category: "Drinks",
    description: "300ML",
    image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=400&h=300",
  },
];

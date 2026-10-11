export interface MenuItem {
  id: string;
  name: string;
  category: 'Espresso' | 'Brewed' | 'Cold' | 'Tea' | 'Bites';
  price: number; // INR
  tags: string[]; // e.g. 'hot','iced','sweet','strong','dairy-free','vegan'
  desc: string;
  emoji: string;
  prepMins: number;
  popular?: boolean;
}

/** Seed menu — mirrored into Cloud SQL on first boot; admin can edit live. */
export const MENU: MenuItem[] = [
  { id: 'm1', name: 'Signature Flat White', category: 'Espresso', price: 220, tags: ['hot', 'dairy', 'balanced'], desc: 'Double ristretto, silky micro-foam. Our house pour.', emoji: '☕', prepMins: 4, popular: true },
  { id: 'm2', name: 'Caramel Cloud Latte', category: 'Espresso', price: 260, tags: ['hot', 'sweet', 'dairy'], desc: 'Slow-cooked caramel, airy steamed milk, sea salt.', emoji: '🍮', prepMins: 5, popular: true },
  { id: 'm3', name: 'Cortado', category: 'Espresso', price: 190, tags: ['hot', 'strong', 'dairy'], desc: 'Equal parts espresso and warm milk. Bold, not bitter.', emoji: '☕', prepMins: 3 },
  { id: 'm4', name: 'Pour-Over Single Origin', category: 'Brewed', price: 240, tags: ['hot', 'black', 'vegan', 'fruity'], desc: 'Ethiopia Yirgacheffe — jasmine, stone fruit, tea-like.', emoji: '🫖', prepMins: 6, popular: true },
  { id: 'm5', name: 'Cold Brew Reserve', category: 'Cold', price: 250, tags: ['iced', 'black', 'strong', 'vegan'], desc: '18-hour steep. Smooth, chocolatey, low-acid.', emoji: '🧊', prepMins: 2, popular: true },
  { id: 'm6', name: 'Iced Hazelnut Shaken', category: 'Cold', price: 270, tags: ['iced', 'sweet', 'dairy'], desc: 'Shaken espresso, toasted hazelnut, oat or dairy milk.', emoji: '🥤', prepMins: 3 },
  { id: 'm7', name: 'Matcha Latte', category: 'Tea', price: 280, tags: ['hot', 'iced', 'sweet', 'vegan', 'dairy-free'], desc: 'Ceremonial-grade matcha, oat milk, light honey.', emoji: '🍵', prepMins: 4 },
  { id: 'm8', name: 'Masala Chai', category: 'Tea', price: 160, tags: ['hot', 'spiced', 'dairy'], desc: 'Hand-ground spices, Assam black tea, slow-simmered.', emoji: '🫖', prepMins: 5, popular: true },
  { id: 'm9', name: 'Almond Croissant', category: 'Bites', price: 180, tags: ['sweet', 'bake'], desc: 'Butter-laminated, almond frangipane, toasted flakes.', emoji: '🥐', prepMins: 1 },
  { id: 'm10', name: 'Dark Choc Cookie', category: 'Bites', price: 120, tags: ['sweet', 'vegan', 'bake'], desc: '70% cocoa, sea salt, gooey centre. Vegan.', emoji: '🍪', prepMins: 1 },
  { id: 'm11', name: 'Affogato', category: 'Cold', price: 230, tags: ['sweet', 'dairy', 'dessert'], desc: 'Vanilla bean gelato drowned in a hot espresso shot.', emoji: '🍨', prepMins: 2 },
  { id: 'm12', name: 'Spanish Latte', category: 'Espresso', price: 250, tags: ['hot', 'sweet', 'dairy'], desc: 'Condensed milk, espresso, a whisper of cinnamon.', emoji: '☕', prepMins: 4 },
];

export const CATEGORIES = ['All', 'Espresso', 'Brewed', 'Cold', 'Tea', 'Bites'] as const;

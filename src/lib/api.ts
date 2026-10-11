// REST bridge to the Cloud Run server (Express + Cloud SQL + Vertex agents).
const j = (r: Response) => r.json();

export interface User { id: string; email: string; name: string; role: 'visitor' | 'owner' | 'host'; }
export interface Order { id: string; customer_name: string; order_no?: string; table_no?: string; interests?: string; status: string; channel: string; total: number; eta_mins: number; created_at: string; items: { name: string; qty: number }[]; }
export interface EventReq { id: string; host_name: string; host_email: string; title: string; event_date: string; floor: number; guests: number; notes: string; status: string; created_at: string; }
export interface Review { id: string; customer_name: string; rating: number; text: string; sentiment: string; created_at: string; }
export interface Sentiment { score: number; mood: string; summary: string; tips: string[]; }

export const api = {
  menu: () => fetch('/api/menu').then(j),
  login: (email: string, password: string) => fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || 'Login failed'); return r.json(); }),
  register: (body: any) => fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new Error((await r.json()).error || 'Sign up failed'); return r.json(); }),
  placeOrder: (customerName: string, items: { itemId: string; qty: number }[], channel = 'manual', userId?: string, tableNo?: string) => fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName, items, channel, userId, tableNo }) }).then(j),
  orders: (): Promise<Order[]> => fetch('/api/orders').then(j),
  myOrders: (userId: string): Promise<Order[]> => fetch('/api/myorders?userId=' + encodeURIComponent(userId)).then(j),
  myEvents: (email: string): Promise<EventReq[]> => fetch('/api/myevents?email=' + encodeURIComponent(email)).then(j),
  setOrderStatus: (id: string, status: string) => fetch(`/api/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(j),
  reviews: (): Promise<Review[]> => fetch('/api/reviews').then(j),
  addReview: (customerName: string, rating: number, text: string) => fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName, rating, text }) }).then(j),
  sentiment: (): Promise<Sentiment> => fetch('/api/admin/sentiment').then(j),
  events: (): Promise<EventReq[]> => fetch('/api/events').then(j),
  addEvent: (body: any) => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(j),
  setEventStatus: (id: string, status: string) => fetch(`/api/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(j),
  subscribe: (email: string) => fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).then(j),
};

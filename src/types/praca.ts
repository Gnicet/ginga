export const tribes = [
  "Roda de Samba & Música",
  "Comida de Boteco",
  "Humor & Causos",
  "Arte & Rua",
  "Café & Código",
] as const;
export type Tribe = (typeof tribes)[number];
export const papers = {
  creme: "Creme",
  azul: "Azul-Azulejo",
  sol: "Amarelo-Sol",
  rosa: "Rosa-Pitanga",
} as const;
export type Paper = keyof typeof papers;
export const stickers = {
  salve: "✌️ Salve!",
  palmas: "👏 Mandou bem!",
  rachei: "🤣 Rachei!",
  brabo: "🔥 Brabo!",
} as const;
export type Sticker = keyof typeof stickers;
export type Media =
  | { kind: "visual"; image: string; alt: string }
  | { kind: "voz"; audio: string }
  | { kind: "enquete"; options: string[]; counts: number[]; vote?: number };
export interface Note {
  owner?: string;
  id: string;
  name: string;
  text: string;
  audio?: string;
}
export interface Card {
  owner?: string | null;
  id: string;
  author: string;
  mine?: boolean;
  shared?: boolean;
  title: string;
  city: string;
  tribe: Tribe;
  paper: Paper;
  media: Media;
  track: number;
  notes: Note[];
  counts: Partial<Record<Sticker, number>>;
  sticker?: Sticker;
}
export interface Profile {
  name: string;
  city: string;
  track: number;
  visited: string[];
}
export interface Plaza {
  cards: Card[];
  saved: string[];
  profile: Profile;
  night: boolean;
}
export interface Guest {
  owner?: string;
  id: string;
  name: string;
}
export interface RoomEvent {
  owner?: string;
  id: string;
  name: string;
  text: string;
  audio?: string;
  reaction?: string;
}
export interface RoomSnapshot {
  visibleIds?: string[];
  guests: Guest[];
  messages: RoomEvent[];
}
export interface Friendship {
  id: string;
  name: string;
  link: string;
  status: "amigo" | "enviado" | "recebido";
}

import type { Card, Plaza } from "../types/praca";
import cards from "./postais.json";
export const tracks = ["Samba de domingo", "Brisa da Bahia", "Baião da feira"];
export const trackUrl = (index: number) => "/audio/trilha" + index + ".wav";
export const rooms = [
  {
    id: "cafe",
    name: "Café & Código BR",
    icon: "☕",
    topic: "Qual foi o bug que te fez levantar e passar um café?",
    hosts: ["Lia", "Davi", "Iara"],
    paper: "sol",
  },
  {
    id: "bola",
    name: "Resenha da Rodada",
    icon: "⚽",
    topic: "Qual gol do seu time você ainda sabe narrar?",
    hosts: ["Zeca", "Bel"],
    paper: "creme",
  },
  {
    id: "som",
    name: "Som Nacional",
    icon: "🎶",
    topic: "Que disco você levaria para uma ilha?",
    hosts: ["Cida", "Téo", "Sol"],
    paper: "azul",
  },
  {
    id: "causos",
    name: "Perrengues do Dia",
    icon: "🚌",
    topic: "Conta o seu causo que a gente divide a risada.",
    hosts: ["Nina", "Beto"],
    paper: "rosa",
  },
] as const;
export const seed: Plaza = {
  profile: { name: "Genilson", city: "Salvador • BA", track: 0, visited: [] },
  night: false,
  saved: [],
  cards: cards as Card[],
};

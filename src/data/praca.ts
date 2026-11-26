import {
  tribes,
  type Card,
  type Media,
  type Paper,
  type Plaza,
} from "../types/praca";
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
const visual = (image: string, alt: string): Media => ({
  kind: "visual",
  image,
  alt,
});
const poll = (options: string[], counts: number[]): Media => ({
  kind: "enquete",
  options,
  counts,
});
const voice = (audio: string): Media => ({
  kind: "voz",
  audio: "/audio/" + audio + ".wav",
});
function card(
  id: string,
  title: string,
  city: string,
  author: string,
  tribe: number,
  paper: Paper,
  media: Media,
  note: string,
): Card {
  return {
    id,
    title,
    city,
    author,
    tribe: tribes[tribe],
    paper,
    media,
    track: tribe % 3,
    counts: { salve: 7 + id.length, brabo: 3 },
    notes: [{ id: id + "-bilhete", name: "Lia", text: note }],
  };
}
export const seed: Plaza = {
  profile: { name: "Genilson", city: "Salvador • BA", track: 0, visited: [] },
  night: false,
  saved: [],
  cards: [
    card(
      "barra",
      "Quando a Barra vira cartão-postal",
      "Salvador • BA",
      "Bia Oliveira",
      3,
      "creme",
      visual("/barra.svg", "Gravura do Farol da Barra ao entardecer"),
      "Essa luz da Bahia eu reconheço de longe.",
    ),
    card(
      "feira",
      "O segredo do pastel da feira",
      "Recife • PE",
      "Cida Alves",
      1,
      "azul",
      voice("feira"),
      "Pimenta da casa, sempre!",
    ),
    card(
      "cafe-da-tarde",
      "Pão de queijo ou cuscuz no café da tarde?",
      "Belo Horizonte • MG",
      "Zeca Reis",
      1,
      "sol",
      poll(["Pão de queijo", "Cuscuz"], [32, 28]),
      "Aqui em casa tem lugar pros dois.",
    ),
    card(
      "rio",
      "O Rio visto lá de cima",
      "Rio de Janeiro • RJ",
      "Léo Luz",
      3,
      "creme",
      visual(
        "/media/rio.jpg",
        "Vista panorâmica das montanhas e da baía do Rio de Janeiro",
      ),
      "Essa vista merece virar gravura.",
    ),
    {
      ...card(
        "coado",
        "Primeiro o coado. Depois o código.",
        "Salvador • BA",
        "Genilson",
        4,
        "creme",
        visual("/media/cafe.jpg", "Fotografia de café recém-preparado"),
        "Assim começa todo projeto por aqui.",
      ),
      mine: true,
    },
    card(
      "onibus",
      "Peguei o ônibus errado. E agora?",
      "São Paulo • SP",
      "Nina Sá",
      2,
      "rosa",
      voice("causo"),
      "Pelo menos foi com vista!",
    ),
    card(
      "samba",
      "Quem puxa a primeira na roda de domingo?",
      "Olinda • PE",
      "Téo Silva",
      0,
      "sol",
      poll(["Clara Nunes", "Cartola", "Dona Ivone Lara"], [12, 9, 14]),
      "Na dúvida, toca os três.",
    ),
    card(
      "azulejo",
      "Um jardim de azulejos na parede",
      "São Luís • MA",
      "Sol Barbosa",
      3,
      "creme",
      visual(
        "/azulejo.svg",
        "Composição original de azulejos florais em azul-cobalto",
      ),
      "Minha avó tinha uma parede assim.",
    ),
  ],
};

export interface MovieSlide {
  id: string;
  rating: string;
  releaseDate: string;
  title: string;
  description: string;
  videoUrl: string;
}

export const MOVIE_SLIDES: MovieSlide[] = [
  {
    id: "volleyball-passion",
    rating: "9.5/10 Hobby",
    releaseDate: "June, 2026",
    title: "Volleyball: The Golden Spike",
    description: "12 настай Сайханбилэгийн дуртай спорт болох волейболын хүч чадал, багийн тоглолт, ялалтын төлөөх тэмүүлэл.",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
  },
  {
    id: "roblox",
    rating: "10/10 Favorite Game",
    releaseDate: "June, 2026",
    title: "Roblox: Infinite Worlds",
    description: "Сайханбилэгийн хамгийн дуртай тоглоом! Төгсгөлгүй олон сонирхолтой ертөнцөөр аялж, өөрийн хүссэн тоглоомыг бүтээн найзуудтайгаа хамт тоглох боломжтой платформ.",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
  },
  {
    id: "standoff",
    rating: "9.8/10 Action Shooter",
    releaseDate: "June, 2026",
    title: "Standoff: Tactical Battle",
    description: "Сайханбилэгийн дуртай тактикийн буудалт тоглоом! Өндөр ур чадвар, багаараа хамтран ажиллах тактик болон хурдан хариу үйлдэл шаардсан гайхалтай тоглоом.",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_094145_4a271a6c-3869-4f1c-8aa7-aeb0cb227994.mp4"
  }
];

export const NAV_LINKS = [
  { label: "Editor's Pick", href: "#editors-pick" },
  { label: "User Reviews", href: "#user-reviews" }
];

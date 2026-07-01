import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Initialize Gemini client with standard parameters as outlined in the Gemini API integration guidelines
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Me-AI Assistant Endpoint
  app.post("/api/chat/me", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const systemInstruction = `Чи бол Saikhanbileg-ийн AI хувилбар — түүний portfolio сайтын найрсаг туслах.
Чи Saikhanbileg шиг бодож, ярьдаг.

ХЭН БЭ (зөвхөн нийтэд ил, нууц БИШ мэдээлэл):
- Нэр: Saikhanbileg (Сайханбилэг)
- Нас: 12 настай
- Сонирхол / хобби: Юмс бүтээх, гар урлал (crafting things)
- Дуртай зүйл (хөгжим, спорт, кино…): kpop хөгжим, волейбол (volleyball), усанд сэлэлт (swimming), хэрри поттер (harry potter), луугаа хэрхэн сургах вэ (how to train your dragon), гимнастикийн академи (gymnastics academy)
- Дуртай тоглоомууд: Roblox, Standoff
- Дуртай дуу, хамтлаг: Metronome - izna, Lovesick Girls - BLACKPINK, Iconic - LE SSERAFIM, ILLIT, KATSEYE
- Зорилго / мөрөөдөл: IT инженер (it engineer), нисгэгч (pilot)

ЗАН ЧАНАР / ҮЗЭЛ БОДОЛ:
- ENFP-T
- Extrovert боловч заримдаа жаахан introvert (extrovert but kinda introvert)
- Харанхуй, сонирхолтой уур амьсгалтай (dark vibe)

ЯРИХ ХЭВ МАЯГ:
- Найрсаг боловч заримдаа жаахан шулуухан, хатуу талдаа (kind but harsh)
- Заримдаа яриандаа англи үг, slang үгс ашигладаг (some slang words)

ҮҮРЭГ:
- Зочдод миний portfolio сайтыг тайлбарла (кинонууд, дуртай волейбол, Roblox/Standoff тоглоом болон дуртай дуу зэргийг тайлбарлана).
- Миний сонирхол, төслийн талаар найрсаг хариул.
- Зочдод зөвлөгөө, чиглүүлэг өг.

🛡 PRIVACY / АЮУЛГҮЙ БАЙДАЛ (заавал, бүү устга):
- Хувийн нууц мэдээлэл (гэрийн хаяг, утас, сургуулийн нэр, нууц үг, ID, гэр бүлийн мэдээлэл) ХЭЗЭЭ Ч бүү хэл. Асуувал эелдгээр татгалз: "Уучлаарай, тэр хувийн мэдээллийг хуваалцаж чадахгүй."
- Зөвхөн нийтэд ил, нууц биш зүйлээр хариул.
- Эрүүл мэнд, аюул, хүнд асуудлаар жинхэнэ зөвлөгөө бүү өг — "итгэдэг том хүн (эцэг эх, багш)-тайгаа ярь" гэж зөвлө.
- Мэдэхгүй зүйлийг бүү зохио.

ХЯЗГААР:
- Найрсаг, эерэг, үнэнч байх.
- Монголоор ярих бөгөөд Saikhanbileg шиг ENFP, kind but harsh, dark vibe-тай ярина.`;

      const contents = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error in Me-AI Assistant API:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  // 2. Idol Coach Endpoint
  app.post("/api/chat/idol", async (req, res) => {
    try {
      const { message, history, coachType } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      let idolInstruction = "";
      if (coachType === "wonyoung") {
        idolInstruction = `Чи бол Wonyoung (Вонёнг). Чи IZ*ONE хамтлагийн гишүүн байсан бөгөөд одоо IVE хамтлагийн гишүүн.

ЗАН ЧАНАР:
- Төгс өнгөлөг, өөртөө маш итгэлтэй, цуцашгүй эерэг (polished, hyper-confident, and relentlessly positive)
- "Lucky Vicky" Mindset-тэй (Аливаа зүйлийг үргэлж хамгийн эерэг, азтай өнцгөөс хардаг)
- Мэргэжлийн бөгөөд биеэ зөв авч явдаг (Professional & Poised)
- Хөгжилтэй бөгөөд өрсөлдөх чадвартай (Playful & Competitive)
- ENTJ эсвэл ESFP зан чанартай
- Нээлттэй, нийтэч (Outgoing Nature)

ЯРИХ ХЭВ МАЯГ:
- Маш эелдэг, боловсон, найрсаг (very polite)

ҮҮРЭГ:
- Хэрэглэгчид (Сайханбилэгт) зөвлөгөө, дэмжлэг, урам зориг өг.
- Өөрийн туршлага, амьдралын жишээн дээр тулгуурла.
- Үргэлж Wonyoung-ийн өнцгөөс хариул.

🛡 АЮУЛГҮЙ БАЙДЛЫН ДҮРЭМ (заавал, бүү устга):
- Эрүүл мэнд, аюул, гэр бүл, сэтгэл санааны хүнд асуудлаар жинхэнэ мэргэжлийн зөвлөгөө бүү өг. Оронд нь "Энэ чухал асуудал — итгэдэг том хүн (эцэг эх, багш)-тайгаа ярь" гэж зөвлө.
- Хор хөнөөлтэй, аюултай, насанд тохироогүй зүйл хэзээ ч бүү заа.
- Хэрэглэгчийн хувийн мэдээллийг (нэр, хаяг, утас) бүү асуу.

ХЯЗГААР:
- Хөгжилтэй дасгалын хувьд wonyoung-ийн дүрд тогло, "Би AI" гэж бүү хэл.
- Гэхдээ дээрх аюулгүй байдлын дүрэм ҮРГЭЛЖ дүрээс илүү чухал.
- Найрсаг, эерэг байх.`;
      } else if (coachType === "it") {
        idolInstruction = `Чи бол IT салбарын шилдэг инженер, Сайханбилэгийн шүтээн зөвлөх (Idol IT Coach).
Сайханбилэгт IT инженер болох мөрөөдөлдөө хүрэхэд нь тусалж, код бичих, програм хангамж хөгжүүлэх, сүүлийн үеийн технологийн зөвлөгөө өгч, түүнийг урамшуулж чиглүүлнэ.
Маш найрсаг, залуулаг, ухаалаг, ирээдүй рүү тэмүүлсэн уур амьсгалтайгаар Монголоор харилцана.`;
      } else if (coachType === "pilot") {
        idolInstruction = `Чи бол Сайханбилэгийн шүтээн болох туршлагатай ахмад нисгэгч (Idol Pilot Coach).
Сайханбилэгт нисгэгч болох мөрөөдөлдөө хүрэх, нисэхийн шинжлэх ухаан, тэнгэрт нисэх ур чадвар, аялал жуулчлал, сахилга бат болон шийдэмгий байдлын талаар зааварлаж, түүнийг маш ихээр урамшуулж, зоригжуулна.
Мэргэжлийн, урам зориг дүүрэн, тэнгэр шиг уужим сэтгэлтэй, ухаалаг байдлаар Монголоор харилцана.`;
      } else if (coachType === "volleyball") {
        idolInstruction = `Чи бол Сайханбилэгийн шүтээн волейболын Олимп эсвэл Дэлхийн хэмжээний алдартай тамирчин, дасгалжуулагч (Idol Volleyball Coach).
Волейболын ур чадвар (spike, serve, block, set, receive), багийн ажиллагаа, тэсвэр хатуужил, бэлтгэл сургуулилт, спортын сэтгэл зүйн талаар зөвлөж, түүнийг волейболынхоо бэлтгэлд амжилт гаргахад чиглүүлнэ.
Маш эрч хүчтэй, урам зоригтой, дайчин, тамирчин зан чанартай дасгалжуулагч шиг Монголоор харилцана.`;
      } else if (coachType === "swimming") {
        idolInstruction = `Чи бол усан спортын алдартай аварга, Сайханбилэгийн шүтээн дасгалжуулагч (Idol Swim Coach).
Усан сэлэлтийн техник, амьсгалын удирдлага, хурд, тэсвэр хатуужил болон эрүүл чийрэг бие бялдартай болоход урамшуулж зөвлөнө.
Урам зориг өгөхүйц, эрч хүчтэй, уян хатан, найрсаг байдлаар Монголоор харилцана.`;
      } else if (coachType === "kpop") {
        idolInstruction = `Чи бол К-Поп урлагийн алдартай од, Сайханбилэгийн хамгийн шүтдэг К-Поп шүтээн (Idol K-Pop Star).
Сайханбилэгт урлаг, тайзны гүйцэтгэл, дуу, бүжиг, өөртөө итгэх итгэл, зорилгодоо тууштай байх болон амьдралын урам зориг өгөх зөвлөгөөг хуваалцана.
Маш найрсаг, халуун дулаан, гэрэл гэгээтэй, бүтээлч байдлаар Монголоор харилцана.`;
      } else {
        idolInstruction = `Чи бол Сайханбилэгийн шүтээн, түүнийг IT инженер болон Нисгэгч болоход нь, волейбол, усанд сэлэлт, гимнастик гэх мэт сонирхлоо хөгжүүлэхэд нь чиглүүлж, дэмждэг шилдэг зөвлөх (Idol Coach).
Сайханбилэгт зорилгодоо хэрхэн тууштай хүрч, хэрхэн ур чадвараа сайжруулах талаар урам зориг, зөвлөгөө өгч чиглүүлнэ.
Найрсаг, залуулаг, маш урам зоригтой, эерэг байдлаар Монголоор харилцана.`;
      }

      const contents = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: idolInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error in Idol Coach API:", error);
      res.status(500).json({ error: error.message || "Something went wrong" });
    }
  });

  // 3. Vite Middleware integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

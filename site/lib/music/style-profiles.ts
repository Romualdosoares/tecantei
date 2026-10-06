import type { VoicePreference } from "../order-options.ts";
import type { KieModel } from "./kie-client.ts";

type StyleProfile = {
  arrangement: string;
  lyricGuide: string;
  negativeTags: string;
  custom: boolean;
};

const profiles: Record<string, Omit<StyleProfile, "custom">> = {
  "Sertanejo Universitário": {
    arrangement: "Brazilian sertanejo universitario, 108-124 BPM, rhythmic acoustic guitars, accordion, warm bass, live drums, upbeat two-step groove, melodic lead vocals, memorable singalong chorus.",
    lyricGuide: "Use linguagem brasileira cotidiana, versos cantáveis de extensão regular e refrão direto e memorável. A energia é festiva, mas os fatos e a emoção vêm do briefing.",
    negativeTags: "trap beat, baile funk beat, heavy metal, EDM drop",
  },
  "Sertanejo romântico": {
    arrangement: "Brazilian romantic sertanejo, 72-92 BPM, acoustic guitar and viola caipira, restrained accordion, warm bass, gentle live drums, expressive melodic singing, intimate verses and an emotional chorus.",
    lyricGuide: "Escreva versos melódicos com espaço para sustentar vogais e um refrão emocional crescente. Use imagens concretas da história e evite transformar toda frase em uma declaração genérica.",
    negativeTags: "trap beat, baile funk beat, EDM drop, aggressive shouting",
  },
  Piseiro: {
    arrangement: "Brazilian piseiro / pisadinha, 150-165 BPM, signature syncopated electronic keyboard riff, dry danceable kick and snare, punchy bass, northeastern Brazilian groove, short catchy sung hooks.",
    lyricGuide: "Use frases curtas, rimas simples e naturais, pulsação de dança e refrão fácil de repetir. Preserve a identidade do piseiro, sem copiar bordões ou inventar sotaque para o destinatário.",
    negativeTags: "slow piano ballad, orchestral soundtrack, swing jazz, heavy metal",
  },
  "Pagode animado": {
    arrangement: "Brazilian upbeat pagode, 100-116 BPM, cavaquinho, nylon-string guitar, tantan, pandeiro and repique de mao, syncopated samba swing, lively sung lead, tasteful backing-vocal responses.",
    lyricGuide: "Use cadência sincopada de samba/pagode, versos leves, balanço e refrão coletivo marcante. Deixe respiros para respostas vocais sem diluir os detalhes reais do briefing.",
    negativeTags: "trap beat, four-on-the-floor EDM, baile funk beat, country twang",
  },
  "Pagode romântico": {
    arrangement: "Brazilian romantic pagode, 78-96 BPM, cavaquinho, warm nylon-string guitar, tantan, pandeiro and soft repique de mao, relaxed syncopated samba swing, expressive singing, intimate melodic chorus.",
    lyricGuide: "Escreva com balanço sincopado, versos conversados que continuem cantáveis e refrão sentimental. Use rimas naturais e pausas; evite um texto de balada pop sem cadência de pagode.",
    negativeTags: "trap beat, EDM drop, baile funk beat, distorted rock guitars",
  },
  Funk: {
    arrangement: "Brazilian baile funk, 130-150 BPM, tamborzao percussion, dry electronic kick and snare, strong sub-bass, rhythmic Brazilian Portuguese lead vocal, short percussive phrases and a catchy repeated hook.",
    lyricGuide: "Use frases curtas e percussivas, encaixe forte na batida, flow brasileiro e refrão curto. Não acrescente palavrões, sexualização ou violência que não fazem parte da história aprovada.",
    negativeTags: "slow acoustic ballad, country twang, swing jazz, orchestral soundtrack",
  },
  "Funk ostentação": {
    arrangement: "Brazilian funk ostentacao, 130-150 BPM, punchy tamborzao rhythm, clean electronic drums, strong sub-bass and bright synth accents, confident rhythmic lead vocals, bold memorable hook.",
    lyricGuide: "Use flow confiante, frases rítmicas curtas e refrão de conquista. Valorize a trajetória informada; não invente riqueza, marcas, posses, crimes ou acontecimentos para criar ostentação.",
    negativeTags: "slow piano ballad, country twang, swing jazz, orchestral soundtrack",
  },
  Funknejo: {
    arrangement: "Brazilian funknejo, intentional fusion of sertanejo melodic singing and acoustic guitar/accordion with baile funk tamborzao drums and sub-bass, 125-140 BPM, danceable groove and a strong sung chorus.",
    lyricGuide: "Combine versos rítmicos de funk com refrão melódico de sertanejo. A fusão deve ser deliberada, cantável e fiel aos fatos, sem virar trap ou uma balada acústica pura.",
    negativeTags: "trap-only beat, heavy metal, swing jazz, orchestral soundtrack",
  },
  Acústico: {
    arrangement: "Intimate acoustic song, 70-94 BPM, fingerpicked or gently strummed acoustic guitar, subtle acoustic bass and brushed percussion, natural expressive lead vocals, organic room ambience, restrained arrangement.",
    lyricGuide: "Use versos com respiros, imagens pessoais e vocabulário íntimo. Prefira frases que possam ser cantadas sobre violão, com refrão simples e dinâmica delicada, sem exagero de palavras.",
    negativeTags: "electronic drums, EDM drop, heavy distortion, aggressive autotune, trap beat",
  },
  Gospel: {
    arrangement: "Brazilian contemporary gospel / worship, 70-92 BPM, warm piano, acoustic guitar, organ textures, restrained live drums, expressive sung lead and tasteful choir harmonies, uplifting melodic chorus.",
    lyricGuide: "Use linguagem respeitosa de fé, gratidão e esperança, com refrão cantável de louvor. Preserve a história; não invente milagres, promessas divinas, citações bíblicas ou crenças pessoais.",
    negativeTags: "baile funk beat, trap beat, profane lyrics, aggressive screaming, EDM drop",
  },
  Pop: {
    arrangement: "Contemporary Brazilian pop, 100-120 BPM, polished tight drums, melodic bass, bright guitars and tasteful synths, clear melodic lead vocals, concise verses, a strong pre-chorus lift and an infectious chorus.",
    lyricGuide: "Use versos concisos, pré-refrão que cria expectativa e refrão com uma frase central memorável. Varie imagens e rimas mantendo prosódia natural e uma melodia fácil de acompanhar.",
    negativeTags: "heavy metal, trap-only beat, country twang, experimental atonal vocals",
  },
  "Pop romântico": {
    arrangement: "Brazilian romantic pop ballad, 72-94 BPM, warm piano and acoustic guitar, melodic bass, restrained pop drums, subtle strings, intimate lead singing, gradual dynamic build into a memorable emotional chorus.",
    lyricGuide: "Construa versos íntimos, pré-refrão crescente e refrão emocional memorável. Use detalhes da relação informada, rimas discretas e vogais sustentáveis, sem clichês repetidos.",
    negativeTags: "baile funk beat, trap beat, aggressive shouting, EDM drop",
  },
  MPB: {
    arrangement: "Brazilian MPB, 76-104 BPM, expressive nylon-string guitar, rich Brazilian harmonies, subtle piano, warm acoustic bass, understated syncopated percussion, natural nuanced sung lead, organic production.",
    lyricGuide: "Use imagens poéticas concretas, rimas discretas e prosódia brasileira fluida. Varie o tamanho dos versos com intenção musical, mantendo unidade e evitando frases burocráticas ou rimas forçadas.",
    negativeTags: "trap beat, baile funk beat, EDM drop, aggressive autotune",
  },
  Romântico: {
    arrangement: "Romantic Brazilian melodic ballad, 68-88 BPM, intimate piano and acoustic guitar, warm bass, delicate percussion and subtle strings, tender expressive lead singing, emotional memorable chorus.",
    lyricGuide: "Use narrativa íntima e imagens da história, frases melódicas com respiros e refrão emocional. Não mude relações familiares ou de amizade para um romance que o cliente não informou.",
    negativeTags: "trap beat, baile funk beat, aggressive shouting, EDM drop",
  },
  Motivacional: {
    arrangement: "Uplifting Brazilian pop anthem, 96-116 BPM, rhythmic guitars, warm piano, steady live drums and bass, inspiring melodic lead singing, hopeful build and a confident singalong chorus.",
    lyricGuide: "Conte a trajetória com obstáculos e conquistas realmente informados. Use frases afirmativas, imagens concretas e refrão de coragem cantável; evite listas de slogans e promessas vazias.",
    negativeTags: "dark trap beat, sad slow lament, aggressive screaming, experimental atonal vocals",
  },
  "Motivacional impactante": {
    arrangement: "Powerful uplifting Brazilian pop-rock anthem, 108-128 BPM, driving live drums, strong bass, rhythmic guitars, cinematic percussion and restrained strings, bold melodic lead vocals, dramatic build and triumphant chorus.",
    lyricGuide: "Use versos de tensão e superação ancorados na história, frases fortes e refrão de impacto. Crie contraste dinâmico, sem gritos constantes, fatos inventados ou uma coleção de slogans.",
    negativeTags: "sleepy lo-fi, sad slow lament, death metal growls, experimental atonal vocals",
  },
  Trap: {
    arrangement: "Brazilian melodic trap, 130-150 BPM with half-time feel, deep tuned 808 bass, crisp syncopated hi-hats and sparse snare/clap, atmospheric synths, rhythmic rap verses, melodic hook, intentional flow and breath pockets.",
    lyricGuide: "Use flow de trap, versos rítmicos curtos com rimas internas e pausas de respiração; combine-os com hook melódico curto. Não escreva todos os versos como uma balada pop nem invente crimes ou excessos.",
    negativeTags: "country twang, pagode percussion, baile funk tamborzao, swing jazz",
  },
  "Trap Gospel": {
    arrangement: "Brazilian gospel melodic trap, 130-148 BPM with half-time feel, deep tuned 808 bass, crisp hi-hats and sparse snare, warm piano and atmospheric pads, rhythmic rap verses, uplifting sung hook, clear faith-centered delivery.",
    lyricGuide: "Combine flow de trap, rimas internas e respiros com hook melódico de fé e esperança. Preserve fatos e crenças informados; não invente milagres, promessas divinas ou versos bíblicos.",
    negativeTags: "country twang, pagode percussion, baile funk tamborzao, profane lyrics, aggressive screaming",
  },
};

export function getMusicStyleProfile(style: string): StyleProfile {
  const name = style.trim();
  const key = name === "Sertanejo" ? "Sertanejo Universitário" : name === "Pagode" ? "Pagode animado" : name;
  const profile = Object.hasOwn(profiles, key) ? profiles[key] : undefined;
  if (profile) return { ...profile, custom: false };
  return {
    custom: true,
    arrangement: "Follow the customer's specified musical genre and its characteristic rhythm, instrumentation and vocal phrasing. Keep a coherent arrangement; do not substitute an unrelated genre.",
    lyricGuide: "Adapte métrica, prosódia, vocabulário, refrão e estrutura ao estilo livre informado pelo cliente. Não converta automaticamente esse estilo em pop, sertanejo ou balada romântica.",
    negativeTags: "clipping, muddy mix, unintelligible vocals, accidental genre switching",
  };
}

export class MusicAdjustmentNotesError extends Error {
  readonly maxCharacters: number;

  constructor(maxCharacters: number) {
    super(`As instruções de ajuste devem ter até ${maxCharacters} caracteres para este estilo.`);
    this.name = "MusicAdjustmentNotesError";
    this.maxCharacters = maxCharacters;
  }
}

export function buildMusicDirection(style: string, voice: VoicePreference, model: KieModel, adjustmentNotes?: string) {
  const profile = getMusicStyleProfile(style);
  const legacy = model === "V3_5" || model === "V4";
  const limit = legacy ? 200 : 1_000;
  const vocals = voice === "masculina" ? "Male" : "Female";
  const header = legacy
    ? `${style.trim()}. ${vocals} vocals, pt-BR.`
    : `${style.trim()}. ${vocals} lead vocals in Brazilian Portuguese.`;
  const direction = [
    header,
    profile.arrangement,
    "Stay in the selected genre. Original melody and expressive phrasing within this style. Clear diction, balanced studio mix, controlled dynamics, clean ending.",
  ].join(" ").slice(0, limit);
  // Reserva espaço para as notas antes de acrescentar o acabamento da produção.
  // A identidade musical e, nos modelos atuais, o arranjo permanecem completos.
  const notePrefix = " Refinements within the selected genre: ";
  const notes = adjustmentNotes?.trim();
  const essential = legacy ? header : `${header} ${profile.arrangement}`;
  const remaining = Math.max(0, limit - essential.length - notePrefix.length);
  if (notes && notes.length > remaining) throw new MusicAdjustmentNotesError(remaining);
  const noteText = notes;
  const adjustedStyle = noteText
    ? direction.slice(0, limit - notePrefix.length - noteText.length) + notePrefix + noteText
    : direction;
  return {
    style: adjustedStyle,
    vocalGender: voice === "masculina" ? "m" as const : "f" as const,
    styleWeight: 0.9,
    weirdnessConstraint: 0.3,
    variety: 0,
    negativeTags: profile.negativeTags,
  };
}

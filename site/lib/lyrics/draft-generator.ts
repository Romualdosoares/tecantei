export type LyricDraftInput = {
  occasion: string;
  recipient: string;
  pronunciation?: string;
  story: string;
  style: string;
  voicePreference?: "masculina" | "feminina";
};

const occasionLines: Record<string, string> = {
  "Esposo(a)": "Nosso amor fez do caminho um lar para compartilhar",
  "Namorado(a)": "Nosso namoro tem mil motivos para celebrar",
  Reconciliação: "O nosso amor ganhou coragem para recomeçar",
  "Noivo(a)": "O nosso sim já anuncia uma vida inteira para amar",
  "Crush/Paixão": "Essa paixão encontrou um jeito bonito de se declarar",
  "Amigo(a)": "Nossa amizade sempre sabe onde me encontrar",
  Mãe: "Teu amor de mãe é meu primeiro e eterno lugar",
  Pai: "Teu cuidado de pai sempre me ensinou a caminhar",
  "Filho(a)": "Meu amor por você cresce sem nunca se acabar",
  "Irmão(ã)": "Nosso laço de irmãos faz qualquer distância se encurtar",
  "Eu mesmo": "Minha própria história também merece celebrar",
  Outro: "Hoje esse carinho encontrou um jeito único de cantar",
  Aniversário: "Hoje a vida acende outra luz para celebrar",
  Casal: "Nosso encontro ainda escolhe o mesmo lugar",
  Família: "Nosso laço faz qualquer distância se encurtar",
  Amizade: "Nossa amizade sempre sabe onde me encontrar",
  Homenagem: "Cada lembrança traz um jeito de agradecer e cantar",
  "Pedido de Casamento": "O nosso amor deu o passo mais lindo para a vida inteira",
  "Maternidade & Bebê": "Um amor tão puro e infinito que acabou de chegar",
  "Conquista & Formatura": "Todo esforço e dedicação viraram motivo de orgulho",
  "Despedida & Saudade": "Mesmo longe, o carinho e as lembranças ficam no peito",
  Outros: "Hoje a nossa história encontrou um jeito único de cantar",
};

const styleLines: Record<string, string> = {
  "Pop romântico": "Num refrão que cresce e pede para o coração ficar",
  Pop: "Num refrão vibrante, cada memória aprende a brilhar",
  MPB: "Entre acordes mansos, cada detalhe aprende a respirar",
  Sertanejo: "Na viola da memória, cada estrada volta a nos juntar",
  "Sertanejo romântico": "Na viola apaixonada, cada estrada volta a nos juntar",
  Piseiro: "No passo do piseiro, a nossa alegria faz o chão vibrar",
  "Pagode animado": "No pagode e na alegria, todo sorriso vem sambar",
  "Pagode romântico": "No balanço do pagode, o coração aprende a se declarar",
  Funk: "Na batida envolvente, nossa história faz a noite pulsar",
  "Funk ostentação": "Na batida da conquista, nossos sonhos vão brilhar",
  Funknejo: "Entre a viola e a batida, nosso amor encontra o seu lugar",
  Acústico: "Só voz, carinho e verdade para a emoção chegar",
  Gospel: "Com fé e gratidão por tudo que nos fez caminhar",
  Romântico: "Em cada nota apaixonada, o coração escolhe ficar",
};

export function createMockLyricDraft(input: LyricDraftInput) {
  const recipient = cleanInline(input.recipient, 80);
  const moments = extractMoments(input.story);
  const firstMoment = moments[0] ?? "os pequenos momentos que guardamos com carinho";
  const secondMoment = moments[1] ?? "os sonhos que ainda queremos realizar";
  const occasionLine = occasionLines[input.occasion] ?? "Hoje a nossa história encontrou um jeito de cantar";
  const styleLine = styleLines[input.style] ?? "E cada lembrança encontra um novo jeito de soar";

  return `[Verso 1]
${recipient}, hoje eu vim te celebrar
${capitalize(firstMoment)}
Nossa história encontrou seu refrão
E virou presente nesta canção

[Pré-refrão]
Cada detalhe que o tempo guardou
Virou melodia e aqui ficou

[Refrão]
${recipient}, eu canto para lembrar
${occasionLine}
${styleLine}
É a nossa história aprendendo a ecoar

[Verso 2]
${capitalize(secondMoment)}
Há tanta vida no que a gente viveu
Se o mundo muda, fica a certeza
Do afeto bonito que o tempo escreveu

[Ponte]
Que esta canção atravesse os dias
E faça o coração reconhecer
Em cada verso, em cada harmonia
Um pouco de tudo que eu quis te dizer

[Refrão final]
${recipient}, eu canto para lembrar
${occasionLine}
${styleLine}
É a nossa história aprendendo a ecoar`;
}

function extractMoments(story: string) {
  return story
    .replace(/[\[\]{}<>]/g, "")
    .split(/[.!?;\n]+/)
    .map((part) => cleanInline(part, 92))
    .filter((part) => part.length >= 12)
    .slice(0, 2);
}

function cleanInline(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trim()}…`;
}

function capitalize(value: string) {
  return value ? `${value[0].toLocaleUpperCase("pt-BR")}${value.slice(1)}` : value;
}

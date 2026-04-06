// api/generate-ata.js
// Vercel Serverless Function — proxy para a Claude API (evita CORS)
// Variável de ambiente necessária no Vercel: ANTHROPIC_API_KEY
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { ANTHROPIC_API_KEY } = process.env;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada nas variáveis de ambiente do Vercel." });
  }

  const { transcription, title } = req.body;
  if (!transcription || transcription.trim().length < 50) {
    return res.status(400).json({ error: "Transcrição muito curta ou ausente." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: `Você é um consultor sênior da PWR Gestão com expertise em documentação de reuniões executivas. Sua tarefa é gerar uma ata estruturada a partir de uma transcrição, com alto nível de detalhe e fidelidade ao que foi discutido.

Retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem explicações, sem bloco de código.

ESTRUTURA OBRIGATÓRIA DO JSON:
{
  "participantes": [["1","Nome Completo","Empresa ou papel"]],
  "pautas": [["1","Descrição clara do tema tratado","XX min"]],
  "decisoes": [["1","Descrição detalhada da decisão ou discussão","Tomador da Decisão"]],
  "encaminhamentos": [["1","Verbo no infinitivo + descrição precisa da ação a executar","Responsável","Prazo ou A Definir"]]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO: PARTICIPANTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Identifique todos que falaram ou foram mencionados como presentes.
- Se a empresa não for mencionada, infira pelo contexto: "PWR Gestão", "cliente", "equipe interna".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO: PAUTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Liste os grandes blocos de assunto tratados na reunião.
- Estime a duração com base no volume de troca na transcrição:
  - Assunto breve, resolvido rapidamente: 5 a 10 min
  - Assunto com debate, análise ou apresentação: 15 a 30 min
  - Assunto complexo com múltiplos desdobramentos: 30 a 60 min

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO: DECISÕES E CONCLUSÕES — REGRAS CRÍTICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Esta é a seção mais importante. O nível de detalhe aqui define a qualidade da ata.

TIPO 1 — DECISÃO FORMAL:
- Descreva O QUÊ foi decidido, POR QUE foi decidido (contexto que levou à decisão) e COMO será executado (se mencionado).
- Identifique quem tomou a decisão. Se consenso, use "Todos".
- Exemplo RUIM: "Definição do prazo de entrega do relatório."
- Exemplo BOM: "Prazo de entrega do relatório financeiro definido para 15/05, considerando a necessidade de aprovação prévia pelo sócio antes do envio ao cliente. A equipe reconheceu que o prazo original (10/05) era inviável dado o volume de ajustes ainda pendentes."

TIPO 2 — DISCUSSÃO SEM DECISÃO FORMAL:
- Prefixe com [DISCUSSÃO] e deixe a coluna de tomador em branco ("").
- Descreva o CONTEÚDO REAL do debate: quais perspectivas foram levantadas, quais pontos ficaram em aberto, qual foi a posição predominante ao fim.
- Inclua contexto suficiente para que alguém que não esteve na reunião compreenda o que foi discutido.
- Exemplo RUIM: "[DISCUSSÃO] Discussão sobre o modelo de precificação da proposta."
- Exemplo BOM: "[DISCUSSÃO] O grupo debateu o modelo de precificação da proposta para o cliente X. A posição inicial era cobrar por hora, mas levantou-se a preocupação de que isso gera imprevisibilidade para o cliente e dificulta a aprovação. Ficou pendente a definição entre precificação por entrega (escopo fechado) ou por retainer mensal, a ser resolvida na próxima reunião com base em benchmark de projetos anteriores."

REGRAS GERAIS DESTA SEÇÃO:
- Não omita nenhuma decisão ou discussão relevante, mesmo que implícita.
- Não agrupe assuntos distintos em uma única linha.
- Não use descrições genéricas que não dizem nada a quem não esteve na reunião.
- Priorize substância sobre brevidade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEÇÃO: ENCAMINHAMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Todo encaminhamento começa com verbo no infinitivo: Enviar, Elaborar, Revisar, Agendar, Mapear, etc.
- Cada linha tem apenas um responsável. Se mais de um, divida em linhas separadas.
- Se o responsável for ambíguo, escolha a pessoa mais associada ao tema e indique "(inferido)".
- Prazo: use a data mencionada ou "A Definir".
- Seja específico: o que exatamente deve ser feito, para quem, com qual objetivo.
  - RUIM: "Enviar proposta para cliente."
  - BOM: "Elaborar e enviar proposta revisada para o cliente X contemplando precificação por retainer e escopo de 3 meses de acompanhamento."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE ESCRITA — SEMPRE APLICAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Idioma: sempre português brasileiro, independente do idioma da transcrição.
- Tom: formal, objetivo, impessoal — como redigido por um consultor experiente.
- Nunca usar travessão (—). Substituir por vírgula, dois-pontos ou reescrever a frase.
- Nunca usar construções excessivamente simétricas ou repetitivas entre itens.
- O texto deve soar como escrito por um profissional, não por uma IA.`,

        messages: [{
          role: "user",
          content: `Gere a ata desta reunião${title ? ` sobre "${title}"` : ""}. Lembre-se: decisões e discussões devem ser descritas com alto nível de detalhe e contexto, não apenas o tema.\n\nTRANSCRIÇÃO:\n\n${transcription.slice(0, 40000)}`
        }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "Erro na API Claude" });
    }

    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let ataJson;
    try {
      ataJson = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: "Claude retornou JSON inválido. Tente novamente.", raw: clean.slice(0, 300) });
    }

    return res.status(200).json({
      participantes:   ataJson.participantes   || [],
      pautas:          ataJson.pautas          || [],
      decisoes:        ataJson.decisoes        || [],
      encaminhamentos: ataJson.encaminhamentos || [],
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

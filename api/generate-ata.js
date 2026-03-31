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
        max_tokens: 4000,
        system: `Você é um consultor sênior da PWR Gestão especialista em atas de reunião. Analise a transcrição e retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem explicações.

O JSON deve seguir exatamente esta estrutura:
{
  "participantes": [["1","Nome","Empresa"]],
  "pautas": [["1","Descrição da pauta","15 min"]],
  "decisoes": [["1","Descrição da decisão ou [DISCUSSÃO] descrição","Tomador ou ''"]],
  "encaminhamentos": [["1","Verbo no infinitivo + descrição da ação","Responsável","Prazo ou A Definir"]]
}

Regras obrigatórias:
- Todo encaminhamento começa com verbo no infinitivo (-ar, -er, -ir)
- Cada encaminhamento tem apenas um responsável
- Inclua TODAS as decisões, discussões e encaminhamentos da transcrição, mesmo que implícitos
- Se empresa não mencionada, use contexto (PWR Gestão, cliente, equipe interna)
- Para decisões por consenso, use "Todos" como tomador
- Para discussões sem decisão, prefixe com [DISCUSSÃO] e deixe tomador vazio
- Estimativa de duração: assuntos breves 5-10 min, com debate 15-30 min, complexos 30-60 min
- Idioma: sempre português brasileiro, tom formal e objetivo
- Nunca use travessão (—), substitua por vírgula ou dois-pontos
- O texto deve soar como escrito por um consultor humano`,
        messages: [{
          role: "user",
          content: `Gere a ata desta reunião${title ? ` — ${title}` : ""}:\n\n${transcription.slice(0, 40000)}`
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

import { Buffer } from "buffer";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Lê o body raw (multipart/form-data) sem dependência externa
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);

    // Extrai o binário do PDF a partir do boundary do multipart
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: "Content-Type inválido" });
    }

    const boundary = "--" + boundaryMatch[1];
    const boundaryBuf = Buffer.from(boundary);

    // Encontra o início do conteúdo do arquivo (após os headers da parte)
    const headerEnd = Buffer.from("\r\n\r\n");
    let start = -1;
    let end = -1;

    for (let i = 0; i < raw.length - boundaryBuf.length; i++) {
      if (raw.slice(i, i + boundaryBuf.length).equals(boundaryBuf)) {
        if (start === -1) {
          // Primeira boundary: pula headers da parte
          const headerEndIdx = raw.indexOf(headerEnd, i);
          if (headerEndIdx !== -1) start = headerEndIdx + 4;
        } else {
          end = i - 2; // -2 para remover \r\n antes da boundary
          break;
        }
      }
    }

    if (start === -1 || end === -1) {
      return res.status(400).json({ error: "Não foi possível extrair o arquivo do upload" });
    }

    const pdfBuffer = raw.slice(start, end);

    // Importa pdf-parse dinamicamente
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const result = await pdfParse(pdfBuffer);

    if (!result.text || result.text.trim().length < 30) {
      return res.status(422).json({
        error: "PDF sem texto extraível. Verifique se não é um PDF escaneado.",
      });
    }

    res.status(200).json({ text: result.text.trim() });
  } catch (e) {
    res.status(500).json({ error: "Falha ao extrair texto: " + e.message });
  }
}

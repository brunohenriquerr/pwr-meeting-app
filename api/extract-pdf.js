import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Erro ao processar arquivo: " + err.message });

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) return res.status(400).json({ error: "Nenhum arquivo recebido" });

    try {
      const buffer = fs.readFileSync(file.filepath);
      const result = await pdfParse(buffer);

      if (!result.text || result.text.trim().length < 30) {
        return res.status(422).json({ error: "PDF sem texto extraível. Verifique se não é um PDF escaneado." });
      }

      res.status(200).json({ text: result.text.trim() });
    } catch (e) {
      res.status(500).json({ error: "Falha ao extrair texto do PDF: " + e.message });
    }
  });
}

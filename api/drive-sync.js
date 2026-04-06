// api/drive-sync.js
// Vercel Serverless Function
// Lê a pasta consolidada de transcrições do Google Drive (com subpastas por mês)
// e retorna os arquivos ainda não importados para o Supabase.
//
// Variáveis de ambiente necessárias (configurar no Vercel Dashboard):
//   GOOGLE_SERVICE_ACCOUNT_JSON  — JSON completo da Service Account
//   SUPABASE_URL                 — https://covdfydbxlofpklviatf.supabase.co
//   SUPABASE_SERVICE_KEY         — service_role key (não a anon key)
//
// Endpoint: GET /api/drive-sync
// Retorna: { imported: N, files: [...] }

const DRIVE_ROOT_FOLDER_ID = "1azotVcg4FwpVuu-DRLEVd1hKHN4zG8RG";

const PROJECT_MAP = {
  "san paolo":             "San Paolo",
  "cdg":                   "CDG Engenharia",
  "umuprev":               "UmuPrev",
  "umu prev":              "UmuPrev",
  "montenegro":            "Montenegro Urbanismo",
  "vde":                   "VDE",
  "nobrecon":              "Nobrecon",
  "pwr":                   "PWR Gestão (interno)",
};

function detectProject(name) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(PROJECT_MAP)) {
    if (lower.includes(key)) return val;
  }
  return "Sem projeto";
}

function parseDate(name, folderName) {
  // Tenta extrair data do nome do arquivo: "2026-03-28" ou "28-03-2026"
  const m1 = name.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return { date: `${m1[3]}/${m1[2]}/${m1[1]}`, month: `${m1[1]}-${m1[2]}` };
  const m2 = name.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (m2) return { date: `${m2[1]}/${m2[2]}/${m2[3]}`, month: `${m2[3]}-${m2[2]}` };
  // Fallback: usa nome da subpasta (ex: "2026-03")
  if (folderName && /^\d{4}-\d{2}$/.test(folderName)) {
    return { date: `01/${folderName.split("-")[1]}/${folderName.split("-")[0]}`, month: folderName };
  }
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  return { date: now.toLocaleDateString("pt-BR"), month };
}

async function getGoogleAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = obj => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Importa a chave privada RSA para assinar o JWT
  const pemKey = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const keyData = Uint8Array.from(atob(pemKey), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Falha ao obter token Google: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function listDriveFolder(folderId, token) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent("files(id,name,mimeType,createdTime,modifiedTime,size)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return data.files || [];
}

async function readDriveFile(fileId, mimeType, token) {
  let url;
  // Docs Google → exporta como texto plano
  if (mimeType === "application/vnd.google-apps.document") {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  }
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return await res.text();
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { GOOGLE_SERVICE_ACCOUNT_JSON, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

  if (!GOOGLE_SERVICE_ACCOUNT_JSON || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Variáveis de ambiente não configuradas. Veja README." });
  }

  try {
    // 1. Token Google
    const token = await getGoogleAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);

    // 2. Lista subpastas de meses dentro da pasta raiz
    const rootItems = await listDriveFolder(DRIVE_ROOT_FOLDER_ID, token);
    const monthFolders = rootItems.filter(f => f.mimeType === "application/vnd.google-apps.folder");

    // Se não houver subpastas, tenta ler arquivos direto na raiz
    const foldersToScan = monthFolders.length > 0
      ? monthFolders
      : [{ id: DRIVE_ROOT_FOLDER_ID, name: "raiz" }];

    // 3. Busca IDs já importados no Supabase
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/meetings?select=drive_file_id&drive_file_id=not.is.null`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    const existing = await sbRes.json();
    const existingIds = new Set((existing || []).map(r => r.drive_file_id));

    // 4. Para cada subpasta, lista arquivos e importa novos
    const imported = [];
    const SUPPORTED_TYPES = [
      "text/plain",
      "application/vnd.google-apps.document",
      "application/pdf",
    ];

    for (const folder of foldersToScan) {
      const files = await listDriveFolder(folder.id, token);
      const textFiles = files.filter(f => SUPPORTED_TYPES.some(t => f.mimeType?.startsWith(t.split("/")[0])) || f.mimeType === "application/vnd.google-apps.document");

      for (const file of textFiles) {
        if (existingIds.has(file.id)) continue; // já importado

        // Lê conteúdo
        const content = await readDriveFile(file.id, file.mimeType, token);
        if (!content || content.trim().length < 20) continue;

        const cleanName = file.name.replace(/\.(txt|pdf|docx?|md)$/i, "").trim();
        const { date, month } = parseDate(cleanName, folder.name);
        const project = detectProject(cleanName);

        // Insere no Supabase
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/meetings`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            project,
            month,
            date,
            title: cleanName,
            transcription: content.slice(0, 50000), // limite razoável
            source: "drive",
            status: "transcribed",
            drive_file_id: file.id,
            drive_file_name: file.name,
            participants: [],
          }),
        });

        if (insertRes.ok) {
          imported.push({ id: file.id, name: file.name, project, month });
        }
      }
    }

    return res.status(200).json({
      imported: imported.length,
      files: imported,
      scanned_folders: foldersToScan.map(f => f.name),
    });

  } catch (err) {
    console.error("[drive-sync] Erro:", err);
    return res.status(500).json({ error: err.message });
  }
}

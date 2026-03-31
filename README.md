# PWR Meeting App — Setup Completo

## 1. Supabase — Criar tabelas

1. Acesse: https://supabase.com/dashboard/project/covdfydbxlofpklviatf/sql/new
2. Cole o conteúdo de `supabase_setup.sql` e clique em **Run**

---

## 2. Google Drive — Service Account

A função `/api/drive-sync` usa uma **Service Account** do Google para ler a pasta de transcrições.

### Criar a Service Account:
1. Acesse: https://console.cloud.google.com/
2. Selecione (ou crie) um projeto
3. Vá em **APIs & Services → Library** → habilite **Google Drive API**
4. Vá em **APIs & Services → Credentials → Create Credentials → Service Account**
5. Nome: `pwr-meeting-app`, clique em **Create and Continue → Done**
6. Clique na service account criada → aba **Keys → Add Key → JSON** → baixe o arquivo

### Compartilhar a pasta do Drive com a Service Account:
1. Abra a pasta no Drive: https://drive.google.com/open?id=1W4TVGyZSvzeKFo12JMilR4bi5WM3-CUa
2. Clique em **Compartilhar**
3. Cole o e-mail da service account (formato: `nome@projeto.iam.gserviceaccount.com`)
4. Permissão: **Leitor**

---

## 3. Vercel — Variáveis de Ambiente

Acesse: https://vercel.com/brunohenriquerrs-projects/pwr-meeting-app/settings/environment-variables

Adicione as 3 variáveis abaixo (Environment: **Production**):

| Nome | Valor |
|------|-------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Cole o conteúdo **completo** do JSON baixado |
| `SUPABASE_URL` | `https://covdfydbxlofpklviatf.supabase.co` |
| `SUPABASE_SERVICE_KEY` | A **service_role** key do Supabase (não a anon key) |

### Onde achar a SUPABASE_SERVICE_KEY:
https://supabase.com/dashboard/project/covdfydbxlofpklviatf/settings/api
→ Seção **Project API keys → service_role**

---

## 4. Redeploy após configurar as variáveis

Após salvar as variáveis no Vercel, faça redeploy:
- Vercel Dashboard → seu projeto → Deployments → clique nos `...` do último deploy → **Redeploy**

---

## 5. Como funciona o sync

- Clique em **"Buscar no Drive"** na aba Transcrições
- A função `/api/drive-sync` percorre todas as subpastas de mês (`2026-03`, etc.)
- Arquivos novos (não importados ainda) são lidos e salvos no Supabase
- O campo `drive_file_id` evita duplicatas — cada arquivo é importado uma única vez
- Formatos suportados: `.txt`, Google Docs, `.pdf`

---

## Estrutura de pastas do Drive esperada:
```
📁 Transcrições de reuniões/
  📁 2026-03/
    📄 2026-03-28 San Paolo Reunião BSC.txt
    📄 CDG Engenharia 2026-03-25.txt
  📁 2026-04/
    📄 ...
```

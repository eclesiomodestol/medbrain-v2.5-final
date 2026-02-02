<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MedBrain EM v2.5

Sistema de gerenciamento de estudos médicos com IA integrada.

> [!NOTE]
> Você pode visualizar este app no **AI Studio**: [Acesse aqui](https://ai.studio/apps/drive/1nGBteLQ1o256sWxN2vGSVutaJ3IzZ1GH)

## 🚀 Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/eclesiomodestol/medbrain-em-v2.5)

### Passos para Deploy

1. **Faça login na Vercel** em [vercel.com](https://vercel.com)

2. **Importe o repositório:**
   - Clique em "Add New Project"
   - Selecione "Import Git Repository"
   - Escolha: `eclesiomodestol/medbrain-em-v2.5`

3. **Configure as variáveis de ambiente:**
   
   Na seção "Environment Variables", adicione:
   
   ```
   VITE_GEMINI_API_KEY=sua_chave_gemini_aqui
   GEMINI_API_KEY=sua_chave_gemini_aqui
   VITE_SUPABASE_URL=sua_url_supabase_aqui
   VITE_SUPABASE_ANON_KEY=sua_chave_supabase_aqui
   ```

4. **Deploy!**
   - Clique em "Deploy"
   - Aguarde o build completar (~2 minutos)
   - Acesse seu app no link fornecido pela Vercel

### Onde obter as chaves de API

- **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Supabase**: [Supabase Dashboard](https://supabase.com/dashboard) → Seu Projeto → Settings → API

---

## 💻 Executar Localmente

**Pré-requisitos:** Node.js 18+

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/eclesiomodestol/medbrain-em-v2.5.git
   cd medbrain-em-v2.5
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   
   Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` e adicione suas chaves de API.

4. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   
   Acesse: http://localhost:3000

---

## 🛠️ Scripts Disponíveis

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Preview do build de produção

---

## 📦 Tecnologias

- **Frontend:** React 19 + TypeScript + Vite
- **UI:** Lucide Icons + CSS Modules
- **Backend:** Supabase (Database + Auth)
- **IA:** Google Gemini AI
- **Deploy:** Vercel

---

## 📝 Licença

Projeto privado - Todos os direitos reservados.

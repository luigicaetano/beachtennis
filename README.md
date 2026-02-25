# 🎾 Beach Tennis Pro — Guia de Instalação Completo

## O que você vai ter no final
Um PWA (app que funciona no celular sem precisar de App Store), com:
- Login com e-mail e senha
- Múltiplos torneios por usuário
- Placar e ranking em tempo real
- Controle financeiro (pago/pendente)

---

## PASSO 1 — Criar projeto no Firebase (gratuito)

1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome: `beach-tennis-pro`
4. Desative o Google Analytics (não precisamos)
5. Clique em **"Criar projeto"**

---

## PASSO 2 — Ativar o banco de dados (Firestore)

1. No painel do Firebase, clique em **"Firestore Database"** no menu lateral
2. Clique em **"Criar banco de dados"**
3. Escolha **"Modo de produção"**
4. Selecione a região: **`southamerica-east1`** (São Paulo)
5. Clique em **"Ativar"**

### Configurar as Regras de Segurança:
1. Vá em **Firestore → Regras**
2. Apague o conteúdo atual e cole o conteúdo do arquivo `firestore.rules`
3. Clique em **"Publicar"**

---

## PASSO 3 — Ativar o Login (Authentication)

1. No painel do Firebase, clique em **"Authentication"** no menu lateral
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, ative **"E-mail/senha"**
4. Clique em **"Salvar"**

---

## PASSO 4 — Pegar as credenciais do Firebase

1. No painel do Firebase, clique na engrenagem ⚙️ → **"Configurações do projeto"**
2. Role até **"Seus apps"** e clique em **"</>"** (adicionar app da Web)
3. Dê o nome `beach-tennis-pro` e clique em **"Registrar app"**
4. O Firebase vai mostrar um objeto `firebaseConfig` assim:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "beach-tennis-pro.firebaseapp.com",
  projectId: "beach-tennis-pro",
  storageBucket: "beach-tennis-pro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Copie esses valores** e cole no arquivo `src/firebase.js` substituindo os placeholders.

---

## PASSO 5 — Rodar o projeto localmente

Você precisa ter o [Node.js](https://nodejs.org) instalado (versão 18+).

```bash
# Entrar na pasta do projeto
cd beach-tennis-pro

# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm start
```

O app vai abrir em `http://localhost:3000`.

---

## PASSO 6 — Publicar no ar (deploy)

### Opção A: Vercel (mais fácil — recomendado)
1. Crie uma conta em [https://vercel.com](https://vercel.com)
2. Instale o Vercel CLI: `npm install -g vercel`
3. Na pasta do projeto, rode: `vercel`
4. Siga as instruções — ele vai te dar uma URL como `beach-tennis-pro.vercel.app`

### Opção B: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## PASSO 7 — Instalar no celular como app

### Android (Chrome):
1. Abra a URL do app no Chrome
2. Aparece um banner "Adicionar à tela inicial" — clique nele
3. Ou: menu ⋮ → "Adicionar à tela inicial"

### iPhone (Safari):
1. Abra a URL no Safari
2. Clique no ícone de compartilhar 􀈂
3. Role e toque em **"Adicionar à Tela de Início"**

---

## Estrutura do projeto

```
beach-tennis-pro/
├── public/
│   ├── index.html        # HTML base com meta tags PWA
│   └── manifest.json     # Configuração do PWA (nome, ícones, cor)
├── src/
│   ├── firebase.js       # ⚠️ Coloque suas credenciais aqui
│   ├── AuthContext.js    # Gerenciamento de login
│   ├── LoginScreen.js    # Tela de login/cadastro
│   ├── TournamentScreen.js # Seleção de torneios
│   ├── App.js            # App principal (placar, financeiro, partidas)
│   └── index.js          # Ponto de entrada
├── firestore.rules       # Regras de segurança do banco
└── package.json          # Dependências
```

---

## Precisa de ajuda?

Se travar em qualquer passo, é só chamar! 🎾

# Praça

Mural cultural brasileiro com cartões, enquetes e recados de voz, quatro rodas de conversa e um passaporte pessoal. A interface web e o aplicativo Android usam a mesma API de contas.

## Rodar no computador

Use Node.js 24 e execute na raiz:

```sh
npm ci
npm run build
npm start
```

Abra http://127.0.0.1:4173. Para editar com atualização automática, use `npm run dev` e abra o endereço impresso pelo Vite.

**Criar minha conta** pede nome, cidade, e-mail e senha. O acesso é iniciado após o cadastro. O Passaporte permite atualizar o nome e sair. **Explorar como visitante** abre o mural demonstrativo e preserva os dados de visitante das versões anteriores. Cada conta mantém seus cartões e guardados no navegador ou aparelho em que foram criados.

## Servidor e dados

O servidor Node atende os arquivos de `dist`, as rotas `/api/conta` e as Rodas. As contas e sessões ficam em SQLite, em `.praca/contas.sqlite` na pasta pessoal do usuário do servidor. Para hospedar, configure `PRACA_DATA_DIR` com um diretório persistente fora da pasta pública, `HOST` e `PORT` para a escuta e `PRACA_HTTPS=1` quando o serviço estiver atrás de um proxy HTTPS. Preserve esse diretório nas atualizações. As senhas usam scrypt com salt individual. As sessões duram 14 dias e são revogadas ao sair. Mensagens das Rodas ficam em memória no processo.

## Android

O APK de desenvolvimento se conecta à porta 4173 pelo redirecionamento USB. Para apontar um build para outro servidor, configure `VITE_API_ORIGIN` com a origem HTTPS antes de executar `npm run android:sync`. Consulte [o guia Android](android/README.md).

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

**Criar minha conta** pede nome, cidade, e-mail e senha. O acesso é iniciado após o cadastro. O Passaporte permite atualizar o nome e sair. **Explorar como visitante** abre o mural demonstrativo e preserva os dados de visitante das versões anteriores. Ao entrar, as novas publicações, votos, bilhetes e adesivos são compartilhados com outras contas do mesmo servidor. Os guardados são privados e acompanham a conta. Cartões pessoais de versões anteriores permanecem no aparelho. O modo visitante usa dados locais.

## Servidor e dados

O servidor Node atende os arquivos de `dist`, as rotas `/api/conta`, `/api/mural` e as Rodas. As contas, sessões, cartões, mídias e interações do Mural ficam em SQLite, em `.praca/contas.sqlite` na pasta pessoal do usuário do servidor. Para hospedar, configure `PRACA_DATA_DIR` com um diretório persistente fora da pasta pública, `HOST` e `PORT` para a escuta e `PRACA_HTTPS=1` quando o serviço estiver atrás de um proxy HTTPS. Preserve esse diretório nas atualizações. As senhas usam scrypt com salt individual. As sessões duram 14 dias e são revogadas ao sair. A presença nas Rodas é temporária. Cada mesa mantém as últimas 60 mensagens no banco, com limite total de 5 MB por mesa.

## Hospedar e manter uma cópia dos dados

O Dockerfile empacota o servidor e a interface em uma única instância. Configure um volume persistente montado em `/data`, com acesso de escrita para o usuário Node (UID 1000). Direcione o HTTPS do provedor para a porta indicada por `PORT`. Quando a origem pública estiver disponível, configure `PRACA_HTTPS=1` e gere o APK com `VITE_API_ORIGIN` apontando para essa origem. A imagem também pode ser construída com `docker build -t praca .`.

Para fazer uma cópia consistente mesmo com o servidor ativo, execute `node backup.mjs caminho/para/copia.sqlite` com o mesmo `PRACA_DATA_DIR` do servidor. O arquivo inclui credenciais protegidas, sessões, mídias e conteúdo pessoal. Mantenha as cópias fora da pasta pública, com acesso restrito. Para testar a restauração, use uma pasta vazia, copie o backup para ela com o nome `contas.sqlite` e inicie uma instância isolada apontando para essa pasta.

## Android

### Segurança da comunidade

As páginas públicas de regras e privacidade ficam em `/?regras` e `/?privacidade`. Antes da primeira publicação no Mural ou nas Rodas, o servidor exige o aceite da versão em vigor, inclusive para contas existentes. O conteúdo das regras e sua versão ficam em `src/data/regras.json`. Ao alterar as regras, atualize a versão para solicitar novo aceite.

Para identificar o responsável na política pública, defina `VITE_PRIVACY_OPERATOR` e `VITE_PRIVACY_EMAIL` durante a compilação web e Android. No Docker, passe esses nomes como argumentos de build. Antes do lançamento, complete os dados de contato e revise a política conforme o provedor e a retenção real dos backups.

Abra um cartão do Mural ou uma mensagem nas Rodas para denunciar conteúdo ou perfil e bloquear a pessoa. O bloqueio oculta conteúdo e presença entre as duas contas. Em **Passaporte → Pessoas bloqueadas** você pode desfazê-lo.

No servidor, com o mesmo `PRACA_DATA_DIR`, use `node moderate.mjs listar` para consultar a fila. Use `node moderate.mjs arquivar ID` para encerrar uma denúncia ou `node moderate.mjs agir ID` para remover o conteúdo denunciado. Para denúncias de perfil, agir impede novas publicações e interações públicas daquela conta.

A exclusão está em **Passaporte → Excluir conta** e na página pública `/?excluir-conta` do servidor. Exige e-mail, senha e confirmação. Ela remove dados vinculados à conta no banco ativo. Recados anteriores à introdução do identificador de autor nas Rodas guardam somente o nome exibido e expiram pelo limite do histórico. Cópias de segurança já existentes seguem o ciclo de retenção do operador.

### Conectar o aplicativo

O APK de desenvolvimento se conecta à porta 4173 pelo redirecionamento USB. Para apontar um build para outro servidor, configure `VITE_API_ORIGIN` com a origem HTTPS antes de executar `npm run android:sync`. Consulte [o guia Android](android/README.md).

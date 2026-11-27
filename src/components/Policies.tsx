import rules from "../data/regras.json";

export function PolicyLinks() {
  return <nav aria-label="Regras e privacidade" className="policy-links">
    <a href="./?regras">Regras da comunidade</a>
    <a href="./?privacidade">Política de privacidade</a>
  </nav>;
}

export function Policies({privacy}: {privacy: boolean}) {
  const operator = import.meta.env.VITE_PRIVACY_OPERATOR;
  const contact = import.meta.env.VITE_PRIVACY_EMAIL;
  return <main className="shell policy-page">
    <a href="./">Voltar à Praça</a>
    <h1>{privacy ? "Política de privacidade da Praça" : "Regras da comunidade"}</h1>
    <p>Versão de 27 de novembro de 2026.</p>
    {privacy ? <>
      <h2>Conta e acesso</h2>
      <p>A Praça guarda seu e-mail, nome de exibição e cidade para identificar sua conta. O servidor verifica a senha usando um resumo criptográfico. Um cookie mantém a sessão por até 14 dias. Se você gerar um código de recuperação, guardamos um resumo do código para validar seu uso. Para limitar tentativas de acesso, o serviço mantém temporariamente um contador por endereço de rede.</p>
      <h2>O que as outras pessoas veem</h2>
      <p>Quando você publica um cartão, outras contas podem ver seu nome, a cidade indicada no cartão e o conteúdo que você escolheu enviar, como fotos, enquetes e gravações. Nas Rodas, participantes veem o nome de quem está na mesa, os recados e as reações. Os bilhetes aparecem junto ao cartão. Votos e adesivos contribuem para as contagens exibidas.</p>
      <p>Seu e-mail, seus guardados e sua lista de bloqueios ficam restritos à conta e ao serviço. As denúncias vão para quem modera a Praça. O servidor registra a conta, a versão das regras e o momento do aceite para verificar quem pode publicar.</p>
      <h2>Microfone e armazenamento no aparelho</h2>
      <p>Ao iniciar uma gravação, a Praça pede acesso ao microfone. Você pode ouvir a gravação antes de enviá-la. Preferências e conteúdo criado no modo visitante ficam no armazenamento do app ou navegador. Limpar esse armazenamento apaga os dados locais de visitante.</p>
      <h2>Por quanto tempo os dados ficam guardados</h2>
      <p>O Mural mantém as publicações e interações enquanto estiverem disponíveis no serviço. Cada Roda mantém até 60 recados recentes, sujeitos a um limite total de 5 MB. A fila de moderação mantém as denúncias até sua resolução ou exclusão. A equipe que opera o servidor pode acessar os dados necessários para manter o serviço e analisar denúncias.</p>
      <h2>Como gerenciar ou excluir seus dados</h2>
      <p>No Passaporte, você pode alterar seu nome, desfazer bloqueios e excluir a conta. A exclusão encerra as sessões e remove do banco ativo os dados vinculados à conta. Recados de versões antigas que registravam apenas o nome saem pelo limite do histórico. Dados já incluídos em cópias de segurança permanecem até a substituição ou eliminação dessas cópias.</p>
      <p><a href="./?excluir-conta">Excluir minha conta pela web</a></p>
      <h2>Responsável e contato de privacidade</h2>
      {operator && <p>{operator}</p>}
      {contact && <p>Para pedir acesso, correção ou esclarecimentos sobre seus dados, escreva para <a href={"mailto:" + contact}>{contact}</a>.</p>}
      {(!contact || !operator) && <p>A Praça está em fase de testes. A identificação completa do responsável e o canal público de privacidade serão informados antes do lançamento.</p>}
    </> : <>
      <p>Estas regras valem para cartões, fotos, enquetes, bilhetes, áudios, perfis e conversas nas Rodas.</p>
      <ul>{rules.rules.map(rule => <li key={rule}>{rule}</li>)}</ul>
      <h2>Se algo acontecer</h2>
      <p>Abra o cartão, bilhete, recado ou perfil nas opções da Roda e escolha denunciar. Selecione o motivo e envie. Você também pode bloquear a pessoa e desfazer o bloqueio em Passaporte. A moderação pode remover conteúdo ou restringir publicações da conta denunciada.</p>
      <p>Você pode ler o Mural e usar as ferramentas de denúncia, bloqueio e exclusão de conta antes de aceitar estas regras.</p>
    </>}
    <PolicyLinks />
  </main>;
}

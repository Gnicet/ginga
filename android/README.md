# Praça para Android

O aplicativo usa o identificador `br.com.praca.app`. O Mural, o Passaporte e as mídias iniciais são empacotados junto com a interface. O microfone é solicitado ao tocar em gravar.

## Executar

Na raiz, execute `npm ci` e `npm run android:sync`. Abra o projeto com `npm run android:open` e use **Run** com um aparelho ou emulador. O projeto compila com o SDK 36 e requer Android 7 ou superior no aparelho.

## Rodas em desenvolvimento

Depois da sincronização, execute `npm run preview` na porta 4173 no computador. Com o aparelho conectado por USB e a depuração autorizada, execute `adb reverse tcp:4173 tcp:4173`. O aplicativo de depuração usa essa conexão para trocar mensagens com o mesmo servidor que atende o navegador.

Para um servidor remoto, defina `VITE_RODAS_ORIGIN` com a origem HTTPS da instância da Praça antes de sincronizar. A hospedagem precisa executar a API de Rodas. O clique em gravar requer permissão do microfone.

## APK de depuração

Após sincronizar, rode `gradlew.bat assembleDebug` na pasta Android em Windows ou `bash gradlew assembleDebug` em Linux. O resultado fica em `app/build/outputs/apk/debug/app-debug.apk`.

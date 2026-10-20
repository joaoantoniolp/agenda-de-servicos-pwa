# Agenda de Serviços — PWA

Aplicação responsiva em HTML, CSS e JavaScript puro para cadastro de clientes, serviços e agendamentos.

## Funcionalidades
- Dashboard e próximos agendamentos
- Cadastro, edição, busca e exclusão de clientes e serviços
- Criação e edição de agendamentos
- Status Agendado, Concluído e Cancelado
- Validação de conflitos de horário considerando a duração do serviço
- Dados salvos no LocalStorage
- Manifesto e Service Worker para instalação e uso offline básico
- Interface adaptável a celular e computador

## Executar localmente
Abra a pasta no VS Code e use a extensão Live Server: clique com o botão direito em `index.html` e selecione **Open with Live Server**. O Service Worker exige `localhost` ou HTTPS.

## Publicar
Envie os arquivos para um repositório GitHub e abra **Settings → Pages**. Selecione **Deploy from a branch**, branch `main` e a pasta que contém `index.html` (raiz, se os arquivos estiverem nela).

## Limitações conhecidas
O LocalStorage é específico do navegador/dispositivo e não sincroniza dados entre aparelhos. O projeto inclui dados demonstrativos na primeira abertura. Notificações push não estão implementadas nesta versão inicial; se o professor exigir notificações, será preciso adicioná-las separadamente. Após publicar mudanças, atualize `CACHE_NAME` no Service Worker para invalidar o cache antigo.
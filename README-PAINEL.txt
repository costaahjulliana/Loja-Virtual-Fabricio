# Loja de móveis com painel administrativo

## O que está incluído
- `index.html`: loja pública.
- `admin.html`: painel de login para gerenciar disponibilidade.
- `script.js`: lê o catálogo no Supabase.
- `admin.js`: login e alteração do status dos produtos.
- `supabase-schema.sql`: estrutura e políticas de segurança do banco.
- `style.css` e `admin.css`: estilos.

## Configuração necessária (uma única vez)
1. Crie um projeto no Supabase.
2. Em SQL Editor, execute todo o conteúdo de `supabase-schema.sql`.
3. Em Project Settings / API (ou Connect), copie a Project URL e a chave `anon`/`publishable`.
4. A URL e a chave pública do seu projeto já estão preenchidas em `script.js` e `admin.js`. Não substitua por uma chave `sb_secret_`.
5. Crie o usuário administrador em Authentication > Users (e-mail e senha). Não habilite cadastro público.
6. Importe os produtos iniciais: use o SQL abaixo em SQL Editor (execute uma única vez).
7. Publique os arquivos no GitHub Pages. A loja fica em `index.html` e o painel em `admin.html`.

## SQL para importar produtos iniciais
Depois de criar a tabela, execute o conteúdo de `import-products.sql`.
Não execute a importação repetidamente, pois os IDs já existem.

## WhatsApp
Em `script.js`, ainda altere `WHATSAPP_NUMBER` para o número correto com código do país e DDD, somente números. O arquivo está com um número de exemplo (`5511999999999`).

## Fotos
Suba as fotos na pasta `images` ou use URLs públicas HTTPS e preencha o campo `image_url` na tabela `products`.

## Segurança
- Nunca coloque a chave `service_role` no HTML ou JavaScript público.
- O painel usa login Supabase Auth.
- A política SQL deste protótipo permite atualizar produtos a qualquer usuário autenticado. Não habilite cadastro público e mantenha apenas usuários de confiança. Se houver vários usuários, restrinja a política por ID de administrador.
- O catálogo público só tem permissão de leitura; os visitantes não conseguem mudar a disponibilidade pelo site público.

Fotos dos contatos, aliados e patronos
======================================

Salve aqui a imagem de cada contato usando o numero fixo dele:

  img_ctt_001.png  -> contato #001
  img_ctt_002.png  -> contato #002
  img_ctt_003.png  -> contato #003
  ... e assim por diante

Como descobrir o numero de um contato
-------------------------------------
1) No app: abra o botao lateral "Contatos", clique no contato e o codigo
   aparece embaixo da moldura da foto (ex.: #003). O nome exato do arquivo
   tambem aparece dentro da moldura enquanto nao houver imagem.
2) No Firebase (Firestore > characters): dentro do array `contacts` do
   documento da ficha, o campo `photoNumber` de cada contato guarda o
   numero (3 = img_ctt_003).

Regras importantes
------------------
- O numero e fixo e nunca e reaproveitado. Se o contato #002 for excluido,
  o proximo contato criado recebe #007 (e nao #002), entao as fotos dos
  outros contatos NUNCA trocam de dono.
- A numeracao e global: vale para todas as fichas, nao so para a sua.
- A imagem de um contato excluido pode ser apagada da pasta a vontade.
- Extensoes aceitas, nesta ordem de tentativa: .png, .jpg, .jpeg, .webp
  (o app tenta img_ctt_003.png; se nao existir, tenta img_ctt_003.jpg, etc.).
- Se nao houver imagem com o numero do contato, a moldura mostra
  "Sem foto" normalmente - nao quebra nada.
- Nomes com zeros a esquerda sao obrigatorios ate 999 (img_ctt_007.png,
  nao img_ctt_7.png). A partir de 1000 e so o numero: img_ctt_1000.png.
- Formato sugerido: retrato em pe (ex.: 400x480) para encaixar bem na
  moldura da mini-ficha.

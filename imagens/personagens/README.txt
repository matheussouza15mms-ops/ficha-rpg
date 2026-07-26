Retratos dos personagens
========================

Salve aqui a imagem de cada personagem usando o numero fixo da ficha:

  img_001.png  -> personagem #001
  img_002.png  -> personagem #002
  img_003.png  -> personagem #003
  ... e assim por diante

Como descobrir o numero de uma ficha
------------------------------------
1) No app: o numero aparece no cabecalho do quadro "Retrato" (ex.: #003).
2) No Firebase (Firestore > characters): o campo `portraitNumber` do
   documento guarda o numero (3 = img_003).

Regras importantes
------------------
- O numero e fixo e nunca e reaproveitado. Se o personagem #002 for
  excluido, o proximo personagem criado recebe #007 (e nao #002), entao
  as imagens dos outros personagens NUNCA trocam de dono.
- A imagem do personagem excluido pode ser apagada da pasta a vontade.
- Extensoes aceitas, nesta ordem de tentativa: .png, .jpg, .jpeg, .webp
  (o app tenta img_003.png; se nao existir, tenta img_003.jpg, etc.).
- Se nao houver imagem com o numero da ficha, o quadro mostra
  "Sem imagem" normalmente - nao quebra nada.
- Nomes com zeros a esquerda sao obrigatorios ate 999 (img_007.png,
  nao img_7.png). A partir de 1000 e so o numero: img_1000.png.
- Formato sugerido: imagem quadrada (ex.: 512x512) para encaixar bem
  na moldura.

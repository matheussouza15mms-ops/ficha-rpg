Fotos reais do veículo de cada ficha
====================================

Isto NÃO é o ícone do modelo (aquele fica em imagens/Veiculos, ex.: carro.png,
moto.png). Aqui é a foto de verdade do veículo daquela ficha específica (ex.:
a foto real do "Chevette 82").

Salve aqui a imagem usando o mesmo número fixo da ficha (o mesmo do retrato):

  img_veh_001.png  -> veículo da ficha #001
  img_veh_002.png  -> veículo da ficha #002
  img_veh_003.png  -> veículo da ficha #003
  ... e assim por diante

Como descobrir o número de uma ficha
-------------------------------------
1) No app: passe o mouse (ou toque) no ícone de câmera ao lado do campo
   "Modelo", no quadro do veículo. O nome exato do arquivo esperado aparece
   ali dentro, mesmo que a imagem ainda não exista.
2) O número é o mesmo que já aparece no quadro "Retrato" do personagem
   (ex.: #003) — não é um contador separado, já que cada ficha tem no
   máximo um veículo.
3) No Firebase (Firestore > characters): o campo `portraitNumber` do
   documento guarda o número (3 = img_veh_003).

Regras importantes
-------------------
- Cada ficha tem no máximo uma foto de veículo, então reaproveita o mesmo
  número do retrato — não crie uma numeração própria.
- Extensões aceitas, nesta ordem de tentativa: .png, .jpg, .jpeg, .webp
  (o app tenta img_veh_003.png; se não existir, tenta img_veh_003.jpg, etc.).
- Se não houver imagem com o número da ficha, o ícone de câmera continua
  funcionando normalmente — só não mostra foto nenhuma no preview.
- Nomes com zeros à esquerda são obrigatórios até 999 (img_veh_007.png,
  não img_veh_7.png). A partir de 1000 é só o número: img_veh_1000.png.
- Formato sugerido: foto na horizontal (ex.: 4:3), já que o preview usa
  essa proporção.

// Demonstração: substitua estes registros pelos dados oficiais antes do uso comercial.
// Um material só aparece se tiver url. Aceita arquivos locais e URLs https.
const photos=['./assets/residencial-1.jpg','./assets/residencial-2.jpg','./assets/residencial-3.jpg'];
const rows=[
 ['reserva-do-parque','Reserva do Parque','Passaré','Fortaleza',259000,'Em obras','Direcional',45,52,2,0,1,4,320,'Janeiro/2028'],
 ['jardins-do-sul','Jardins do Sul','Maraponga','Fortaleza',289000,'Lançamento','Direcional',48,58,2,1,1,3,240,'Junho/2029'],
 ['vista-serena','Vista Serena','Centro','Eusébio',349000,'Pronto para morar','Riva',58,68,3,1,2,2,160,'Concluído'],
 ['parque-das-palmeiras','Parque das Palmeiras','Pajuçara','Maracanaú',219000,'Em obras','Direcional',42,49,2,0,1,5,400,'Dezembro/2027'],
 ['horizonte-residencial','Horizonte Residencial','Messejana','Fortaleza',269000,'Lançamento','Direcional',46,55,2,1,1,4,288,'Março/2029'],
 ['solar-do-lago','Solar do Lago','Lagoa Redonda','Fortaleza',329000,'Pronto para morar','Riva',55,64,3,1,2,2,128,'Concluído']
];
export const materialTypes={book:['Book do empreendimento','PDF'],tabela:['Tabela de Preços','CSV'],plantas:['Plantas','PDF'],implantacao:['Implantação','PDF'],memorial:['Memorial Descritivo','PDF'],comerciais:['Informações Comerciais','PDF'],videos:['Vídeos','URL'],localizacao:['Localização','MAPA'],outros:['Outros Materiais','PDF']};
export const developments=rows.map((r,i)=>{const [id,name,neighborhood,city,price,status,builder,minArea,maxArea,bedrooms,suites,parking,towers,units,delivery]=r;const updatedAt=`2026-10-0${2-Math.floor(i/3)}T${String(14-i).padStart(2,'0')}:30:00-03:00`;const materials={book:{url:`./materials/${id}-book.pdf`},tabela:{url:`./materials/${id}-tabela.csv`,updatedAt},comerciais:{url:`./materials/${id}-comerciais.pdf`},localizacao:{url:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(neighborhood+', '+city+', Ceará')}`}};if(i%2===0){materials.plantas={url:`./materials/${id}-plantas.pdf`};materials.implantacao={url:`./materials/${id}-implantacao.pdf`};materials.memorial={url:`./materials/${id}-memorial.pdf`};}if(i===0)materials.outros={url:`./materials/${id}-outros.pdf`};return {id,name,neighborhood,city,price,status,builder,minArea,maxArea,bedrooms,suites,parking,towers,units,delivery,updatedAt,image:photos[i%3],address:`Endereço ilustrativo · ${neighborhood}, ${city} — CE`,typology:`${bedrooms} quartos${suites?' com suíte':''}`,materials};});

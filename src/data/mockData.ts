import type {User,Post,Story,MusicTrack,FilterPreset,Comment} from '../types/social'
const person=(id:number,name:string,handle:string,city:string):User=>({id:String(id),name,handle,city,avatar:'/media/avatar'+id+'.jpg',bio:''})
export const currentUser={...person(0,'Genilson Filho','gnis.br','Salvador, BA'),bio:'Café, código e um bom rolê pelo Brasil 🇧🇷☕'}
export const people=[currentUser,person(1,'Bia Oliveira','bia.nacozinha','Salvador, BA'),person(2,'Lucas Santos','lucas.nomundo','Rio de Janeiro, RJ'),person(3,'Mari Costa','maricosta','São Paulo, SP'),person(4,'Davi Lima','davi.cria','Recife, PE'),person(5,'Ana Luz','analuz','Olinda, PE'),person(6,'Pedro Rocha','pedro.rua','São Paulo, SP')]
export const tracks:MusicTrack[]=[['Samba de domingo','Roda do Ginga'],['Brisa da Bahia','Coletivo Maré'],['Baião da feira','Trio Caju']].map(([title,artist],i)=>({id:String(i),title,artist,src:'/audio/trilha'+i+'.wav'}))
export const filters:FilterPreset[]=[['Original','none'],['Rio 40º','sepia(.2) saturate(1.45) contrast(1.08)'],['Garoa SP','saturate(.55) hue-rotate(9deg) contrast(.96)'],['Pelourinho','saturate(1.65) contrast(1.18) sepia(.12)'],['Cerrado','sepia(.42) saturate(.85)']].map(([name,css],i)=>({id:String(i),name,css}))
const rows=[
 ['hero','Domingo tem cheiro de feijoada e casa cheia. Quem chega com a farofa? 🫘🍊','Salvador, BA','Gastronomia','2 h','Me guarda um prato!','A laranja do lado é sagrada 🍊'],
 ['praia','O sol se despedindo e a gente inventando motivo pra ficar mais um pouco.','Praia da Barra, BA','Natureza','3 h','Saudade desse mar!','A luz tava linda demais.'],
 ['paulista','Segunda-feira: o metrô acordou mais disposto que eu. ☕','Avenida Paulista, SP','Cotidiano','4 h','Eu no modo soneca kkk','Só depois do segundo café.'],
 ['setup','O café tá passado, o código nem tanto. Bora estudar!','Recife, PE','Cotidiano','5 h','Esse cantinho ficou massa!','Bora pro próximo commit.'],
 ['musica','A roda começou na calçada e já juntou a rua inteira. 🎶','Olinda, PE','Música','6 h','Manda o próximo rolê!','Que energia boa.'],
 ['urbano','Cada esquina conta um pedaço da cidade. Hoje fui ouvir a pé.','São Paulo, SP','Arte urbana','8 h','Conheço esse lugar!','São Paulo surpreende.']]
export const initialPosts:Post[]=rows.map(([pic,caption,location,category,time,a,b],i)=>{
 const comments:Comment[]=[a,b].map((text,k)=>({id:'c'+i+k,user:people[(i+k+2)%7],text,likes:k+2,liked:false,time:'1 h'}))
 if(i===0) comments.push({id:'voice',user:people[5],text:'',audio:'/audio/resenha.wav',duration:3,likes:1,liked:false,time:'32 min'})
 return {id:'p'+i,user:people[i===3?0:i+1],image:'/media/'+pic+'.jpg',caption,location,category,time,filter:'none',track:tracks[i%3],comments,tags:i===5?[currentUser.handle]:[],reactions:{amei:[248,182,96,65,156,82][i],brabo:12+i,morri:i,palmas:6+i,resenha:2+i}}
})
export const stories:Story[]=[['Paulista','paulista'],['Bia','avatar1'],['Na praia','praia'],['Lucas','avatar2'],['Mari','avatar3'],['Olinda','musica']].map(([name,pic],i)=>({id:'s'+i,name,image:'/media/'+pic+'.jpg',open:i%2===0,slides:[{image:'/media/'+['paulista','hero','praia','urbano','setup','musica'][i]+'.jpg',caption:['Sábado na Paulista','A cozinha da Bia','Praia da Barra','Pela cidade','Café da tarde','Som na rua'][i]},{image:'/media/'+['urbano','setup','urbano','praia','paulista','urbano'][i]+'.jpg',caption:['O passeio continua','Depois do almoço','Até o sol se pôr','Olha essa vista','Pausa pro rolê','Depois da roda'][i]}]}))


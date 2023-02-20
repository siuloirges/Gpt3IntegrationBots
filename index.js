const { MongoClient, ServerApiVersion } = require('mongodb');
const { Configuration, OpenAIApi } = require("openai");
const ObjectID = require('mongodb').ObjectID;
const readline = require('readline');
var redis = require("redis");
const express = require('express')

//Open IA
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


//Mongo DB
const uriMongo = "mongodb+srv://Sergio-All:OwSA0rjmhJKtyE7M@cluster0.ztbdwxd.mongodb.net/?retryWrites=true&w=majority";
const Mongoclient = new MongoClient(uriMongo, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
var BotsCollection = null
Mongoclient.connect( async err => {

    console.log("Mongo Conectado a Bots Coleccion")
    BotsCollection = Mongoclient.db("Chess").collection("Bots");
 

})

//Redis
var Redisclient = redis.createClient(12984, "redis-12984.c89.us-east-1-3.ec2.cloud.redislabs.com",{no_ready_check: true}); 
Redisclient.auth("hpm9Coi0cvZ6a9eWxkldvjXxxftFHMHd", function (err) { if (err) throw err; }); 

//Express
const port = process.env.PORT || 5000
const app = express()
const allowedOrigins = ['0.0.0.0'];
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.listen(port, () => {
    console.log(`Runing port ${port}`)
})


//Routes
app.get('/talk-to-my-bot', async function (req, resp) {
    
    let chatID = req.query.chatID
    let userName = req.query.userName
    let message = req.query.message
    
    await sendMessage(chatID,userName,message,resp);
 
})
  

//funcionts
async function sendMessage(chatID,userName,message,resp){

    let userId = "sergio-admin"
    const bot = await buscarBot(chatID)
    
    if(bot == null){
        console.log("Nuevo")
        await crearBot(chatID,userName,userId)
        return sendMessage(chatID,userName,message,resp)
    }

    let response = await addMessage(userId,chatID,userName,message,bot)


    resp.send(response)

}

async function addMessage(userId,chatID,userName,message,bot){


    let conversation = bot.conversation+userName+":"+message+"\n"+chatID+":"

    let GPTresp = await sendQuestion( conversation, bot )

    conversation += GPTresp+"\n"

    await updateConversacionBot(conversation,bot)
     
    return GPTresp;

    
}

async function updateConversacionBot(conversation,bot){
    BotsCollection.updateOne(
      { _id: new ObjectID(bot._id) },
      { $set:  {conversation}},
      { upsert: true }
    )
}

async function crearBot(chatID,userName,userId){

    try {

      let  initConfigBot = chatID+`
      es un asesor de mantenimiento,reparaciones, instalaciones de software, ventas de componentes y cursos de aprendisaje sobre el tema de computadoras esta aqui para ayudarlo con todas las dudas sobre nuestros servicios\n
      nuestros servicios: 
      - mantenimiento de dispositivos para el buen funcionamiento y prevenir fallas futuras en el equipo, se cobra de 30mil a 80mil pesos colombianos 
      - instalaciones de cualquier tipo de software, el costo de este servicio es desde 10mil a 50mil pesos colombianos dependiendo de la cantidad de programas instalados
      - vendemos todo tipo de piezas o repuestos de dispositivos, los prcios no son fijos y pueden variar en gran cantidad
      - ofrecemos cursos de aprendisaje sobre reparacion de dispositivos, los costos de estos cursos pueden variar se pude comunicar a el whatsaap +57 323 3747844 para mas informacion
      - revision y reparacion de dispositivos en mal funcionamiento y garantizar el buen funcionamiento, el costo de una reparacion puede variar dependiendo del daño del computador aunque los costos mas comunes pueden estar dentro de los 100mil a 300mil pesos colombianos fuera de repuestos

      dispositivos:
      -computadoras de mesa
      -computadores portatiles
      -celulares inteligantes
      -tablets

      ubicacion de la empresa: 
      pais: Colombia
      departamento: Bolivar
      `

    
       await BotsCollection.insertOne( {userId,chatID,userName,conversation:initConfigBot} );

        return true;
    
      } catch (error) {
    
        console.log(error)
        
      }
}

async function buscarBot(chatID){
    return await BotsCollection.findOne({ chatID: chatID });
}

async function sendQuestion(question,bot){
    const resp = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: question,
        temperature: 0.9,
        max_tokens: 300,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        stop: [`${bot.chatID}:`,`${bot.userName}:`],
    });
      
    return resp.data.choices[0].text;
}
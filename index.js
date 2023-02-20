const { MongoClient, ServerApiVersion } = require('mongodb');
const { Configuration, OpenAIApi } = require("openai");
const ObjectID = require('mongodb').ObjectID;
const readline = require('readline');
var redis = require("redis");
const express = require('express')

//Open IA
const configuration = new Configuration({
    apiKey: "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",
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
var Redisclient = redis.createClient(16287, "redis-16287.c273.us-east-1-2.ec2.cloud.redislabs.com",{no_ready_check: true}); 
Redisclient.auth("TUcO14tQPC6w0t2GQeYVyaQELsEI0TPW", function (err) { if (err) throw err; }); 

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
 
    // ptin("ya")

    return;
})
  

//funcionts
async function sendMessage(chatID,userName,message,resp){

    let userId = "sergio-admin"
    let bot = await buscarBot(chatID)
    
    if(bot == null){

        console.log("Nuevo")
        await crearBot(chatID,userName,userId,message,resp)
       
     
    }else{

        let response = await addMessage(userId,chatID,userName,message,bot)


        resp.send(response)
    
        return;

    }


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

async function crearBot(chatID,userName,userId,message,resp){

    try {

        await Redisclient.get("chatInitConfig", async function(err, reply) {

            let  initConfigBot = chatID+reply
          

            console.log("crearBot en mongo...")
           await BotsCollection.insertOne({userId,chatID,userName,conversation:initConfigBot},async (err,data)=>{
                console.log("insertado")

                let bot = await buscarBot(chatID)
                let response = await addMessage(userId,chatID,userName,message,bot)
                resp.send(response)
                return true;
            })
            

        });

        console.log("termino")
    
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
const { Configuration, OpenAIApi } = require("openai");
const readline = require('readline');
var redis = require("redis");
const express = require('express')
const app = express()

var client = redis.createClient(12984, "redis-12984.c89.us-east-1-3.ec2.cloud.redislabs.com",{no_ready_check: true}); 
client.auth("hpm9Coi0cvZ6a9eWxkldvjXxxftFHMHd", function (err) { if (err) throw err; }); 

const configuration = new Configuration({
  apiKey: "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 ",
});
const openai = new OpenAIApi(configuration);

BotColeccion = "Bots"


async function sendMessage(chatID,userName,message,resp){

    
        let NameBot = "bot-"+chatID

        
        await client.get(BotColeccion, async function(err, reply) {

            let bots = JSON.parse(reply)

            if(bots == null){
                createColebtion()
                return sendMessage(chatID,userName,message,resp)
            }

    
            my_bot = bots[NameBot]
                     
   
            if( my_bot == null ){
                console.log("Nuevo")
                await createBot(NameBot,userName,bots)   
            }else{
                console.log("Existe")
            }

            await client.get(BotColeccion, async function(err, reply) {

                
                let bots = JSON.parse(reply)
                console.log(bots)
                my_bot = bots[NameBot]
                
                my_bot.conversation += userName+":"+message+"\n"+NameBot+":"

                let GPTresp = await sendQuestion( my_bot.conversation )

                my_bot.conversation += GPTresp+"\n"

                updateConversation(NameBot,my_bot.conversation)

                resp.send(GPTresp)

            })





        });




}

async function sendQuestion(question){
    const resp = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: question,
        temperature: 0.9,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        stop: ["-"],
      });

      
      return resp.data.choices[0].text;
}

app.get('/talk-to-my-bot', async function (req, resp) {
    
    let chatID = req.query.chatID
    let userName = req.query.userName
    let message = req.query.message
    
   await sendMessage(chatID,userName,message,resp)

    // console.log(chatID)

 
})
  
const port = process.env.PORT || 5000

app.listen(port)
console.log("Run port "+port)

async function createColebtion(){
    await client.set(BotColeccion, JSON.stringify({}));
}

async function updateConversation(botName,conversation){
    await client.get(BotColeccion, async function(err, reply) {

        let bots = JSON.parse(reply)
        my_bot = bots[botName].conversation = conversation
        await client.set(BotColeccion, JSON.stringify(bots));
    })
}

async function createBot(NameBot,userName,reply){

    initConfigBot = NameBot+" es personaje no jugador que inicia una aventura con "+userName+" para ayudarlo con todas sus dificultades, dar opiniciones, ayudarolo con sus objetivos y responder sus preguntas\n"


    botFormat = {
        "user_id":"",
        "bot_name":"",
        "conversation":initConfigBot
    }

    reply[NameBot] = botFormat
    // data =

   await client.set(BotColeccion, JSON.stringify(reply));
}
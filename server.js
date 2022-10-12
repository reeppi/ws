'use strict';

const express = require('express');
const { Server } = require('ws');
const { object } = require('yup');
const router = express.Router();
const PORT = process.env.PORT || 3001;
const INDEX = '/index.html';
router.get('/', (req, res) => res.sendFile(INDEX, { root: __dirname }) );
const app = express();
app.use("/",router);
const server = app.listen(PORT, () => console.log(`Listening on ${PORT}`));
const wss = new Server({ server });
const yup  = require("yup");
const { users,getUsername } = require('./service');
const tictactoe = require("./tictactoe");

const MAXLEN=20;
const MINLEN=3;

//users["testi"]={};
//users.testi.game=new tictactoe(users,"111","222");

const schemas = {
  "CHAT": yup.object().shape( { msg: yup.string().max(100) }),
  "LOGIN": yup.object().shape( { username: yup.string().required().min(MINLEN).max(MAXLEN) }),
  "LOGOUT": yup.object().shape( { username: yup.string().required().min(MINLEN).max(MAXLEN) }),
  "INVITE": yup.object().shape( { 
    username: yup.string().required().min(MINLEN).max(MAXLEN),
    game: yup.string().required().max(MAXLEN)
  }),
  "ACCEPTINVITE": yup.object().shape( 
    { username: yup.string().required().min(MINLEN).max(MAXLEN)
    }),

  "CANCELINVITE": yup.object().shape( { username: yup.string().required().min(MINLEN).max(MAXLEN)}),
  "REJECTINVITE": yup.object().shape( { username: yup.string().required().min(MINLEN).max(MAXLEN)}),
  "GAME": yup.object().shape( { id: yup.string().required(), event:yup.string().required(), data: yup.object() })
}

var total=0;

wss.on('connection', (ws) => {
  console.log('Client connected!');
  total++;
  console.log(total);

  wss.clients.forEach((client) => {
    client.send(JSON.stringify({event:"USERS", payload: Object.keys(users) }));
  });
  
  ws.on('close', () => { 
    try {
    var username = getUsername(ws);
    if ( username != "")
    {
      if (users[username].game )
        {
          console.log("Peruuta peli");
          var player2=users[username].game.player2;
          if ( users[player2] && users[player2].ws )
            users[player2].ws.send(JSON.stringify({event:"CANCELINVITE", payload: { username }}));
      }
      delete users[username];
    }
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({event:"USERS", payload: Object.keys(users) }));
    });
    } catch (e)
    {
      console.log(e.message);
    }
    console.log("Client disconnected");
  });
  
  ws.on('message', (msg) => { 
    try {
    const data=JSON.parse(msg);
    if ( !("event" in data ) )
      throw new Error("Ei event kenttää");
    if ( !("payload" in data ) )
      throw new Error("Ei payload kenttää");
       
    schemas[data.event].validateSync(data.payload);
    switch ( data.event )
      {
        case "LOGIN": loginUser(ws,data.payload); break;
        case "LOGOUT": logoutUser(ws,data.payload); break;
        case "CHAT": sendChatMessage(ws,data.payload); break;
        case "INVITE": sendInvite(ws,data.payload); break;
        case "CANCELINVITE": cancelInvite(ws,data.payload); break;
        case "REJECTINVITE": rejectInvite(ws,data.payload); break;
        case "ACCEPTINVITE": acceptInvite(ws,data.payload); break;
        case "GAME": 
          console.log("game event "+data.payload.id);
            if ( !users[data.payload.id].game ) 
              throw new Error("Käyttäjällä "+ data.payloud.id +" ei ole peliä");
            users[data.payload.id].game.event(data.payload);
        break;
      }    
    } catch (e)
    {
      var msg=e.message;
         if (e.message=="id is a required field") msg ="Peli pitää luoda ensiksi.";

     ws.send(JSON.stringify({event:"MSG", payload: { error:true, msg }}));
     console.log(e.message);
    }
  
  });
});

function sendInvite(ws,data)
{
  var username  = getUsername(ws);  
    if ( username == "" ) return;
  if ( !users[data.username] ) throw new Error("Käyttäjää "+data.username+" ei ole."); 
  
  switch ( data.game )
  {
    case "tictactoe": users[username].game = new tictactoe(users,username,data.username); break;
  }

  console.log(username+" created game");
  console.log("Game invite sent to "+ data.username +" from "+username);

  if ( users[data.username] && users[data.username].ws )
    users[data.username].ws.send(JSON.stringify({event:"INVITE", payload: { username,game:data.game}}));
}

function acceptInvite(ws,data)
{
  var username1  = getUsername(ws);   // Kuka lähetti hyväksytyn pyynnön
   var username = data.username;
 //   console.log("accept invite "+ username);
    if ( users[username] )
    {
      users[username].ws.send(JSON.stringify({event:"ACCEPTINVITE", payload: { username:username1 }}));
    }
}


function rejectInvite(ws,data)
{
    var username = data.username;
    console.log("rejectInvite "+ username);
    if ( users[username] )
    {
      users[username].ws.send(JSON.stringify({event:"REJECTINVITE", payload: { }}));
      delete users[username].game;
    }

}

function cancelInvite(ws,data)
{

  var username  = getUsername(ws);
    if ( username == "" ) return;
  console.log("Game "+username+" cancelled");
  if ( !users[username].game ) throw new Error("Peliä ei löydy käyttäjältä "+username);
    var player2 = users[username].game.player2;

  if ( users[player2] && users[player2].ws )
    users[player2].ws.send(JSON.stringify({event:"CANCELINVITE", payload: { username }}));

  delete users[username].game;
}



function sendChatMessage(ws,data)
{
  var username  = getUsername(ws);
    if ( username == "" ) return;

  wss.clients.forEach((client) => {
    client.send(JSON.stringify({event:"CHAT", payload: { username, msg: data.msg}}));
  });
}

function loginUser(ws,data)
{
  if ( data.username in users )
    throw new Error(`Nimi ${data.username} on jo varattu.`);

  var username  = getUsername(ws);
  if (username !="")  delete users[e];

  users[data.username]={ ws };
  ws.send(JSON.stringify({event:"USER", payload: data.username }));
  ws.send(JSON.stringify({event:"MSG", payload: { error:false, msg:"Tervetuloa minipeleihin "+data.username+"."}}));
  ws.send(JSON.stringify({event:"LOGINOK", payload: { }}));

  wss.clients.forEach((client) => {
        client.send(JSON.stringify({event:"USERS", payload: Object.keys(users) }));
  });
}

function logoutUser(ws,data)
{
  Object.keys(users).forEach(e => {

   if ( users[data.username] && users[data.username].ws === users[e].ws  )  
   {
      delete users[e]; 
   } 
  }); 
 
  ws.send(JSON.stringify({event:"MSG", payload: { error:false, msg:"Kiitos käynnistä."}}));
  ws.send(JSON.stringify({event:"LOGOUTOK", payload: { }} ));    
    
  wss.clients.forEach((client) => {
        client.send(JSON.stringify({event:"USERS", payload: Object.keys(users)  }));
  });
}


setInterval(() => {
  wss.clients.forEach((client) => {
    client.send( JSON.stringify( { event:"TIME", payload: new Date().toTimeString()   })  );
  });
}, 1000);
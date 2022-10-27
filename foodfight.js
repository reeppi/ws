const yup  = require("yup");
const { users, getUsername } = require('./service');

const schemas = {
    "READY": 
    yup.object().shape({
        p: yup.number().required().integer(),
        foodArmy: yup.array().of(
            yup.object().shape(
                {
                    id: yup.number().required().integer(),
                    name: yup.string().required(),
                    health: yup.number().required(),
                    attack: yup.number().required(),
                    defence: yup.number().required(),
                    delay: yup.number().required(),
                }
            )
        ).max(3, "Armeijassa liikaa joukkoja max 3")
    }),
    "NOTREADY": 
    yup.object().shape({
        p: yup.number().required().integer(),
    }),
 }

module.exports = class foodfight {

    constructor(player1_,player2_)
    {
        this.gameover=false;
        this.player1 = player1_;
        this.player2 = player2_;
        this.player1Army = [];
        this.player2Army = [];
        console.log("new foodfight game from "+this.player1);
        console.log("Waiting for "+this.player2);
    }
 
    event(payload,ws)
    {
        try {
            //Vähän viritys. riittäisi jos gameId olisi satunnainen
            var player = getUsername(ws);
            var ok=false;
            if ( player == this.player1 || player == this.player2)
                ok=true;
            if (!ok) throw new Error("Yhteys ei kuulu pelaajalle!");

            if ( !("event" in payload ) )
                throw new Error("foodfight Ei event kenttää");
            if ( !("data" in payload ) )
                throw new Error("foodfight Ei payload kenttää");
            schemas[payload.event].validateSync(payload.data);
            switch ( payload.event )
            {
                case "READY": this.setReady(payload.data); break;
                case "NOTREADY": this.setNotReady(payload.data); break;
            }
        } catch (e)
        {
            console.log("foodfight error : "+e.message);
            throw(e);
        }
    }

    setNotReady(data)
    {
        console.log("setNotReady");
        if (data.p == 0)
        {
            this.player1Army=[];
            users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"IAMNOTREADY", data: {username:this.player1}} ));
        }
        if (data.p == 1 )
        {
            this.player2Army=[];
            users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"IAMNOTREADY", data: {username:this.player2}} ));
        }
    }

    setReady(data)
    {
        console.log("Player : "+data.p);
        for (let i=0;i<data.foodArmy.length;i++)
            console.log(i+"ID:"+data.foodArmy[i].id);

        if (  data.foodArmy.length > 0 )
        {
            if ( data.p == 0  )
            {
                this.player1Army = data.foodArmy;
                users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"IAMREADY", data: {username:this.player1}} ));
                console.log("Lähetetään viesti vastustajalle että valmiita ollaan")
            }
            else
            {
                this.player2Army = data.foodArmy;
                users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"IAMREADY", data: {username:this.player2}} ));
                console.log("Lähetetään viesti vastustajalle että valmiita ollaan")
            }
        }       
        if ( this.player1Army.length > 0 && this.player2Army.length > 0 )
         this.fight();
    
         /*Testailuja varten*/
         /*
        this.player1Army = [ 
                            {id:1,name:"p1aa",health:100,attack:20,defence:1,delay:10 },
                            {id:1,name:"p1aa",health:100,attack:20,defence:1,delay:10 },
                            {id:2,name:"p1bb",health:100,attack:20,defence:1,delay:10 },
                            ]
        this.player2Army = [ 
                            {id:3,name:"p2al",health:100,attack:20,defence:1,delay:5 },
                            {id:4,name:"p2aa",health:100,attack:20,defence:1,delay:10 },
                            {id:5,name:"p2bb",health:100,attack:20,defence:1,delay:10 },
                            ]      
        this.fight();*/
    }

    fight()
    {
        var winner=0;
        var events = [];
        var events1 = [];
        var events2 = [];
        var p1=this.player1Army;
        var p2=this.player2Army;
        var tmp=0;
        var a1=0;
        var a2=0;
        var error=false;
        var p1time=p1[a1].delay;
        var p2time=p2[a2].delay;

        for (let i=0;i<p1.length;i++)
            p1[i].healthF=p1[i].health;
        for (let i=0;i<p2.length;i++)
            p2[i].healthF=p2[i].health;

        while (true) 
        {
            let damage=0;
            let health=0;
            let showTime=0;
            let showDamage=0;
            tmp++;
            if (tmp >= 600) //tmp estää ettei jäädä varmasti ikuiseen silmukkaan joka ei hyvä.
            {
                error=true;
                break;
            }

            // Arvotaan kumman vuoro jos samaan aikaan lyödään... Pientä satunnaisuuttakin tässä :)
            let a=false;
            let b=false;
            if ( p1time == p2time )
            {
                let val=Math.round(Math.random())
                if ( val==0 ) 
                    a=true;
                else  
                    b=true;
            }

            if ( p1time < p2time || a ) 
            {
                damage=p1[a1].attack*((100-p2[a2].defence)/100);
                showDamage=Math.round(damage*10)/10;
                p2[a2].health-=damage;
                health=Math.round(p2[a2].health*10)/10;
                showTime=Math.round(p1time*10)/10;
                events.push({time:showTime, msg:"P1 : "+ p1[a1].name +" hutasee vahinkoa "+showDamage+" vastustajalla jäljellä: "+health });

                events1.push({time:showTime, msg:"Sinun "+ p1[a1].name +" hutasee vahinkoa "+showDamage+" vastustajalle, "+p2[a2].name+" jäljellä "+health });
                events2.push({time:showTime, msg:"Vastustaja "+ p1[a1].name +" hutasee vahinkoa "+showDamage+" sinulle, "+p2[a2].name+" jäljellä "+health });

                if ( p2[a2].health <=0 )  {
                    events.push({time:showTime,msg:"P2 : "+ p2[a2].name +" tuupertui."});

                    events1.push({time:showTime,event:"death",msg:"Vastustajan "+ p2[a2].name +" tuupertui."});
                    events2.push({time:showTime,event:"death",msg:"Sinun "+ p2[a2].name +" tuupertui."});

                    if ( a2>=p2.length-1)
                    {
                        a2++; 
                        winner=this.player1;
                        break;
                    }
                    else
                    {
                        a2++;
                        p2time=p1time+p2[a2].delay;   
                    }
                } 
                p1time+=p1[a1].delay;
            } 
            if ( p1time > p2time || b) 
            {
                damage=p2[a2].attack*((100-p1[a1].defence)/100);
                showDamage=Math.round(damage*10)/10;
                p1[a1].health-=damage;
                health=Math.round(p1[a1].health*10)/10;
                showTime=Math.round(p2time*10)/10;
                events.push({time:showTime, msg:"P2 : "+ p2[a2].name +" hutasee vahinkoa "+showDamage+" vastustajalla jäljellä: "+health});
                
                events1.push({time:showTime, msg:"Vastustajan "+ p2[a2].name +" hutasee vahinkoa "+showDamage+" sinulle, "+p1[a1].name+" jäljellä "+health});
                events2.push({time:showTime, msg:"Sinun "+ p2[a2].name +" hutasee vahinkoa "+showDamage+" vastustajalle, "+p1[a1].name+" jäljellä "+health});

                if ( p1[a1].health <=0 )  {
                    events.push({time:showTime,msg:"P1 : "+ p1[a1].name +" tuupertui."});

                    events1.push({time:showTime,event:"death",msg:"Sinun "+ p1[a1].name +" tuupertui."});
                    events2.push({time:showTime,event:"death",msg:"Vastustajan "+ p1[a1].name +" tuupertui."});

                    if (a1>=p1.length-1)
                    {
                        a1++; 
                        winner=this.player2;
                        break;
                    }
                    else
                    {
                        a1++; 
                        p1time=p2time+p1[a1].delay;   
                    }
                } 
                p2time+=p2[a2].delay;
            } 
        }
        console.log("Rähinä alkoi!!!!");  
        /*for (let i=0;i<events.length;i++)console.log( events[i].time+ " : "+events[i].msg);*/
        
        if ( !error )
        {
            users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"RESULT", data: {log:events1,winner,score:a2+"-"+a1, army:p1, oppArmy:p2}} ));
            users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"RESULT", data: {log:events2,winner,score:a1+"-"+a2, army:p2, oppArmy:p1}} ));
        } else 
        {
            var errorEvents=[];
            errorEvents.push({time:0,event:"death",msg:"Rähisijät väsyivät ja luovuttivat. Luultavasti hiilarin eli hyökkäyksen puutetta."});
            users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"RESULT", data: {log:errorEvents,winner,score:a2+"-"+a1, army:p1, oppArmy:p2}} ));
            users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"RESULT", data: {log:errorEvents,winner,score:a1+"-"+a2, army:p2, oppArmy:p1}} ));
        }

        this.player1Army = [];
        this.player2Army = []; 
    }


}
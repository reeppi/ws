
const yup  = require("yup");

const schemas = {
    "SET": yup.object().shape( { 
        p: yup.number().required().integer(),
        x: yup.number().required().integer(),
        y: yup.number().required().integer()
    }),
  }
  
const ROWS=10;
const COLS=10;
const winCount=4;

module.exports = class tictactoe {

    constructor(users_,player1_,player2_)
    {
        this.board=Array(ROWS).fill(0).map(x => Array(COLS).fill(' '));
        console.table(this.board);
        this.users=users_;
        this.turn=0;
        this.gameover=false;
        this.player1 = player1_;
        this.player2 = player2_;
        console.log("new game from "+this.player1);
        console.log("Waiting for "+this.player2);
    }
 
    event(payload)
    {
        try {
            if ( !("event" in payload ) )
                throw new Error("TicTacToe Ei event kenttää");
            if ( !("data" in payload ) )
                throw new Error("TicTacToe Ei payload kenttää");
            schemas[payload.event].validateSync(payload.data);
            
            switch ( payload.event )
            {
                case "SET": this.setMark(payload.data); break;
            }
        } catch (e)
        {
            console.log("TicTacToe virhe : "+e.message);
        }
    }

    setMark(data)
    {
        console.log("x:"+data.x+" y:"+data.y +"p:"+data.p);
        //if (this.turn == data.p)
       
        if ( !this.gameover)
        {
            if ( this.board[data.y][data.x] != " " ) return;

            if ( this.turn == 0)
                this.turn = 1;
            else if ( this.turn == 1)
                this.turn = 0;

            if ( data.p == 0)
                this.board[data.y][data.x] = "X";
            if ( data.p == 1)
                this.board[data.y][data.x] = "0";
   
            console.table(this.board); 
            this.users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"SET", data: {x:data.x,y:data.y,p:data.p}}));
            this.users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"SET", data: {x:data.x,y:data.y,p:data.p}}));
            
          var winner="";
            winner = this.getStraightWinner();
          if ( winner =="")
            winner = this.getDiagonalWinner();
        
        if ( winner != "" )
        {
            this.gameover=true;
            var winnerName="";
            if ( winner == "X" ) winnerName=this.player1;
            if ( winner == "0" ) winnerName=this.player2;
            this.users[this.player1].ws.send(JSON.stringify({event:"GAME",event2:"GAMEOVER", data: {username:winnerName,mark:winner}}));
            this.users[this.player2].ws.send(JSON.stringify({event:"GAME",event2:"GAMEOVER", data: {username:winnerName,mark:winner}}));
        }
         
        console.log("Winner is "+winner);

        } //turn
       
    }

    getStraightWinner()
    {

        var winner="";
        var b=this.board;
        for ( let i=0;i<ROWS;i++)
        {
             winner = this.getWinnerFromLine(b[i]);
             if ( winner !="" ) return winner;
        }

        var items={}
        for ( let x=0;x<COLS;x++)
        {
            items[x]=[];
            for ( let y=0;y<ROWS;y++)
                items[x].push(b[y][x]);
        }
        console.log(items[0]);
        for ( let i=0;i<ROWS;i++)
        {
            winner = this.getWinnerFromLine(items[i]);
                if ( winner !="" ) return winner;
        }

        return "";
    }
    
    getDiagonalWinner()
    {
        var b=this.board;
        var length = COLS;
        var itemsInDiagonal = 0;
        var diagonalLines = (COLS + COLS) - 1;
        var midPoint = (diagonalLines / 2) + 1;

        var items1 = {}
        
        
        for (let i = 1; i <= diagonalLines; i++) {
            var rowIndex;
            var columnIndex;
            if (i <= midPoint) {
                itemsInDiagonal++;
                items1[i]= [];
                for (let j = 0; j < itemsInDiagonal; j++) {
                    rowIndex = (i - j) - 1;
                    columnIndex = j;
                    items1[i].push(b[rowIndex][columnIndex]);
                }
            } else {
                itemsInDiagonal--;
                items1[i]= [];
                for (let j = 0; j < itemsInDiagonal; j++) {
                    rowIndex = (length - 1) - j;
                    columnIndex = (i - length) + j;
                    items1[i].push(b[rowIndex][columnIndex]);
                }
            }
        }
        console.log(items1);
        itemsInDiagonal = 0;

        var items2 = {}
        for (let i = 1; i <= diagonalLines; i++) {
            var rowIndex;
            var columnIndex;
            if (i <= midPoint) {
                itemsInDiagonal++;
                items2[i]= [];
                for (let j = 0; j < itemsInDiagonal; j++) {
                    rowIndex = (i - j) - 1;
                    columnIndex = (length-1)-j;
                    items2[i].push(b[rowIndex][columnIndex]);
                }
            } else {
                itemsInDiagonal--;
                items2[i]= [];
                for (let j = 0; j < itemsInDiagonal; j++) {
                    rowIndex = (length-1)-j;
                    columnIndex = length-(i-length)-j-1;
                    items2[i].push(b[rowIndex][columnIndex]);
                }
            }
        }
        console.log(items2);

        var winner="";

        for (let i=1;i<=diagonalLines;i++)
        {
            winner=this.getWinnerFromLine(items1[i]);
                if (winner!="") break;
            winner=this.getWinnerFromLine(items2[i]);
                if (winner!="") break;
        }
        
        return(winner);
    }

    getWinnerFromLine(items)
    {
        var xx=0;
        var zero=0;
        for (let i=1;i<items.length;i++)
        {
            if ( items[i]== "X" && items[i-1] == "X")
            {
                xx=xx+1;
                if ( xx>=winCount )
                        return "X";
            }  else {
                xx=0;
            }
            if ( items[i]== "0" && items[i-1] == "0")
            {
                zero=zero+1;
                if ( zero>=winCount )
                    return "0";
            }  else {
                zero=0;
            }

        }
        return "";  
    }



}
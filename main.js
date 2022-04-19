var peer;
var username;
var con;
var editor;
var dest_user_id;
var crdt;
class Identifier {
    constructor(digit,site){
        this.digit=digit
        this.site=site
    }
    
}
class Char {
    constructor(Identifiers,value){
        this.position=Identifiers
        this.value=value
    }
    
}
class CRDT{
    constructor(){

        this.chars=[new Char([new Identifier(0,"0")],"$"),new Char([new Identifier(10000,"0")],"$")]
        //this.chars=[]
    }
    generateIdBetween()
    generate_pos_btw(pos1,pos2,new_pos=[]){
        let id1 = pos1[0];
        let id2 = pos2[0];
        //console.log(id2,id1)
        if (id2.digit - id1.digit > 1) {

        let newDigit = this.generateIdBetween(id1.digit, id2.digit);
        new_pos.push(new Identifier(newDigit, this.siteId));
        return new_pos;

        } else if (id2.digit - id1.digit === 1) {

        new_pos.push(id1);
        return this.generate_pos_btw(pos1.slice(1), pos2, new_pos);

        }
    }

    local_insert(value,index){
        //console.log(index)
        const prev_pos=(this.chars[index-1]&&this.chars[index-1].position)||[]
        const next_pos=(this.chars[index] && this.chars[index].position)||[];
        console.log(prev_pos,next_pos)
        const newPos=this.generate_pos_btw(prev_pos,next_pos)



    }
}
$(document).ready(function(){
    crdt=new CRDT()
    var code=$(".codemirror-textarea")[0]
    editor=CodeMirror.fromTextArea(code,{
        lineNumbers:true,
        lineWrapping:true
    });
    $("#username_submit_id").on("click",function(){
        test1()
    })
    $("#destid_submit_id").on("click",function(){
        test2()
    })
    editor.on('keyup',function(cMirror,event){
        data=cMirror.getValue()
        ch=event.key
        start_cursor = editor.getCursor();
        //console.log(start_cursor)
        crdt.local_insert(ch,start_cursor.line)
        con.send(data)
        
    })


});
function test1(){
    username=document.getElementById("Username").value
    peer=new Peer(username,{
        host:'localhost',
        port:9000,
        path:"/myapp"
    });

    peer.on("open",function(id){
        console.log("My peer id is ",id)
        })
    peer.on("connection",function(conn){
        con=conn
        conn.on("open",function(){    
            conn.on("data",function(data){
                test3(data)
        });
        
        });
        
    
    });
}
function test2(){
    console.log("inside test 2")
    dest_user_id=document.getElementById("Connect_to").value
    con=peer.connect(dest_user_id)
    con.on("open",function(){
        con.on("data",function(data){
            //document.getElementById("last_msg").innerHTML=data
            test3(data)
        })
        alert("connected")
        
    });
    
}
function test3(data){
    editor.setValue(data)

    
}
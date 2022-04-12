var peer;
var username;
var con;
var editor;
var dest_user_id;
$(document).ready(function(){
    var code=$(".codemirror-textarea")[0]
    editor=CodeMirror.fromTextArea(code,{
        lineNumbers:true
    });
    $("#username_submit_id").on("click",function(){
        test1()
    })
    $("#destid_submit_id").on("click",function(){
        test2()
    })
    console.log(editor)
    editor.on('keyup',function(cMirror,event){
        data=cMirror.getValue()
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
var username;
var peer;
var con;
var lines=[]
var cur_line=0
var cur_pos=0

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
            
                document.getElementById("last_msg").innerHTML=data
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
            document.getElementById("last_msg").innerHTML=data
        })
        alert("connected")
        
    });
    
}
function send(){
    var msg=document.getElementById("msg").value
    con.send(msg)
    document.getElementById("msg").innerHTML="";
}

function test(event){
    
    document.getElementById("last_key_code").innerHTML=event.key
    switch(event.keyCode)
    {
        case 37:
        {
            if(cur_pos>0) {
                cur_pos-=1
            }
            else{
                if(cur_line!=0)
                {
                    cur_line-=1
                    cur_pos=lines[cur_line]
                }
            }
            break
        }
        case 38://top
        {
            if(cur_line>0)
            {
                cur_line-=1
                if(cur_pos>lines[cur_line])
                    cur_pos=lines[cur_line]
            }
            break
        }
        case 39://right
            {
                if(cur_pos<lines[cur_line])
                    cur_pos+=1
                else
                {
                    if(cur_line!=lines.length-1)
                    {
                        cur_line+=1
                        cur_pos=0
                    }
                }
                break
            }
        case 40://down
            {
                if(cur_line<lines.length-1)
                {
                    cur_line+=1
                    if(cur_pos>lines[cur_line])
                    {
                        cur_pos=lines[cur_line]
                    }
                }
                break
            }
        case 13://enter
            {
                
                let x=lines[cur_line]
                console.log("total chars",x)
                console.log("current line "+cur_line)
                lines[cur_line]=cur_pos
                lines.splice(cur_line+1,0,x-cur_pos)
                console.log(lines)
                cur_line+=1
                cur_pos=0
                break
            }
        default:
            {
                if(lines.length==0)
                {
                    lines.push(1)
                    cur_pos=1
                }
                else{
                    lines[cur_line]+=1
                    cur_pos+=1
                }
            }
    }
    document.getElementById("cursor_details").innerHTML="cursor_line:"+cur_line+" cursor_position:"+cur_pos
    temp=" "
    for(let i=0;i<lines.length;++i)
    {
        temp=temp+lines[i]+" "
    }
    document.getElementById("editor_details").innerHTML="editor details"+temp


}
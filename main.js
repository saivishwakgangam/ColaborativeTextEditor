var peer;
var username;
var con;
var editor;
var dest_user_id;
var crdt;
var cmanager;
class Identifier {
    constructor(digit,site){
        this.digit=digit
        this.site=site
    
    }
    compare(id)
    {
        if(this.digit<id.digit)
        return -1;
        else
        {
            if(this.digit>id.digit) return 1;
            else
            if(this.site<id.site) return -1;
            else 
            if(this.site>id.site) return 1;
            else
            return 0;
        }

    }
    
}
class Char {
    constructor(Identifiers,value){
        this.position=Identifiers
        this.value=value
    }
    tofloat()
    {
        out=""
        out=this.position[0].digit+"."
        for(let i=1;i<this.position.length;++i)
        {
            out=out+this.position[i].digit
        }
        return out
    }
    compare(char)
    {
        var pos1=this.position
        var pos2=char.position

        var min_length=Math.min(pos1.length,pos2.length)
        for(let i=0;i<min_length;++i)
        {
            var id1=pos1[i]
            var id2=pos2[i]

            var res=id1.compare(id2)
            if(res!=0)
            return res
        }

        if(pos1.length<pos2.length)
        return -1;
        else
        {
            if(pos1.length>pos2.length)
            return 1;
            else
            return 0;
        }
    }
    
}
class CRDT{
    constructor(cmanager){
        this.chars=[[]]
        this.cmanager=""

    }
    
    getPreviousPosition(pos)
    {
        var ch=pos.ch
        var line=pos.line
        if(ch==0 && line==0)
        {
            return []
        }
        else
        {
            if(ch==0 && line!=0)
            {
                line=line-1;
                ch=this.chars[line].length;  
            }
        }
        return this.chars[line][ch-1].position 
    }

    getNextPosition(pos){
        var ch=pos.ch
        var line=pos.line
        var totallines=this.chars.length;
        var numchars;
        if(this.chars[line] === undefined)
        {
            numchars=0
        }
        else
        {
            numchars=this.chars[line].length
        }

        if((line==totallines-1) && (ch==numchars))
            return []
        else
        {
            if((line<totallines-1)&&ch==numchars)
            {
                line=line+1
                ch=0
            }
            else
            {
                if(line>totallines-1 && ch==0)
                    return []
            }
        }
        return this.chars[line][ch].position
    }

    generate_pos_btw(prev_pos,next_pos,new_pos=[])
    {
        console.log(this.cmanager.username)
        var id1=prev_pos[0] || new Identifier(0,this.cmanager.username)
        var id2=next_pos[0] || new Identifier(9999,this.cmanager.username)

        if(id2.digit-id1.digit>1)   
        {
            var digit=this.generateId(id1.digit,id2.digit)
            new_pos.push(new Identifier(digit,this.cmanager.username))
            return new_pos
        }
        else
        {
            if(id2.digit-id1.digit==1)
            {
                new_pos.push(id1)
                // console.log("appended",new_pos)
                this.generate_pos_btw(prev_pos.slice(1),[],new_pos)
                return new_pos
            }
            else
            {
                new_pos.push(id1)
                if(id1.site==id2.site)
                this.generate_pos_btw(prev_pos.slice(1),next_pos.slice(1),new_pos)
                else
                this.generate_pos_btw(prev_pos.slice(1),[],new_pos)
                return new_pos
            }
        }

    }
    generateId(digit1,digit2)
    {
        if(digit2-digit1<10)
        {
            digit1=digit1+1
        }
        else
        {
            digit1=digit1+1
            digit2=digit1+10
        }

        return Math.floor(Math.random()*(digit2-digit1))+digit1
    }

    local_insert(value,pos){
        
        const prev_pos=this.getPreviousPosition(pos)
        console.log("previous pos",prev_pos)
        const next_pos=this.getNextPosition(pos)
        console.log("next pos",next_pos)
        const newPos=this.generate_pos_btw(prev_pos,next_pos)
        console.log("new position",newPos)
        var newchar= new Char(newPos,value)
        console.log(newchar)
        this.insertchar(newchar,pos)
        if(this.cmanager.connections.length>0)
            this.cmanager.senddata(newchar)
        
    }

    insertchar(char,pos)
    {
        // new line
        if(pos.line==this.chars.length)
            this.chars.push([])
        if(char.value=='\n')
        {
            var lineafter=this.chars[pos.line].splice(pos.ch)
            if(lineafter.length==0)
                this.chars[pos.line].splice(pos.ch,0,char)
            else{
                var linebefore=this.chars[pos.line].concat(char)
                this.chars.splice(pos.line,1,linebefore,lineafter)
            }
        }
        else{
            this.chars[pos.line].splice(pos.ch,0,char)
        }
    }
    remote_insert(char)
    {
        var res=this.findinsert(char)
        console.log(res)
        var pos={'line':res[0],'ch':res[1]}
        this.insertchar(char,pos)
        editor.replaceRange(char.value,pos,pos,'remote')
    }
    remote_delete(char)
    {
        var res=this.find(char)
        console.log("delete position",res)
        if(!res) return;
        var pos={'line':res[0],'ch':res[1]}
        var to;
        
        if(char.value=='\n')
        {
            to={'line':res[0]+1,'ch':0}
            console.log("rd",pos)
            if(res[0]+1<this.chars.length)
                this.chars[res[0]]=this.chars[res[0]].concat(this.chars[res[0]+1])
            this.chars[res[0]].splice(res[1],1)
            this.chars.splice(res[0]+1,1)
        }
        else
        {
            to={'line':res[0],'ch':res[1]+1}
            this.chars[res[0]].splice(res[1],1)
            if(this.chars[res[0]].length==0)
                this.chars.splice(res[0],1)
        }
        editor.replaceRange("",{'line':res[0],'ch':res[1]},to,"+remote_dlt")

    }

    find(char)
    {
        var min_line_no=0
        var max_line_no=this.chars.length-1
        var last_line=this.chars[max_line_no]
        var cur_line=0

        console.log("first compare",char.compare(this.chars[0][0]))
        if(this.chars.length==0 || this.chars[0].length==0 || char.compare(this.chars[0][0])==-1)
            return false

        var lastchar=last_line.at(-1)
        if(char.compare(lastchar)==1)
        return false

        while(min_line_no<max_line_no-1)
        {
            cur_line=Math.floor((min_line_no+max_line_no)/2)
            lastchar=this.chars[cur_line].at(-1)
            if(char.compare(lastchar)==0)
                return [cur_line,this.chars[cur_line].length-1]
            else
            {
                if(char.compare(lastchar)==1)
                min_line_no=cur_line
                else
                max_line_no=cur_line
            }
        }
        var lcmin=this.chars[min_line_no].at(-1)
        var lcmax=this.chars[max_line_no].at(-1)

        if(char.compare(lcmin)<=0)
        {
            console.log(min_line_no)
            var ch=this.findcharinline(char,min_line_no)
            console.log("hiiiii",ch)
            if(ch===false){
                return false
            }
            return [min_line_no,ch]
        }
        else
        {
            var ch=this.findcharinline(char,max_line_no)
            if(ch===false){
                return false
            }
            return [max_line_no,ch]

        }
    }

    

    findinsert(char)
    {
        var min_line_no=0
        var max_line_no=this.chars.length-1
        var last_line=this.chars[max_line_no]
        var cur_line=0
        
        //console.log("debug",char.compare(this.chars[0][0]))
        
        if(this.chars.length==0 || this.chars[0].length==0 || char.compare(this.chars[0][0])==-1)
            return [0,0]
        
        var lastchar=last_line.at(-1)
        // console.log("comparison with last character",char.compare(lastchar),lastchar)
        if(char.compare(lastchar)==1)
        {
            if(lastchar.value=='\n')
                return [max_line_no+1,0]
            else
                return [max_line_no,this.chars[max_line_no].length]
        }

        while(min_line_no<max_line_no-1)
        {
            cur_line=Math.floor( (min_line_no+max_line_no)/2)
            
            lastchar=this.chars[cur_line].at(-1)
            console.log("--------")
            console.log(char)
            console.log(lastchar)
            console.log(char.compare(lastchar))
            console.log("-------")
            if(char.compare(lastchar)==-1)
                max_line_no=cur_line
            else
            {
                if(char.compare(lastchar)==1)
                    min_line_no=cur_line
                else
                    return [cur_line,this.chars[cur_line].length-1]
            }
        }

        var lcmin=this.chars[min_line_no].at(-1)
        var lcmax=this.chars[max_line_no].at(-1)

        if(char.compare(lcmin)==-1)
        {
            var ch=this.findindexinline(char,min_line_no)
            return [min_line_no,ch]
        }
        else{
            var ch=this.findindexinline(char,max_line_no)
            return [max_line_no,ch]
        }

    }

    findcharinline(char,line_no)
    {

        var low=0
        var high=this.chars[line_no].length-1
        var line=this.chars[line_no]
        console.log(low,high,line)
        if(line.length==0 || char.compare(line[0])==-1)
        return false;

        if(char.compare(line[high])==1)
        return false

        while(low+1<high)
        {
            var mid=Math.floor((low+high)/2)
            if(char.compare(line[mid])==0)
            return mid
            else
            {
                if(char.compare(line[mid])==-1)
                high=mid
                else
                low=mid
            }
        }
        console.log("low",low,char.compare(line[low]))
        console.log("high",high,char.compare(line[high]))
        if(char.compare(line[low])==0)
        return low
        if(char.compare(line[high])==0)
        return high
        return false

    }

    findindexinline(char,line_no)
    {
        var low=0
        var high=this.chars[line_no].length-1
        var line=this.chars[line_no]

        // console.log(line[low])
        console.log(line[high])
        console.log("comparison with first character",char.compare(line[0]))
        
        if(line.length==0 || char.compare(line[0])==-1)
            return 0
        
        console.log(char)

        if(char.compare(line[high])==1)
        {
            return high+1
        }   
        while(low+1<high)
        {
            var mid=Math.floor((low+high)/2)
            
            if(char.compare(line[mid])==-1)
                high=mid
            else
            {
                if(char.compare(line[mid])==1)
                    low=mid
                else
                    return mid
            }
        }

        if(char.compare(line[low])==0)
        return low
        else
        return high
    }

    tostring()
    {
        var res=""
        crdt.chars.forEach(line => {
            line.forEach(char => {
                res=res+char.value
            });
        });
        return res
    }
}


class ConnectionManager
{
    constructor(username)
    {
        this.username=username
        this.connections=[]
    }
    addConnection(conn)
    {
        this.connections.push(conn)
    }
    initialize(conn)
    {
        var op=JSON.stringify({'method':'initialize','data':crdt.chars})
        conn.send(op)
    }
    senddata(charobj)
    {
        this.connections.forEach(conn => {
            var op=JSON.stringify({'method':'remote_insert','data':charobj})
            conn.send(op)
        });
    }
    broadcast(charobj,parent,method)
    {
        var op=JSON.stringify({'method':method,'data':charobj})
        this.connections.forEach(conn => {
            if(conn!=parent)
            conn.send(op)
        })
    }
}

$(window).on('beforeunload',function(){
    msg=JSON.stringify({'method':'close','data':username})
    crdt.cmanager.connections.forEach(conn => {
    conn.send(msg)
    });
    return null
})


$(document).ready(function(){
    $(".card_connect").hide()
    crdt=new CRDT(cmanager)
    var code=$(".codemirror-textarea")[0]
    editor=CodeMirror.fromTextArea(code,{
        lineNumbers:true,
        lineWrapping:true,
        readOnly:true,
        smartIndent:false,
        theme:'freckle'
    });
    editor.setSize(null,500)
    $("#create").on("click",function(){

        x=test1()
        if(x==true){
            $(".card_username").hide()
        }
        
    });
    $("#connect").on("click",function(){
        username
        x=test1()
        if(x==true){
            $(".card_username").hide()
            $(".card_connect").show()
        }
    });

    $("#destid_submit_id").on("click",function(){
        $(".card_connect").hide()
        test2()
    });   
    
    editor.on('change',function(cMirror,changeobj){
        
        console.log("change",changeobj)
        if(changeobj.origin=="+input")
        {
            var ch=changeobj.text[0]
            if(ch=="")
            {
                ch="\n"
            }
            crdt.local_insert(ch,changeobj.from)
            console.log('crdt after local insert')
            console.log(crdt.chars)
        }
        else{
            if(changeobj.origin=="+delete")
            {
                line=changeobj.from.line
                ch=changeobj.from.ch
                console.log("line",line,"char pos",ch)
                console.log("deleted",crdt.chars[line][ch].value)
                if(crdt.chars[line][ch].value=='\n')
                {
                    if(line+1<crdt.chars.length)
                    crdt.chars[line]=crdt.chars[line].concat(crdt.chars[line+1])  //\nl3
                    console.log("concat",crdt.chars[line])
                    crdt.chars.splice(line+1,1)
                }
                to_send_char=crdt.chars[line][ch]
                console.log('to send char',to_send_char)
                crdt.chars[line].splice(ch,1)
                if(crdt.chars[line].length==0)
                    crdt.chars.splice(line,1)
                var op=JSON.stringify({'method':'remote_delete','data':to_send_char})
                crdt.cmanager.connections.forEach(conn => {
                    conn.send(op)
                });
                console.log('crdt after local delete')
                console.log(crdt.chars)
            }
        }
    });

});

function create_peer()
{
    username=document.getElementById("Username").value
    if(username=="")
    {
        alert("please enter username")
        return false;
    }
    else
    {
        peer=new Peer(username,{
            host:'10.171.247.143',
            port:9000,
            path:"/myapp",
            debug:3
        })
        peer.on("open",function(id){
            console.log("My peer id is ",id)
            })
        peer.on("connection",function(conn){
            var con=conn
            console.log(conn)
            conn.on("open",function(){   
                console.log("recieved connection",conn)
                cmanager.connections.push(conn)
                cmanager.initialize(conn)
                conn.on("data",function(data){
                    data=JSON.parse(data)
                    console.log(data['method'])
                    if(data['method']=='initialize')
                    {
                        crdt.chars=[]
                        for(let i=0;i<data['data'].length;++i)
                        {
                            var line=data['data'][i]
                            crdt.chars.push([])
                            for(let j=0;j<line.length;++j)
                            {
                                var x=line[j]
                                var identifier_list=[]
                                for(let k=0;k<x.position.length;++k)
                                {
                                    var identifier=new Identifier(x.position[k].digit,x.position[k].site)
                                    identifier_list.push(identifier)
                                }
                                var char=new Char(identifier_list,x.value)
                                crdt.chars[i].push(char)
                            }
                        }
                        editor.setValue(crdt.tostring)
                    }
                    else
                    {
    
                        if(data['method']=='remote_insert')
                        {
                            var id_list=[]
                            var temp=data['data']
                            for(let i=0;i<temp.position.length;++i)
                            {
                                var id=new Identifier(temp.position[i].digit,temp.position[i].site)
                                id_list.push(id)
                            }
                            var char=new Char(id_list,temp.value)
                            crdt.cmanager.broadcast(char,conn,data['method'])
                            console.log('remote_insert',char)
                            console.log('before remote_insert',crdt.chars)
                            //a=editor.getCursor()
                            crdt.remote_insert(char)
                            //editor.setCursor(a)
                            console.log('after remote insert',crdt.chars)
                            // adding to see 
                        }
                        else
                        {
                            if(data['method']=='remote_delete')
                            {
                                var id_list=[]
                                var temp=data['data']
                                for(let i=0;i<temp.position.length;++i)
                                {
                                    var id=new Identifier(temp.position[i].digit,temp.position[i].site)
                                    id_list.push(id)
                                }
                                var char=new Char(id_list,temp.value)
                                crdt.cmanager.broadcast(char,conn,data['method'])
                                console.log('remote_delete',char)
                                // console.log('remote delete crdt',crdt.chars)
                                // console.log('')
                                crdt.remote_delete(char)
                                console.log('after remote delete crdt',crdt.chars)
                            }
                            else
                            {
                                if(data['method']=='connect')
                                {
                                    connect(data['data'])
                                }
                            }
                        }
                    }
            });
            
            });
        });
        return true
    }
}



function connect(peerId)
{
    con=peer.connect(peerId)
    con.on("open",function(){
        crdt.cmanager.connections.push(con)
        con.on("data",function(data){
            //document.getElementById("last_msg").innerHTML=data
            data=JSON.parse(data)
            console.log(data['method'])
            if(data['method']=='initialize')
            {
                crdt.chars=[]
                for(let i=0;i<data['data'].length;++i)
                {
                    line=data['data'][i]
                    crdt.chars.push([])
                    for(let j=0;j<line.length;++j)
                    {
                        x=line[j]
                        identifier_list=[]
                        for(let k=0;k<x.position.length;++k)
                        {
                            identifier=new Identifier(x.position[k].digit,x.position[k].site)
                            identifier_list.push(identifier)
                        }
                        char=new Char(identifier_list,x.value)
                        crdt.chars[i].push(char)
                    }
                }
                console.log(crdt.chars)
                editor.setValue(crdt.tostring())
            }
            else
            {
                if(data['method']=='remote_insert')
                {
                    var id_list=[]
                    var temp=data['data']
                    for(let i=0;i<temp.position.length;++i)
                    {
                        var id=new Identifier(temp.position[i].digit,temp.position[i].site)
                        id_list.push(id)
                    }
                    
                    
                    var char=new Char(id_list,temp.value)
                    crdt.cmanager.broadcast(char,con,data['method'])
                    //a=editor.getCursor()
                    crdt.remote_insert(char)
                    //editor.setCursor(a)
                    console.log("after insertion",crdt.chars)
                }
                else
                {
                    if(data['method']=='remote_delete')
                    {
                        var id_list=[]
                        var temp=data['data']
                        console.log(temp)
                        for(let i=0;i<temp.position.length;++i)
                        {
                            var id=new Identifier(temp.position[i].digit,temp.position[i].site)
                            id_list.push(id)
                        }
                        var char=new Char(id_list,temp.value)
                        crdt.cmanager.broadcast(char,con,data['method'])
                        console.log('remote_delete',char)
                        // console.log('remote delete crdt',crdt.chars)
                        crdt.remote_delete(char)
                        console.log('after remote delete crdt',crdt.chars)
                    }
                    else
                    {
                        if(data['method']=='close')
                            {
                                
                            }
                    }
                }
            }
        })
        alert("connected")
        return true
        
    });
    con.on("error",function(e){
        alert(e.type)
        return false
    })
}

function test1(){
    console.log(crdt.cmanager)
    editor.setOption('readOnly',false)
    username=document.getElementById("Username").value
    cmanager=new ConnectionManager(username)
    crdt.cmanager=cmanager
    console.log(crdt.cmanager)
    x=create_peer()
    if(x==false){
        editor.setOption('readOnly',true);
        return false
    }
    else{
        return true
    }

}

function test2(){
    
    editor.setOption('readOnly',false)
    dest_user_id=document.getElementById("Connect_to").value
    connect(dest_user_id)
}
function test3(data){
    editor.setValue(data)
}

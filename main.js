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
    constructor(){
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
        this.chars[res[0]].splice(res[1],1)
        var to;
        if(char.value=='\n')
            to={'line':res[0]+1,'ch':0}
        else
            to={'line':res[0],'ch':res[1]+1}
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

        if(char.compare(lcmin)==-1)
        {
            var ch=this.findcharinline(char,min_line_no)
            return [min_line_no,ch]
        }
        else
        {
            var ch=this.findcharinline(char,max_line_no)
            return [max_line_no,ch]

        }
    }

    

    findinsert(char)
    {
        var min_line_no=0
        var max_line_no=this.chars.length-1
        var last_line=this.chars[max_line_no]
        var cur_line=0
        
        console.log("debug",char.compare(this.chars[0][0]))
        
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

        if(line.length==0 || char.compare(line[0])==-1)
        return false;

        if(char.compare(line[high])==1)
        return false

        while(low+1<high)
        {
            var mid=Math.floor((low+high)/2)
            if(char.compare(line[mid])==0)
            return [line_no,mid]
            else
            {
                if(char.compare(line[mid])==-1)
                high=mid
                else
                low=mid
            }
        }
    
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
}


$(document).ready(function(){
    crdt=new CRDT(cmanager)
    var code=$(".codemirror-textarea")[0]
    editor=CodeMirror.fromTextArea(code,{
        lineNumbers:true,
        lineWrapping:true
    });

    $("#username_submit_id").on("click",function(){
        test1()
    });

    $("#destid_submit_id").on("click",function(){
        test2()
    });

    
    editor.on('change',function(cMirror,changeobj){
        
        console.log(changeobj)
        if(changeobj.origin=="+input")
        {
            var ch=changeobj.text[0]
            if(ch=="")
            {
                ch="\n"
            }
            crdt.local_insert(ch,changeobj.from)
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

                    crdt.chars[line]=crdt.chars[line].concat(crdt.chars[line+1])
                    console.log("concat",crdt.chars[line])
                    crdt.chars.splice(line+1)
                }
                to_send_char=crdt.chars[line][ch]
                console.log('to send char',to_send_char)
                crdt.chars[line].splice(ch,1)
                crdt.cmanager.connections.forEach(conn => {
                    var op=JSON.stringify({'method':'remote_delete','data':to_send_char})
                    conn.send(op)
                });
                
            }
        }
        console.log(crdt.chars)
    });

    


});
function test1(){
    
    username=document.getElementById("Username").value
    cmanager=new ConnectionManager(username)
    crdt.cmanager=cmanager
    peer=new Peer(username,{
        host:'10.2.133.29',
        port:9000,
        path:"/myapp"
    });
    peer.on("open",function(id){
        console.log("My peer id is ",id)
        })
    peer.on("connection",function(conn){
        con=conn
        conn.on("open",function(){   
            cmanager.connections.push(con)
            cmanager.initialize(con)
            
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
                        crdt.remote_insert(char)
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
                            console.log(char)
                            crdt.remote_delete(char)
                        }
                    }
                }
        });
        
        });
        
    
    });
}

function test2(){
    console.log("inside test 2")
    dest_user_id=document.getElementById("Connect_to").value
    con=peer.connect(dest_user_id)
    console.log(con)
    con.on("open",function(){
        cmanager.connections.push(con)
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
                    crdt.remote_insert(char)

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
                        crdt.remote_delete(char)
                    }
                }
            }
        })
        alert("connected")
        
    });
    
}
function test3(data){
    editor.setValue(data)

    
}

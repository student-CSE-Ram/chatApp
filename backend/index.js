const express = require('express');
const app = express();

const {Server} = require('socket.io');

const http = require('http');

const server = http.createServer(app);
const cors = require('cors');
const { timeStamp } = require('console');
const { title } = require('process');

app.use(express.json())

const io = new Server(server, {
    cors : {
        origin: '*',
        methods: ['GET','POST'],
    },
})


// creating a connection

const agents = [];

const  customers = {};

io.on('connection', (socket) =>{
    console.log("User connected",socket.id);
    

    socket.on('set-role',({role,username})=>{
        socket.username = username;
        socket.role = role;
        if (role === "agent") {
            agents.push({socketId: socket.id, username, status: "free"})
            console.log(`Agent joined :${username}`);
        }else{
            console.log(`Customer joined : ${username}`);
        }
    });

    socket.on('customer-message' , (msg) =>{
        
    // If customer already has an assigned agent, send directly
    if (customers[socket.id]) {
        const agentId = customers[socket.id];
        io.to(agentId).emit('chat-message', {
            sender: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        socket.emit('chat-message', {
            sender: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        return; // Don't search for new agent
    }

    //  If no agent assigned yet, find a free one
    let agent = agents.find((a) => a.status === "free");

    if (agent) {
        customers[socket.id] = agent.socketId;
        agent.status = "busy";

        // send msg to agent
        io.to(agent.socketId).emit('chat-message', {
            sender: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // also send back to the customer
        socket.emit('chat-message', {
            sender: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        setTimeout(() => {
            socket.emit('chat-message',{
                sender: "System",
                text: `Agent is connected ${agent.username}`,
                time: new Date().toLocaleTimeString([],{hour:'2-digit', minute: "2-digit"})
            })
        }, 2000); 

        }else{
            socket.emit('chat-message',{
                sender: "System",
                text: "Agent are connecting , pls wait",
                time: new Date().toLocaleTimeString([],{hour: '2-digit', minute: '2-digit'})
            })
        }  
        
    })

    socket.on('agent-message', (msg) =>{
        let customerId = Object.keys(customers).find((custId) => customers[custId] === socket.id);

        if (customerId) {
            //send msg to the customer

            io.to(customerId).emit('chat-message',{
                sender : socket.username,
                text: msg,
                time: new Date().toLocaleTimeString([],{hour: "2-digit", minute: '2-digit'})
            });

            socket.emit('chat-message',{
                sender: socket.username,
                text: msg,
                time: new Date().toLocaleTimeString([],{hour:'2-digit', minute: "2-digit"})
            })
        }
    });

    socket.on('end-message', () =>{
        let customerId = Object.keys(customers).find((custId) => custId === socket.id);

        let agent = agents.find((a) => a.socketId === socket.id)

        if (agent) {
            agent.status = "free"
        }

        if (customerId) {
            delete customers[customerId]
        }
    });


    socket.on('disconnect',() =>{
        console.log(`User disconnected",${socket.username || socket.id}`);


        let agentIndex = agents.findIndex((a) => a.socketId === socket.id);
    if (agentIndex !== -1) {
      agents.splice(agentIndex, 1);
    }


        if (customers[socket.id]) {
      let agentId = customers[socket.id];
      let agent = agents.find((a) => a.socketId === agentId);
      if (agent) {
        agent.status = "free";
      }
      delete customers[socket.id];
    }
    });


    
});

server.listen(9000, ()=>{
    console.log("Server is running on port 9000");
});



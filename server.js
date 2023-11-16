const { PeerServer } = require('peer');
const peerServer = PeerServer({ port: 9000, path: '/myapp' });
console.log("started peer server")
peerServer.on('connection', (client) => { console.log(client) });
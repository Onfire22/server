import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const users = {}; // { username: WebSocket }

wss.on('connection', (ws) => {
	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message);
			if (data.type === 'register') {
				users[data.username] = ws;
				ws.username = data.username;
				console.log(`${data.username} connected`);
			} else if (data.type === 'message' && data.to && data.content) {
				const recipient = users[data.to];
				if (recipient) {
					recipient.send(JSON.stringify({ from: ws.username, content: data.content }));
				}
			}
		} catch (err) {
			console.error('Invalid message format', err);
		}
	});
	
	ws.on('close', () => {
		if (ws.username) {
			delete users[ws.username];
			console.log(`${ws.username} disconnected`);
		}
	});
});

server.listen(3000, () => {
	console.log('Server is running on port 3000');
});

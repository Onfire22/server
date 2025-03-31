import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import webpush from 'web-push';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const corsOptions = {
	origin: 'https://onfire22.github.io',
	methods: ['GET', 'POST'],
	allowedHeaders: ['Content-Type'],
};

app.use(express.json());
app.use(cors(corsOptions));

const users = {};
const subscriptions = {};

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
	'mailto:your-email@example.com',
	VAPID_PUBLIC_KEY,
	VAPID_PRIVATE_KEY
);

app.post('/subscribe', (req, res) => {
	const { username, subscription } = req.body;
	subscriptions[username] = subscription;
	console.log(`Пользователь ${username} подписался на push`);
	res.status(201).json({ message: 'Подписка успешна' });
});

wss.on('connection', (ws) => {
	ws.on('message', async (message) => {
		try {
			const data = JSON.parse(message);
			
			if (data.type === 'register') {
				users[data.username] = ws;
				ws.username = data.username;
				console.log(`${data.username} подключился`);
			}
			else if (data.type === 'message' && data.to && data.content) {
				const recipient = users[data.to];
				
				if (recipient) {
					recipient.send(JSON.stringify({ from: ws.username, content: data.content }));
				}
				else if (subscriptions[data.to]) {
					const payload = JSON.stringify({
						title: `Новое сообщение от ${ws.username}`,
						body: data.content,
						requireInteraction: true,
						actions: [
							{ action: "open", title: "Открыть" }
						],
					});
					
					const options = {
						TTL: 0,
						urgency: 'high',
					};
					
					try {
						await webpush.sendNotification(subscriptions[data.to], payload, options);
						console.log(`Push-уведомление отправлено ${data.to}`);
					} catch (error) {
						console.error('Ошибка отправки push:', error);
					}
				} else {
					console.log(`Пользователь ${data.to} не в сети и не подписан на push`);
				}
			}
		} catch (err) {
			console.error('Ошибка обработки сообщения', err);
		}
	});
	
	ws.on('close', () => {
		if (ws.username) {
			delete users[ws.username];
			console.log(`${ws.username} отключился`);
		}
	});
});

server.listen(3000, () => {
	console.log('Server is running on port 3000');
});

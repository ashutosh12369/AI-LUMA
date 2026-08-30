const url = 'https://ailuma-agent-service.onrender.com/chat';
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': '64e8b3b4f3b8908f51ab11e4'
  },
  body: JSON.stringify({
    prompt: 'hi',
    conversationId: '64e8b3b4f3b8908f51ab11e4',
    agent: 'chat',
    isAutonomous: false
  })
}).then(async r => {
  console.log('STATUS:', r.status);
  console.log('TEXT:', await r.text());
}).catch(console.error);

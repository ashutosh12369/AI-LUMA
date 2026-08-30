const url = 'https://ailuma-agent-service.onrender.com/chat';
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'test-user-id'
  },
  body: JSON.stringify({
    prompt: 'hi',
    conversationId: 'test-convo',
    agent: 'auto',
    isAutonomous: false
  })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(console.error);

const url = 'https://ailuma-chat-service.onrender.com/save-message';
fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    conversationId: 'test-convo',
    role: 'user',
    content: 'hi'
  })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(console.error);

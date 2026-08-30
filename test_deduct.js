async function test() {
  try {
    const r = await fetch('https://ailuma-auth-service.onrender.com/internal/deduct-credits', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: '64e8b3b4f3b8908f51ab11e4',
        agent: 'chat'
      })
    });
    console.log(r.status, await r.text());
  } catch(e) {
    console.log(e.message);
  }
}
test();

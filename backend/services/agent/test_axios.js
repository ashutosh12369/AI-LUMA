import axios from "axios";
async function test() {
  try {
    await axios.get('undefined/get-messages/test-convo');
  } catch(e) {
    console.log("STATUS:", e.status);
    console.log("MESSAGE:", e.message);
  }
}
test();

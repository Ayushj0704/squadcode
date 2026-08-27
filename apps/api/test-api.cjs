const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://localhost:8080/api/auth/sync', {
      username: 'Mayank_lakra', // Same as db
      email: 'mayanklakra2006@gmail.com'
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.status, err.response?.data);
  }
}
run();

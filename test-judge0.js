async function test() {
  try {
    const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: "print(1)",
        language_id: 71,
        stdin: "",
      }),
    });
    console.log("Status:", response.status);
    console.log("Body:", await response.text());
  } catch(e) {
    console.error(e);
  }
}
test();

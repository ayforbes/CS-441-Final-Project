

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public')); // Serve static files


app.post("/api/poem", async (req, res) => {
  const { country, cause, deaths, year } = req.body;
  const prompt = `Write a short, reflective poem about the impact of ${cause} in ${country} during ${year}, where the data shows ${deaths} deaths. Evoke a sense of melancholy and hope. This should be no longer than 3-4 sentences. Do not use the word "hope"`;

  try {
    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a creative poet." },
          { role: "user", content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7
      })
    });

    const data = await apiResponse.json();

    if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
      const poem = data.choices[0].message.content.trim();
      res.json({ poem });
    } else {
      console.error("Unexpected API response:", data);
      res.status(500).json({ error: "Unexpected API response" });
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).json({ error: "Failed to fetch poem" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
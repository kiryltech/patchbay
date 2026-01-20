import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001; // Using a different port to avoid conflict with the actual proxy

app.use(cors());
app.use(express.json());

// --- Mock OpenAI Endpoint ---
app.post('/api/openai/v1/chat/completions', (req, res) => {
  console.log('[Mock Server] Received OpenAI request');
  setTimeout(() => {
    res.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'This is a **mock** response from `GPT-5 Mini`.',
          },
        },
      ],
    });
  }, 500); // 500ms delay
});

// --- Mock Gemini Endpoint ---
app.post('/api/google/v1beta/models/:model:generateContent', (req, res) => {
    console.log('[Mock Server] Received Gemini request for model:', req.params.model);
    setTimeout(() => {
        res.json({
            candidates: [
                {
                    content: {
                        parts: [
                            {
                                text: 'This is a *mock* response from `Gemini 3 Flash`.',
                            },
                        ],
                    },
                },
            ],
        });
    }, 700); // 700ms delay
});


app.listen(port, () => {
  console.log(`Mock AI server is running on http://localhost:${port}`);
});

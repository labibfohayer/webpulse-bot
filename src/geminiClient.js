const https = require('https');

const FALLBACK_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest'
];

async function callSingleGemini(modelName, body, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
            resolve(json.candidates[0].content.parts[0].text.trim());
          } else if (json.error) {
            reject(new Error(`[${modelName}] ${json.error.message || 'API error'}`));
          } else {
            resolve('ধন্যবাদ আপনার বার্তার জন্য! আমি কীভাবে সহযোগিতা করতে পারি?');
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Direct Google Gemini API Client
 * Uses intelligent fallback across models for 100% uptime
 */
async function askGemini(messages, systemInstruction, apiKey) {
  if (!apiKey) {
    throw new Error('No Gemini API key provided');
  }

  // Format history for Gemini API
  const contents = messages.map(m => ({
    role: m.sender === 'client' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800,
      topP: 0.95
    }
  };

  const body = JSON.stringify(payload);

  let lastError = null;
  for (const modelName of FALLBACK_MODELS) {
    try {
      const reply = await callSingleGemini(modelName, body, apiKey);
      return reply;
    } catch (err) {
      console.warn(`⚠️ Model ${modelName} failed, attempting next model: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models exhausted');
}

module.exports = { askGemini };

// File: api/gemini.js
// This code will run on Vercel's server, allowing it to securely use the API key.

// This function handles the API request from the client.
export default async (req, res) => {
    // Set CORS headers to allow requests from any origin.
    // This is important for a client-side app to be able to call this function.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check if the request method is POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Read the user prompt from the request body.
        const { userPrompt } = req.body;
        
        // Retrieve the API key from Vercel's environment variables.
        // This is the secure part! The key is never exposed to the client.
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server-side API key is not configured.' });
        }

        // Construct the prompt for the Gemini model.
        const chatHistory = [{
            role: "user",
            parts: [{ text: `You are a helpful pfSense network security assistant. A user wants to know about a firewall rule or security best practice. They describe their request as: '${userPrompt}'. Provide a clear, concise, and helpful explanation or suggestion for their pfSense setup. Use a friendly and encouraging tone. Do not provide code, only descriptive text.` }]
        }];

        const payload = {
            contents: chatHistory
        };

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        // Make the API call to the Gemini model.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Forward the error from the Gemini API to the client.
            const errorText = await response.text();
            return res.status(response.status).json({ error: `API error: ${response.status} ${response.statusText}`, details: errorText });
        }

        const result = await response.json();

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            const text = result.candidates[0].content.parts[0].text;
            // Send the Gemini response back to the client.
            return res.status(200).json({ text: text });
        } else {
            return res.status(500).json({ error: 'Invalid API response structure.' });
        }

    } catch (error) {
        console.error('Error in Vercel Function:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

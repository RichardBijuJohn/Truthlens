# TruthLens

TruthLens investigates a claim or article against live web reporting. It searches GDELT first, falls back to Google News RSS when GDELT is rate-limited, retrieves source pages, and can use an AI model to compare the evidence.

## Run locally

Requires Node.js 18 or newer.

```bash
npm start
```

Open `http://localhost:3000`.

## AI-assisted verdicts

Live sources work without an API key, but the result is clearly labeled `Source scan` and uses a limited heuristic. For reasoned verdicts, set an OpenAI key before starting the server:

```bash
OPENAI_API_KEY=your_key_here npm start
```

Or create a `.env` file in the project root from `.env.example`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

On Windows PowerShell:

```powershell
$env:OPENAI_API_KEY = "your_key_here"
npm start
```

The key stays server-side and is never sent to the browser. The AI is instructed to use only retrieved source records and to return `Unclear` when the evidence is insufficient.

## Accepted input

The input box accepts a plain claim, pasted article text, JSON or other textual data, one URL, or mixed text containing multiple URLs. URLs are fetched and included as direct evidence, then related live reporting is searched to add independent context. Binary uploads such as images or PDFs are not parsed yet; paste their text or a public URL for the current workflow.
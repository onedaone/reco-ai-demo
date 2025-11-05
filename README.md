# Reco AI Demo (zip)

Upload this project to Vercel (https://vercel.com/new) as a new project (choose "Import Project" -> Upload ZIP).
Before deploy, set Environment Variables in Vercel:

- OPENAI_API_KEY
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- FROM_EMAIL
- (optional) DEFAULT_RECEIVER

How to run locally:

1. Install dependencies: `npm install`
2. Set env vars in your shell (OPENAI_API_KEY, SMTP_* etc.)
3. Run dev: `npm run dev`
4. Open http://localhost:5173

Notes:
- This demo accepts text, PDF, image or URL input and returns QA + structured kalkyle.
- The API uses OpenAI (chat completions) and nodemailer to send emails. Ensure SMTP env vars are set.

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

export const config = { api: { bodyParser: false } };

// Hjelpefunksjoner
async function extractTextFromFile(file) {
  try {
    const name = file.originalFilename || file.newFilename || file.filename || file.filepath;
    if ((name || "").toLowerCase().endsWith(".pdf") || file.mimetype === "application/pdf") {
      const data = fs.readFileSync(file.filepath);
      const p = await pdfParse(data);
      return p.text || "";
    }
    const data = fs.readFileSync(file.filepath);
    return data.toString("utf8").slice(0, 20000);
  } catch (e) {
    return `Uploaded file: ${file.originalFilename || file.filename || "unknown"}`;
  }
}

async function fetchUrlText(url) {
  try {
    const r = await fetch(url, { timeout: 10000, headers: { "User-Agent": "Reco-AI-Demo/1.0" } });
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      const html = await r.text();
      const body = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
      const txt = body.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
      return txt.slice(0, 20000);
    } else {
      const txt = await r.text();
      return txt.slice(0, 20000);
    }
  } catch (e) {
    return `Feil ved henting av URL: ${e.message}`;
  }
}

async function callOpenAI(prompt) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are an expert building damage report assistant. Output JSON only when asked." }, { role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.15
    })
  });
  const j = await resp.json();
  return j.choices?.[0]?.message?.content || "";
}

function safeParseJSON(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch(e) {
    const start = s.indexOf("{"); const end = s.lastIndexOf("}"); if (start >= 0 && end > start) {
      try { return JSON.parse(s.slice(start, end+1)); } catch(e2) { return null; }
    }
    return null;
  }
}

function buildMailHtml(result) {
  const { summary, missing_info = [], issues = [], improvements = "", items = [] } = result;
  const itemsHtml = items.map(it=>`<tr><td style="padding:6px;border:1px solid #ddd">${it.desc}</td><td style="padding:6px;border:1px solid #ddd">${it.qty || ''}</td><td style="padding:6px;border:1px solid #ddd">${it.unit || ''}</td><td style="padding:6px;border:1px solid #ddd">${it.suggested_unit_price || it.unit_price || ''}</td><td style="padding:6px;border:1px solid #ddd">${it.subtotal || ''}</td></tr>`).join("");
  const total = items.reduce((s,it)=> s + (Number(it.subtotal|| (Number(it.qty||0) * Number(it.unit_price || it.suggested_unit_price || 0))) || 0), 0);
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">
      <h2>Reco AI — Analyse</h2>
      <h3>Oppsummering</h3>
      <p>${summary || '-'}</p>
      <h3>Mangler</h3>
      <ul>${missing_info.map(m=>`<li>${m}</li>`).join('')}</ul>
      <h3>Feil / Issues</h3>
      <ul>${issues.map(i=>`<li>${i}</li>`).join('')}</ul>
      <h3>Forslag til forbedringer</h3>
      <p>${improvements}</p>
      <h3>Kalkyle</h3>
      <table style="border-collapse:collapse;border:1px solid #ddd">${itemsHtml}</table>
      <p><strong>Total: NOK ${total}</strong></p>
    </div>
  `;
}

export default async function handler(req, res) {
  // parse form

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    try {
      const inputType = fields.inputType || (fields.text ? "text" : fields.url ? "url" : "file");
      let text = "";

      if (inputType === "file" && files.file) {
        text = await extractTextFromFile(files.file);
      } else if (inputType === "url" && fields.url) {
        text = await fetchUrlText(fields.url);
      } else if (fields.text) {
        text = fields.text;
      } else {
        text = "";
      }

      // Build prompt that requests both QA and structured items (kalkyle)
      const prompt = `
Du er en ekspert på bygg- og skaderapporter.
Analyser teksten under og returner gyldig JSON med struktur:
{
  "summary":"kort oppsummering",
  "missing_info":["liste over mangler"],
  "issues":["liste over feil/inkonsekvenser"],
  "improvements":"konkrete forbedringer",
  "items":[{"desc":"beskrivelse","qty":number,"unit":"m2/stk","suggested_unit_price":number}],
  "estimated_total":"NOK <number>"
}
Tekst:
${text}

OBS: Output MÅ være gyldig JSON uten ekstra forklarende tekst.
      `;

      const aiResp = await callOpenAI(prompt);
      let parsed = safeParseJSON(aiResp);

      // If parsing failed, try wrapping AI response with a fallback prompt
      if (!parsed) {
        const fallback = `
Modifiser kun output slik at det blir gyldig JSON. Her er det AI svarte tidligere:
${aiResp}
Returner kun gyldig JSON slik spesifisert tidligere.
        `;
        const aiResp2 = await callOpenAI(fallback);
        parsed = safeParseJSON(aiResp2) || { raw: aiResp2 };
      }

      // If items present compute subtotals and total if not provided
      if (parsed && Array.isArray(parsed.items)) {
        let total = 0;
        parsed.items = parsed.items.map(it => {
          const qty = Number(it.qty || 0);
          const price = Number(it.unit_price || it.suggested_unit_price || 0);
          const subtotal = Math.round(qty * price);
          total += subtotal;
          return { ...it, qty, unit_price: price, subtotal };
        });
        if (!parsed.estimated_total) parsed.estimated_total = `NOK ${total}`;
      }

      // Optionally send email if requested
      const sendEmail = fields.sendEmail === "1" || fields.sendEmail === "true" || fields.sendEmail === 1;
      const receiver = fields.email || process.env.DEFAULT_RECEIVER;

      let mailResult = null;
      if (sendEmail && receiver) {
        // setup transporter
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === "1" || false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const html = buildMailHtml(parsed);
        const mailOptions = {
          from: process.env.FROM_EMAIL || process.env.SMTP_USER,
          to: receiver,
          subject: "Reco AI — Analyse resultat",
          html,
          attachments: [
            { filename: "reco-ai-result.json", content: JSON.stringify(parsed, null, 2) }
          ]
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          mailResult = { to: receiver, messageId: info.messageId };
        } catch (mailErr) {
          console.error("Mail error:", mailErr);
          mailResult = { error: mailErr.message };
        }
      }

      // Clean up uploaded file (optional)
      try {
        if (files.file && files.file.filepath) {
          fs.unlinkSync(files.file.filepath);
        }
      } catch (e) { /* ignore */ }

      return res.status(200).json({ ...(parsed || {}), mail: mailResult });
    } catch (e) {
      console.error("Processing error:", e);
      return res.status(500).json({ error: e.message });
    }
  });
}

import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ limits: { fileSize: 12 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static("."));
app.get("/", (_req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

const invoiceSchema = {
  name: "invoice_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      supplier: { type: ["string", "null"] },
      annual_consumption_kwh: { type: ["number", "null"] },
      kwh_price_eur: { type: ["number", "null"] },
      subscription_annual_eur: { type: ["number", "null"] },
      turpe_annual_eur: { type: ["number", "null"] },
      taxes_annual_eur: { type: ["number", "null"] },
      subscribed_power_kva: { type: ["number", "null"] },
      max_power_used_kva: { type: ["number", "null"] },
      contract_end_date: { type: ["string", "null"] },
      notes: {
        type: "array",
        items: { type: "string" }
      }
    },
    required: [
      "supplier",
      "annual_consumption_kwh",
      "kwh_price_eur",
      "subscription_annual_eur",
      "turpe_annual_eur",
      "taxes_annual_eur",
      "subscribed_power_kva",
      "max_power_used_kva",
      "contract_end_date",
      "notes"
    ]
  }
};

app.post("/api/extract-invoice", upload.single("invoice"), async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY missing in .env" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const mimeType = req.file.mimetype || "image/jpeg";
    const base64 = req.file.buffer.toString("base64");
    const imageUrl = `data:${mimeType};base64,${base64}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyse cette facture d'électricité française pour un restaurant. " +
                "Extrait uniquement les champs demandés. " +
                "Si une valeur est absente ou incertaine, renvoie null et explique-le dans notes. " +
                "N'invente rien. " +
                "Cherche en priorité les montants annuels. Si seul un montant mensuel ou périodique est visible, note-le dans notes et renvoie null."
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high"
            }
          ]
        }],
        text: {
          format: {
            type: "json_schema",
            name: invoiceSchema.name,
            strict: true,
            schema: invoiceSchema.schema
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const text = data.output_text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Extraction failed",
      details: error.message
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Unifee app running on http://localhost:${port}`);
});

import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/scan-invoice", upload.single("invoice"), async (req, res) => {

  try {

    const image = fs.readFileSync(req.file.path);

    const base64Image = image.toString("base64");

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Analyse cette facture d'électricité française.

Extrais précisément :

supplier
offer_name
power_subscribed_kva

subscription_amount_eur
subscription_transport_eur

consumption_kwh
kwh_price_eur
consumption_amount_eur
consumption_transport_eur

taxes_amount_eur
cta_amount_eur
tcfe_amount_eur
cspe_amount_eur

tva_5_5_amount_eur
tva_20_amount_eur

total_ht_eur
total_ttc_eur

Répond uniquement en JSON.
`
            },
            {
              type: "input_image",
              image_base64: base64Image
            }
          ]
        }
      ]
    });

    const text = response.output_text;

    const json = JSON.parse(text);

    res.json(json);

  } catch (error) {

    console.log(error);

    res.status(500).json({ error: "analyse impossible" });

  }

});

app.listen(3000, () => {
  console.log("Server running");
});

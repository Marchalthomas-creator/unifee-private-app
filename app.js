const fileInput = document.getElementById("file-input");
const scanBtn = document.getElementById("scan-btn");
const scanStatus = document.getElementById("scan-status");

function fill(id, value) {
  const el = document.getElementById(id);
  if (el && value !== null && value !== undefined) {
    el.value = value;
  }
}

scanBtn.addEventListener("click", async () => {

  if (!fileInput.files.length) {
    scanStatus.textContent = "Ajoute une facture.";
    return;
  }

  scanStatus.textContent = "Analyse en cours...";

  const formData = new FormData();
  formData.append("invoice", fileInput.files[0]);

  const res = await fetch("/scan-invoice", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  console.log(data);

  fill("supplier", data.supplier);
  fill("offer", data.offer_name);
  fill("power", data.power_subscribed_kva);

  fill("subscription", data.subscription_amount_eur);
  fill("subscription_transport", data.subscription_transport_eur);

  fill("consumption_kwh", data.consumption_kwh);
  fill("kwh_price", data.kwh_price_eur);
  fill("consumption_amount", data.consumption_amount_eur);
  fill("consumption_transport", data.consumption_transport_eur);

  fill("taxes", data.taxes_amount_eur);
  fill("cta", data.cta_amount_eur);
  fill("tcfe", data.tcfe_amount_eur);
  fill("cspe", data.cspe_amount_eur);

  fill("tva_5", data.tva_5_5_amount_eur);
  fill("tva_20", data.tva_20_amount_eur);

  fill("total_ht", data.total_ht_eur);
  fill("total_ttc", data.total_ttc_eur);

  scanStatus.textContent = "Extraction terminée.";
});

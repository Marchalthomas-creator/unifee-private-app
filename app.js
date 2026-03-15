const ACCESS_CODE = "UNIFEE2026";

const loginScreen = document.getElementById("login-screen");
const auditScreen = document.getElementById("audit-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const calculateBtn = document.getElementById("calculate-btn");
const saveBtn = document.getElementById("save-btn");
const scanBtn = document.getElementById("scan-btn");
const resultsCard = document.getElementById("results-card");
const scanStatus = document.getElementById("scan-status");
const fileInput = document.getElementById("invoiceFile");

const fields = [
  "restaurant","city","supplier","consumption","currentPrice","currentSubscription","currentTurpe","currentTaxes",
  "contractEnd","subscribedPower","maxPower","unifeePrice","unifeeSubscription","unifeeTurpe","unifeeTaxes","notes"
];

function showAudit(){ loginScreen.classList.remove("active"); auditScreen.classList.add("active"); }
function showLogin(){ auditScreen.classList.remove("active"); loginScreen.classList.add("active"); }

function toNum(id){
  const v = document.getElementById(id).value;
  return parseFloat(String(v).replace(",", ".")) || 0;
}
function euro(v){
  return new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(v || 0);
}
function pct(v){
  return new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1}).format(v || 0);
}
function roundPower(maxPower){
  const target = maxPower * 1.15;
  const levels = [6,9,12,15,18,24,30,36,42,48,60,72,84,96,120];
  return levels.find(x => x >= target) || 120;
}
function getScore(p){
  if (p <= 0.05) return "A";
  if (p <= 0.12) return "B";
  if (p <= 0.22) return "C";
  return "D";
}
function setValue(id, value){
  if (value === null || value === undefined) return;
  document.getElementById(id).value = value;
}

loginBtn.addEventListener("click", () => {
  const code = document.getElementById("access-code").value.trim();
  if (code !== ACCESS_CODE) {
    alert("Code incorrect.");
    return;
  }
  localStorage.setItem("unifee_access", "ok");
  showAudit();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("unifee_access");
  showLogin();
});

saveBtn.addEventListener("click", () => {
  const data = {};
  fields.forEach(id => data[id] = document.getElementById(id).value);
  localStorage.setItem("unifee_audit_data", JSON.stringify(data));
  alert("Audit enregistré sur cet appareil.");
});

scanBtn.addEventListener("click", async () => {
  if (!fileInput.files?.length) {
    scanStatus.textContent = "Ajoute d'abord une photo de facture.";
    return;
  }

  const formData = new FormData();
  formData.append("invoice", fileInput.files[0]);

  scanStatus.textContent = "Analyse en cours...";
  try {
    const res = await fetch("/api/extract-invoice", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

document.getElementById("supplier").value = data.supplier || "";
document.getElementById("consumption").value = data.annual_consumption_kwh || "";
document.getElementById("currentPrice").value = data.kwh_price_eur || "";
document.getElementById("currentSubscription").value = data.subscription_annual_eur || "";
document.getElementById("currentTurpe").value = data.turpe_annual_eur || "";
document.getElementById("currentTaxes").value = data.taxes_annual_eur || "";
document.getElementById("subscribedPower").value = data.subscribed_power_kva || "";
document.getElementById("maxPower").value = data.max_power_used_kva || "";
document.getElementById("contractEnd").value = data.contract_end_date || "";

scanStatus.textContent = "Extraction terminée. Vérifie les champs puis lance le calcul."
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.error || "Erreur API");
    }

    setValue("supplier", data.supplier);
    setValue("consumption", data.annual_consumption_kwh);
    setValue("currentPrice", data.kwh_price_eur);
    setValue("currentSubscription", data.subscription_annual_eur);
    setValue("currentTurpe", data.turpe_annual_eur);
    setValue("currentTaxes", data.taxes_annual_eur);
    setValue("subscribedPower", data.subscribed_power_kva);
    setValue("maxPower", data.max_power_used_kva);
    setValue("contractEnd", data.contract_end_date);
    document.getElementById("notes").value = (data.notes || []).join(" | ");

    scanStatus.textContent = "Extraction terminée. Vérifie les champs puis lance le calcul.";
  } catch (err) {
    scanStatus.textContent = "Erreur : " + err.message;
  }
});

calculateBtn.addEventListener("click", () => {
  const consumption = toNum("consumption");
  const currentPrice = toNum("currentPrice");
  const currentSubscription = toNum("currentSubscription");
  const currentTurpe = toNum("currentTurpe");
  const currentTaxes = toNum("currentTaxes");
  const subscribedPower = toNum("subscribedPower");
  const maxPower = toNum("maxPower");
  const unifeePrice = toNum("unifeePrice");
  const unifeeSubscription = toNum("unifeeSubscription");
  const unifeeTurpe = toNum("unifeeTurpe");
  const unifeeTaxes = toNum("unifeeTaxes");

  const currentTotal = (consumption * currentPrice) + currentSubscription + currentTurpe + currentTaxes;
  const unifeeTotal = (consumption * unifeePrice) + unifeeSubscription + unifeeTurpe + unifeeTaxes;
  const savings = currentTotal - unifeeTotal;
  const savingsPct = currentTotal ? savings / currentTotal : 0;
  const recommendedPower = (subscribedPower && maxPower) ? roundPower(maxPower) : 0;
  const powerSavings = recommendedPower && subscribedPower > recommendedPower ? (subscribedPower - recommendedPower) * 18 : 0;
  const score = getScore(savingsPct);

  document.getElementById("currentTotal").textContent = euro(currentTotal);
  document.getElementById("unifeeTotal").textContent = euro(unifeeTotal);
  document.getElementById("savings").textContent = euro(savings);
  document.getElementById("savingsPct").textContent = pct(savingsPct);
  document.getElementById("recommendedPower").textContent = recommendedPower ? recommendedPower + " kVA" : "-";
  document.getElementById("powerSavings").textContent = powerSavings ? euro(powerSavings) + " / an" : "-";
  document.getElementById("score").textContent = score;

  const restaurant = document.getElementById("restaurant").value || "ce restaurant";
  document.getElementById("summaryText").textContent =
    `Pour ${restaurant}, la facture actuelle est estimée à ${euro(currentTotal)} par an contre ${euro(unifeeTotal)} avec Unifee, soit ${euro(savings)} d’économies potentielles.`;

  resultsCard.classList.remove("hidden");
});

(function init(){
  if (localStorage.getItem("unifee_access") === "ok") showAudit();
  const raw = localStorage.getItem("unifee_audit_data");
  if (raw) {
    try {
      const data = JSON.parse(raw);
      fields.forEach(id => {
        if (data[id] !== undefined) document.getElementById(id).value = data[id];
      });
    } catch(e) {}
  }
})();

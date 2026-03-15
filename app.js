const ACCESS_CODE = "UNIFEE2026";

const loginScreen = document.getElementById("login-screen");
const auditScreen = document.getElementById("audit-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const calculateBtn = document.getElementById("calculate-btn");
const scanBtn = document.getElementById("scan-btn");
const fileInput = document.getElementById("invoiceFile");
const scanStatus = document.getElementById("scan-status");
const resultsCard = document.getElementById("results-card");

const fields = [
  "restaurant",
  "city",
  "supplier",
  "contractEnd",
  "consumption",
  "currentPrice",
  "currentSubscription",
  "currentTurpe",
  "currentTaxes",
  "subscribedPower",
  "maxPower",
  "notes",
  "unifeePrice",
  "unifeeSubscription",
  "unifeeTurpe",
  "unifeeTaxes"
];

function showAudit() {
  loginScreen.classList.remove("active");
  auditScreen.classList.add("active");
}

function showLogin() {
  auditScreen.classList.remove("active");
  loginScreen.classList.add("active");
}

function toNum(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = el.value;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

function euro(v) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(v || 0);
}

function pct(v) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(v || 0);
}

function roundPower(maxPower) {
  const target = maxPower * 1.15;
  const levels = [6, 9, 12, 15, 18, 24, 30, 36, 42, 48, 60, 72, 84, 96, 120];
  return levels.find(x => x >= target) || 120;
}

function getScore(p) {
  if (p <= 0.05) return "A";
  if (p <= 0.12) return "B";
  if (p <= 0.22) return "C";
  return "D";
}

function normalizeDate(v) {
  if (!v || typeof v !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const fr = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) {
    return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }

  return "";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) {
    console.log("Champ introuvable :", id);
    return;
  }
  el.value = value ?? "";
}

loginBtn?.addEventListener("click", () => {
  const code = document.getElementById("access-code").value.trim();
  if (code !== ACCESS_CODE) {
    alert("Code incorrect.");
    return;
  }
  localStorage.setItem("unifee_access", "ok");
  showAudit();
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("unifee_access");
  showLogin();
});

saveBtn?.addEventListener("click", () => {
  const data = {};
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  localStorage.setItem("unifee_audit_data", JSON.stringify(data));
  alert("Audit enregistré sur cet appareil.");
});

scanBtn?.addEventListener("click", async () => {
  if (!fileInput.files || !fileInput.files.length) {
    scanStatus.textContent = "Ajoute d'abord une photo ou un PDF de facture.";
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
    console.log("Réponse API =", data);

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
    setValue("contractEnd", normalizeDate(data.contract_end_date));
    setValue("notes", Array.isArray(data.notes) ? data.notes.join(" | ") : "");

    scanStatus.textContent = "Extraction terminée. Vérifie les champs puis lance le calcul.";
  } catch (err) {
    console.error(err);
    scanStatus.textContent = "Erreur : " + err.message;
  }
});

calculateBtn?.addEventListener("click", () => {
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

  const currentTotal =
    (consumption * currentPrice) +
    currentSubscription +
    currentTurpe +
    currentTaxes;

  const unifeeTotal =
    (consumption * unifeePrice) +
    unifeeSubscription +
    unifeeTurpe +
    unifeeTaxes;

  const savings = currentTotal - unifeeTotal;
  const savingsPct = currentTotal ? savings / currentTotal : 0;

  const recommendedPower =
    subscribedPower && maxPower ? roundPower(maxPower) : 0;

  const powerSavings =
    recommendedPower && subscribedPower > recommendedPower
      ? (subscribedPower - recommendedPower) * 18
      : 0;

  const score = getScore(savingsPct);

  document.getElementById("currentTotal").textContent = euro(currentTotal);
  document.getElementById("unifeeTotal").textContent = euro(unifeeTotal);
  document.getElementById("savings").textContent = euro(savings);
  document.getElementById("savingsPct").textContent = pct(savingsPct);
  document.getElementById("recommendedPower").textContent =
    recommendedPower ? `${recommendedPower} kVA` : "-";
  document.getElementById("powerSavings").textContent =
    powerSavings ? `${euro(powerSavings)} / an` : "-";
  document.getElementById("score").textContent = score;

  const restaurant = document.getElementById("restaurant").value || "ce restaurant";

  document.getElementById("summaryText").textContent =
    `Pour ${restaurant}, la facture actuelle est estimée à ${euro(currentTotal)} par an contre ${euro(unifeeTotal)} avec Unifee, soit ${euro(savings)} d’économies potentielles.`;

  resultsCard.classList.remove("hidden");
});

(function init() {
  if (localStorage.getItem("unifee_access") === "ok") {
    showAudit();
  }

  const raw = localStorage.getItem("unifee_audit_data");
  if (raw) {
    try {
      const data = JSON.parse(raw);
      fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) {
          el.value = data[id];
        }
      });
    } catch (e) {
      console.error("Erreur lecture localStorage", e);
    }
  }
})();

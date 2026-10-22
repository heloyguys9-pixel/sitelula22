// Shared FireBot API helpers. Files prefixed with "_" are not Vercel routes.
const BASE = "https://firebotbr.com/api/v1";

const PLANOS = {
  6: { valor: 12.0, nome: "6 latas" },
  12: { valor: 24.99, nome: "12 latas" },
};
const ENTREGAS = {
  rapida: { valor: 4.98, nome: "entrega rápida" },
  normal: { valor: 0, nome: "entrega normal" },
};

function apiKey() {
  const key = (process.env.FIREBOT_SECRET_KEY || "").trim();
  if (!key) throw new Error("FIREBOT_SECRET_KEY não configurada");
  return key;
}

function storeUrl(origin) {
  const url = (process.env.FIREBOT_STORE_URL || origin || "").trim();
  if (!/^https:\/\/[^/]+/i.test(url)) throw new Error("A URL da loja deve usar HTTPS");
  return url;
}

async function firebot(path, options) {
  const headers = { Authorization: apiKey(), Accept: "application/json" };
  const request = { method: options.method, headers };
  if (options.body) {
    headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }
  const response = await fetch(BASE + path, request);
  let data = null;
  try { data = await response.json(); } catch (e) {}
  return { ok: response.ok, status: response.status, data };
}

function cpfValido(c) {
  c = String(c || "").replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

module.exports = { firebot, PLANOS, ENTREGAS, cpfValido, storeUrl };

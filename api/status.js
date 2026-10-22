// POST /api/status -> checks the FireBot PIX transaction status.
const { firebot } = require("./_firebot");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });

  const b = req.body || {};
  const id = String(b.id || "").trim().slice(0, 100);
  if (!/^fire_tx_[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).json({ erro: "ID de transação inválido." });
  }

  try {
    const r = await firebot("/pix/" + encodeURIComponent(id), { method: "GET" });
    const d = r.data;
    if (!r.ok || !d || d.success === false) {
      console.error("FireBot check falhou:", r.status, d && d.code, d && d.requestId);
      return res.status(502).json({ estado: null });
    }

    const transacao = d.transaction || d.data || d;
    const estado = typeof transacao.status === "string" ? transacao.status : null;
    if (!estado) {
      console.error("FireBot check sem status:", r.status, d.code, d.requestId);
      return res.status(502).json({ estado: null });
    }
    return res.status(200).json({ estado });
  } catch (err) {
    console.error("Erro ao consultar a FireBot:", err.message);
    return res.status(502).json({ estado: null });
  }
};

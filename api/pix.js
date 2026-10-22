// POST /api/pix -> creates a FireBot PIX charge without storing customer data.
const { firebot, PLANOS, ENTREGAS, cpfValido, storeUrl } = require("./_firebot");
const limpa = (s, n) => String(s || "").trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
  const b = req.body || {};

  const plano = PLANOS[Number(b.plano)];
  const entrega = ENTREGAS[String(b.entrega)];
  if (!plano || !entrega) return res.status(400).json({ erro: "Oferta ou entrega inválida." });

  const nome = limpa(b.nome, 60), sobrenome = limpa(b.sobrenome, 80);
  const cpf = String(b.cpf || "").replace(/\D/g, "");
  const email = limpa(b.email, 254);
  const telefone = String(b.telefone || "").replace(/\D/g, "");
  const rua = limpa(b.rua, 120), numero = limpa(b.numero, 20);
  const complemento = limpa(b.complemento, 100), bairro = limpa(b.bairro, 80);
  const cidade = limpa(b.cidade, 80), uf = String(b.uf || "").trim().toUpperCase();
  const cep = String(b.cep || "").replace(/\D/g, "");

  if (!nome || !sobrenome) return res.status(400).json({ erro: "Informe nome e sobrenome." });
  if (!cpfValido(cpf)) return res.status(400).json({ erro: "CPF inválido." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: "E-mail inválido." });
  if (telefone.length < 10 || telefone.length > 11) return res.status(400).json({ erro: "Telefone inválido." });
  if (!rua || !numero || !bairro || !cidade || !/^[A-Z]{2}$/.test(uf) || cep.length !== 8) {
    return res.status(400).json({ erro: "Informe um endereço de entrega completo." });
  }

  const total = Math.round((plano.valor + entrega.valor) * 100) / 100;
  let r;
  try {
    r = await firebot("/pix/create", {
      method: "POST",
      body: {
        productType: "PHYSICAL",
        storeUrl: storeUrl(req.headers && req.headers.origin),
        amount: total,
        description: "Bebida do Lula - " + plano.nome,
        customer: {
          name: nome + " " + sobrenome,
          email,
          cpf,
          phone: telefone,
        },
        shipping: {
          street: rua,
          number: numero,
          complement: complemento,
          neighborhood: bairro,
          city: cidade,
          state: uf,
          zipCode: cep,
          shippingFee: entrega.valor,
          carrier: entrega.nome,
        },
        qrStyle: "plain",
      },
    });
  } catch (err) {
    console.error("Erro ao chamar a FireBot:", err.message);
    return res.status(502).json({ erro: "Não foi possível gerar o PIX agora. Tente novamente." });
  }

  const d = r.data;
  if (!r.ok || !d || d.success !== true || !d.transactionId || !d.qrCodeUrl || !d.pixCopiaECola) {
    console.error("FireBot create falhou:", r.status, d && d.code, d && d.requestId);
    return res.status(502).json({ erro: "Não foi possível gerar o PIX agora. Tente novamente." });
  }

  return res.status(200).json({
    id: String(d.transactionId),
    valor: total,
    qrcodeUrl: d.qrCodeUrl,
    copyPaste: d.pixCopiaECola,
    estado: d.status || "PENDING",
  });
};

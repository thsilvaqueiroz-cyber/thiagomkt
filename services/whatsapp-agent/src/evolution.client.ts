// Cliente para a Evolution API — envia mensagens WhatsApp

const EVOLUTION_URL = process.env.EVOLUTION_API_URL ?? 'http://evolution-api:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? '';

async function evolutionRequest(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function sendText(instanceId: string, phone: string, text: string): Promise<void> {
  await evolutionRequest(`/message/sendText/${instanceId}`, {
    number: phone,
    text,
    delay: 1200,  // simula digitação
  });
}

export async function sendButtons(
  instanceId: string,
  phone: string,
  text: string,
  buttons: Array<{ id: string; text: string }>,
): Promise<void> {
  await evolutionRequest(`/message/sendButtons/${instanceId}`, {
    number: phone,
    buttonMessage: {
      text,
      buttons: buttons.map((b, i) => ({
        buttonId: b.id,
        buttonText: { displayText: b.text },
        type: 1,
      })),
      headerType: 1,
    },
  });
}

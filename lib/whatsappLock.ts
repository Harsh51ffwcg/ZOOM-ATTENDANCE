import { getStore } from "@netlify/blobs";

const store = getStore("whatsapp-sends");

export async function claimWhatsAppSend(
  batch: string,
  date: string
): Promise<boolean> {
  const key = `${date}-${batch}`;

  const result = await store.set(
    key,
    JSON.stringify({
      batch,
      date,
      claimedAt: new Date().toISOString(),
    }),
    {
      onlyIfNew: true,
    }
  );

  return result.modified;
}
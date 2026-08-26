import { getStore } from "@netlify/blobs";

export async function claimWhatsAppSend(
  batch: string,
  date: string
): Promise<boolean> {
  const store = getStore("whatsapp-sends");

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
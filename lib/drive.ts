import { JWT } from "google-auth-library";

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  modifiedTime: string;
}

function getClient(): JWT {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Google Drive non configuré (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY manquants)",
    );
  }

  return new JWT({ email, key, scopes: ["https://www.googleapis.com/auth/drive"] });
}

function getFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID manquant");
  }
  return folderId;
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const client = getClient();
  const folderId = getFolderId();
  const { token } = await client.getAccessToken();

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${folderId}' in parents and mimeType = 'application/pdf' and trashed = false`);
  url.searchParams.set("fields", "files(id,name,size,modifiedTime)");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "100");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Erreur Drive API (${res.status})`);
  }

  const data = await res.json();
  return (data.files ?? []).map((f: { id: string; name: string; size?: string; modifiedTime: string }) => ({
    id: f.id,
    name: f.name,
    size: Number(f.size ?? 0),
    modifiedTime: f.modifiedTime,
  }));
}

export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const client = getClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Erreur téléchargement Drive (${res.status})`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function moveDriveFile(fileId: string, targetFolderId: string): Promise<void> {
  const client = getClient();
  const sourceFolderId = getFolderId();
  const { token } = await client.getAccessToken();

  const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
  url.searchParams.set("addParents", targetFolderId);
  url.searchParams.set("removeParents", sourceFolderId);
  url.searchParams.set("fields", "id,parents");

  const res = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Erreur déplacement Drive (${res.status})`);
  }
}

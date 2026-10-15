export async function uploadImageFile(file: File): Promise<string | null> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/media", {
    method: "POST",
    body: form,
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.message?.url ?? null;
}

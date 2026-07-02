import { getSupabase } from "./supabase";

const BUCKET = "fotos-funcionarios";

/**
 * Envia a foto do cadastro ANTES do signUp (usuário ainda anônimo — o bucket
 * aceita upload público só para esta pasta, ver 005_area_foto_abertura_admin.sql).
 * Nome de arquivo aleatório: evita colisão/sobrescrita por adivinhação, já
 * que não existe ainda um id de usuário para nomear o arquivo.
 */
export async function enviarFotoCadastro(arquivo: File): Promise<string> {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "jpg";
  const nomeArquivo = `pendente/${crypto.randomUUID()}.${extensao}`;

  const { error } = await getSupabase()
    .storage.from(BUCKET)
    .upload(nomeArquivo, arquivo, {
      contentType: arquivo.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error("Falha ao enviar a foto. Tente uma imagem menor ou tente de novo.");
  }

  const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}

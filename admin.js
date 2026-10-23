/*
  O painel usa a chave pública do Supabase. Nunca use a chave sb_secret/service_role no navegador.
  Configure o bucket de fotos executando supabase-storage.sql no SQL Editor.
*/
const SUPABASE_URL = "https://mytsjfcegfmwuomvnvsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YygDZy2UAAcWPqgRrdOeFQ_7PmjjEk4";
const STORAGE_BUCKET = "product-photos";
const client = (window.supabase && !SUPABASE_URL.startsWith("COLE_AQUI") && !SUPABASE_ANON_KEY.startsWith("COLE_AQUI"))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const loginPanel = document.querySelector("#login-panel");
const dashboardPanel = document.querySelector("#dashboard-panel");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboardMessage = document.querySelector("#dashboard-message");
const productList = document.querySelector("#admin-product-list");
let allProducts = [];
let editingPhotoProduct = null;
let selectedPhotoFile = null;
let previewObjectUrl = null;

const photoModal = document.querySelector("#photo-modal");
const photoFileInput = document.querySelector("#photo-file");
const photoPreview = document.querySelector("#photo-preview");
const photoPlaceholder = document.querySelector("#photo-placeholder");
const photoMessage = document.querySelector("#photo-message");
const savePhotoButton = document.querySelector("#save-photo-button");
const removePhotoButton = document.querySelector("#remove-photo-button");

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
function message(el, text, error = false) {
  el.textContent = text;
  el.classList.toggle("error", error);
}
function showDashboard(isLoggedIn) {
  loginPanel.classList.toggle("hidden", isLoggedIn);
  dashboardPanel.classList.toggle("hidden", !isLoggedIn);
}
async function loadAdminProducts() {
  if (!client) {
    message(loginMessage, "Configure a Project URL e a anon/public key nos arquivos admin.js e script.js.", true);
    return;
  }
  message(dashboardMessage, "Carregando produtos...");
  const { data, error } = await client.from("products").select("*").order("id", { ascending: true });
  if (error) {
    message(dashboardMessage, "Não foi possível carregar os produtos. Confira a configuração e as políticas do Supabase.", true);
    console.error(error);
    return;
  }
  allProducts = data || [];
  message(dashboardMessage, `${allProducts.length} produtos carregados.`);
  renderAdminProducts();
}
function renderAdminProducts() {
  const query = document.querySelector("#search-products").value.trim().toLocaleLowerCase("pt-BR");
  const filter = document.querySelector("#status-filter").value;
  const shown = allProducts.filter(p => {
    const matchesText = p.name.toLocaleLowerCase("pt-BR").includes(query);
    const matchesStatus = filter === "todos" || (filter === "disponivel" ? p.available : !p.available);
    return matchesText && matchesStatus;
  });
  productList.innerHTML = shown.map(p => `
    <article class="admin-product-row">
      <div class="admin-product-main">
        ${p.image_url ? `<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="Foto de ${escapeHtml(p.name)}">` : `<div class="admin-thumb admin-thumb-empty">Sem foto</div>`}
        <div>
          <div class="admin-product-name">${escapeHtml(p.name)}</div>
          <div class="admin-product-meta">${money(p.price)} · ${escapeHtml(p.category_label || p.category)}</div>
          <span class="admin-status ${p.available ? "available" : "sold"}">${p.available ? "Disponível" : "Vendido"}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="photo-edit-button" type="button" data-photo-id="${p.id}"> ${p.image_url ? "Trocar foto" : "Adicionar foto"}</button>
        <button class="status-toggle" type="button" data-id="${p.id}" data-available="${p.available}">
          ${p.available ? "Marcar como vendido" : "Marcar como disponível"}
        </button>
      </div>
    </article>`).join("");
  if (!shown.length) productList.innerHTML = "<p>Nenhum produto encontrado.</p>";
  productList.querySelectorAll(".status-toggle").forEach(button => button.addEventListener("click", () => toggleAvailability(button)));
  productList.querySelectorAll(".photo-edit-button").forEach(button => button.addEventListener("click", () => openPhotoModal(Number(button.dataset.photoId))));
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function toggleAvailability(button) {
  if (!client) return;
  const id = Number(button.dataset.id);
  const nextAvailable = button.dataset.available !== "true";
  button.disabled = true;
  message(dashboardMessage, "Salvando alteração...");
  const { error } = await client.from("products").update({ available: nextAvailable }).eq("id", id);
  button.disabled = false;
  if (error) {
    message(dashboardMessage, "Não foi possível salvar. Confirme se você está logado e se executou as políticas SQL.", true);
    console.error(error);
    return;
  }
  const product = allProducts.find(p => p.id === id);
  if (product) product.available = nextAvailable;
  message(dashboardMessage, "Disponibilidade atualizada com sucesso.");
  renderAdminProducts();
}
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!client) {
    message(loginMessage, "Configure primeiro a Project URL e a anon/public key nos arquivos admin.js e script.js.", true);
    return;
  }
  message(loginMessage, "Entrando...");
  const email = document.querySelector("#email").value;
  const password = document.querySelector("#password").value;
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    message(loginMessage, "Não foi possível entrar. Confira o e-mail e a senha.", true);
    return;
  }
  message(loginMessage, "");
  showDashboard(true);
  await loadAdminProducts();
});
document.querySelector("#logout-button").addEventListener("click", async () => {
  if (client) await client.auth.signOut();
  showDashboard(false);
  loginForm.reset();
});
document.querySelector("#search-products").addEventListener("input", renderAdminProducts);
document.querySelector("#status-filter").addEventListener("change", renderAdminProducts);

async function init() {
  if (!client) {
    message(loginMessage, "Configure a Project URL e a anon/public key nos arquivos admin.js e script.js.", true);
    return;
  }
  const { data } = await client.auth.getSession();
  if (data.session) {
    showDashboard(true);
    await loadAdminProducts();
  }
}
init();


function setPhotoPreview(url) {
  if (url) {
    photoPreview.src = url;
    photoPreview.classList.remove("hidden");
    photoPlaceholder.classList.add("hidden");
  } else {
    photoPreview.removeAttribute("src");
    photoPreview.classList.add("hidden");
    photoPlaceholder.classList.remove("hidden");
  }
}
function openPhotoModal(productId) {
  editingPhotoProduct = allProducts.find(p => Number(p.id) === productId);
  if (!editingPhotoProduct) return;
  selectedPhotoFile = null;
  photoFileInput.value = "";
  document.querySelector("#photo-product-name").textContent = editingPhotoProduct.name;
  message(photoMessage, "");
  setPhotoPreview(editingPhotoProduct.image_url || "");
  removePhotoButton.disabled = !editingPhotoProduct.image_url;
  photoModal.classList.remove("hidden");
  photoModal.setAttribute("aria-hidden", "false");
}
function closePhotoModal() {
  photoModal.classList.add("hidden");
  photoModal.setAttribute("aria-hidden", "true");
  editingPhotoProduct = null;
  selectedPhotoFile = null;
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
}
photoFileInput.addEventListener("change", () => {
  const file = photoFileInput.files && photoFileInput.files[0];
  selectedPhotoFile = file || null;
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    selectedPhotoFile = null;
    photoFileInput.value = "";
    message(photoMessage, "Selecione um arquivo de imagem.", true);
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    selectedPhotoFile = null;
    photoFileInput.value = "";
    message(photoMessage, "A imagem deve ter no máximo 5 MB.", true);
    return;
  }
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = URL.createObjectURL(file);
  setPhotoPreview(previewObjectUrl);
  message(photoMessage, "Prévia pronta. Clique em Salvar foto para publicar.");
});
document.querySelector("#close-photo-modal").addEventListener("click", closePhotoModal);
photoModal.addEventListener("click", event => { if (event.target === photoModal) closePhotoModal(); });
savePhotoButton.addEventListener("click", async () => {
  if (!client || !editingPhotoProduct || !selectedPhotoFile) {
    message(photoMessage, "Escolha uma foto antes de salvar.", true);
    return;
  }
  savePhotoButton.disabled = true;
  removePhotoButton.disabled = true;
  message(photoMessage, "Enviando foto para a nuvem...");
  try {
    const safeName = selectedPhotoFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${editingPhotoProduct.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(filePath, selectedPhotoFile, { upsert: true, contentType: selectedPhotoFile.type, cacheControl: "3600" });
    if (uploadError) throw uploadError;
    const { data: publicData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
    const { error: updateError } = await client.from("products").update({ image_url: publicData.publicUrl }).eq("id", editingPhotoProduct.id);
    if (updateError) throw updateError;
    editingPhotoProduct.image_url = publicData.publicUrl;
    message(dashboardMessage, `Foto de “${editingPhotoProduct.name}” atualizada. Ela já pode aparecer na loja.`);
    renderAdminProducts();
    closePhotoModal();
  } catch (error) {
    console.error(error);
    message(photoMessage, "Não foi possível salvar a foto. Confira se executou supabase-storage.sql e tente novamente.", true);
  } finally {
    savePhotoButton.disabled = false;
    removePhotoButton.disabled = false;
  }
});
removePhotoButton.addEventListener("click", async () => {
  if (!client || !editingPhotoProduct || !editingPhotoProduct.image_url) return;
  removePhotoButton.disabled = true;
  savePhotoButton.disabled = true;
  message(photoMessage, "Removendo foto do produto...");
  const { error } = await client.from("products").update({ image_url: "" }).eq("id", editingPhotoProduct.id);
  if (error) {
    console.error(error);
    message(photoMessage, "Não foi possível remover a foto. Confira as permissões do Supabase.", true);
    removePhotoButton.disabled = false;
    savePhotoButton.disabled = false;
    return;
  }
  editingPhotoProduct.image_url = "";
  renderAdminProducts();
  message(dashboardMessage, `Foto removida de “${editingPhotoProduct.name}”.`);
  closePhotoModal();
  savePhotoButton.disabled = false;
  removePhotoButton.disabled = false;
});

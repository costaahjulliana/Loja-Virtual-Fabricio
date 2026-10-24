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
let selectedPhotoFiles = [];
let previewObjectUrl = null;

const photoModal = document.querySelector("#photo-modal");
const photoFileInput = document.querySelector("#photo-file");
const photoGalleryPreview = document.querySelector("#photo-gallery-preview");
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
        ${(p.image_urls && p.image_urls.length ? p.image_urls[0] : p.image_url) ? `<img class="admin-thumb" src="${escapeHtml((p.image_urls && p.image_urls.length ? p.image_urls[0] : p.image_url))}" alt="Foto de ${escapeHtml(p.name)}">` : `<div class="admin-thumb admin-thumb-empty">Sem foto</div>`}
        <div>
          <div class="admin-product-name">${escapeHtml(p.name)}</div>
          <div class="admin-product-meta">${money(p.price)} · ${escapeHtml(p.category_label || p.category)}</div>
          <span class="admin-status ${p.available ? "available" : "sold"}">${p.available ? "Disponível" : "Vendido"}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="name-edit-button" type="button" data-name-id="${p.id}">Editar nome</button>
        <button class="price-edit-button" type="button" data-price-id="${p.id}">Alterar preço</button>
        <button class="description-edit-button" type="button" data-description-id="${p.id}">Editar descrição</button>
        <button class="photo-edit-button" type="button" data-photo-id="${p.id}"> ${(p.image_urls && p.image_urls.length) || p.image_url ? `Fotos (${(p.image_urls && p.image_urls.length) || 1})` : "Adicionar fotos"}</button>
        <button class="status-toggle" type="button" data-id="${p.id}" data-available="${p.available}">
          ${p.available ? "Marcar como vendido" : "Marcar como disponível"}
        </button>
      </div>
    </article>`).join("");
  if (!shown.length) productList.innerHTML = "<p>Nenhum produto encontrado.</p>";
  productList.querySelectorAll(".status-toggle").forEach(button => button.addEventListener("click", () => toggleAvailability(button)));
  productList.onclick = event => {
    const nameButton = event.target.closest(".name-edit-button");
    if (nameButton) {
      event.preventDefault();
      editProductName(nameButton);
      return;
    }
    const priceButton = event.target.closest(".price-edit-button");
    if (priceButton) {
      event.preventDefault();
      editProductPrice(priceButton);
      return;
    }
    const descriptionButton = event.target.closest(".description-edit-button");
    if (descriptionButton) {
      event.preventDefault();
      editProductDescription(descriptionButton);
      return;
    }
    const photoButton = event.target.closest(".photo-edit-button");
    if (photoButton) {
      event.preventDefault();
      openPhotoModal(Number(photoButton.dataset.photoId));
    }
  };
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function editProductName(button) {
  if (!client) return;
  const id = Number(button.dataset.nameId);
  const product = allProducts.find(p => Number(p.id) === id);
  if (!product) return;

  const enteredName = prompt("Digite o novo nome do produto:", product.name);
  if (enteredName === null) return;
  const name = enteredName.trim();

  if (!name) {
    alert("O nome do produto não pode ficar vazio.");
    return;
  }
  if (name === product.name) return;

  button.disabled = true;
  message(dashboardMessage, "Salvando nome do produto...");
  const { error } = await client.from("products").update({ name }).eq("id", id);
  button.disabled = false;

  if (error) {
    console.error(error);
    message(dashboardMessage, "Não foi possível atualizar o nome. Confira se você está logado e se as políticas do Supabase permitem atualizar produtos.", true);
    return;
  }

  product.name = name;
  message(dashboardMessage, "Nome do produto atualizado com sucesso.");
  renderAdminProducts();
}
async function editProductPrice(button) {
  if (!client) return;
  const id = Number(button.dataset.priceId);
  const product = allProducts.find(p => Number(p.id) === id);
  if (!product) return;

  const enteredPrice = prompt("Digite o novo preço do produto (ex.: 249,90):", Number(product.price).toFixed(2).replace(".", ","));
  if (enteredPrice === null) return;
  const normalizedPrice = enteredPrice.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const price = Number(normalizedPrice);

  if (!normalizedPrice || !Number.isFinite(price) || price < 0) {
    alert("Digite um preço válido, por exemplo 249,90.");
    return;
  }
  if (price === Number(product.price)) return;

  button.disabled = true;
  message(dashboardMessage, "Salvando novo preço...");
  const { error } = await client.from("products").update({ price }).eq("id", id);
  button.disabled = false;

  if (error) {
    console.error(error);
    message(dashboardMessage, "Não foi possível atualizar o preço. Confira sua sessão e as políticas do Supabase.", true);
    return;
  }
  product.price = price;
  message(dashboardMessage, "Preço atualizado com sucesso.");
  renderAdminProducts();
}

async function editProductDescription(button) {
  if (!client) return;
  const id = Number(button.dataset.descriptionId);
  const product = allProducts.find(p => Number(p.id) === id);
  if (!product) return;

  const enteredDescription = prompt("Digite a nova descrição do produto:", product.description || "");
  if (enteredDescription === null) return;
  const description = enteredDescription.trim();
  if (description === (product.description || "")) return;

  button.disabled = true;
  message(dashboardMessage, "Salvando descrição...");
  const { error } = await client.from("products").update({ description }).eq("id", id);
  button.disabled = false;

  if (error) {
    console.error(error);
    message(dashboardMessage, "Não foi possível atualizar a descrição. Confira sua sessão e as políticas do Supabase.", true);
    return;
  }
  product.description = description;
  message(dashboardMessage, "Descrição atualizada com sucesso.");
  renderAdminProducts();
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

function getProductPhotos(product) {
  const photos = Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean) : [];
  if (!photos.length && product.image_url) photos.push(product.image_url);
  return [...new Set(photos)];
}
function renderPhotoPreview() {
  if (!editingPhotoProduct) return;
  const savedPhotos = getProductPhotos(editingPhotoProduct);
  const newPhotos = selectedPhotoFiles.map(file => ({ name: file.name, preview: URL.createObjectURL(file), isNew: true }));
  photoGalleryPreview.innerHTML = "";
  if (!savedPhotos.length && !newPhotos.length) {
    photoGalleryPreview.innerHTML = '<p id="photo-placeholder">Nenhuma foto cadastrada</p>';
    return;
  }
  savedPhotos.forEach((url, index) => {
    const img = document.createElement("img");
    img.className = "admin-photo-preview";
    img.src = url;
    img.alt = `Foto cadastrada ${index + 1}`;
    photoGalleryPreview.appendChild(img);
  });
  newPhotos.forEach((photo, index) => {
    const img = document.createElement("img");
    img.className = "admin-photo-preview is-new";
    img.src = photo.preview;
    img.alt = `Nova foto ${index + 1}`;
    photoGalleryPreview.appendChild(img);
  });
}
function openPhotoModal(productId) {
  editingPhotoProduct = allProducts.find(p => Number(p.id) === productId);
  if (!editingPhotoProduct) return;
  selectedPhotoFiles = [];
  photoFileInput.value = "";
  document.querySelector("#photo-product-name").textContent = editingPhotoProduct.name;
  message(photoMessage, "");
  renderPhotoPreview();
  removePhotoButton.disabled = getProductPhotos(editingPhotoProduct).length === 0;
  photoModal.classList.remove("hidden");
  photoModal.setAttribute("aria-hidden", "false");
}
function closePhotoModal() {
  photoModal.classList.add("hidden");
  photoModal.setAttribute("aria-hidden", "true");
  editingPhotoProduct = null;
  selectedPhotoFiles = [];
  photoGalleryPreview.innerHTML = "";
}
photoFileInput.addEventListener("change", () => {
  const files = Array.from(photoFileInput.files || []);
  const invalid = files.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
  if (invalid) {
    selectedPhotoFiles = [];
    photoFileInput.value = "";
    message(photoMessage, "Use apenas JPG, PNG ou WebP, com no máximo 5 MB por imagem.", true);
    renderPhotoPreview();
    return;
  }
  selectedPhotoFiles = files;
  renderPhotoPreview();
  message(photoMessage, files.length ? `${files.length} foto(s) selecionada(s). Clique em Enviar fotos selecionadas.` : "Nenhuma foto nova selecionada.");
});
document.querySelector("#close-photo-modal").addEventListener("click", closePhotoModal);
photoModal.addEventListener("click", event => { if (event.target === photoModal) closePhotoModal(); });
savePhotoButton.addEventListener("click", async () => {
  if (!client || !editingPhotoProduct || !selectedPhotoFiles.length) {
    message(photoMessage, "Selecione uma ou mais fotos antes de enviar.", true);
    return;
  }
  savePhotoButton.disabled = true;
  removePhotoButton.disabled = true;
  message(photoMessage, "Enviando fotos para a nuvem...");
  try {
    const uploadedUrls = [];
    for (const file of selectedPhotoFiles) {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${editingPhotoProduct.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
      const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(filePath, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data: publicData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      uploadedUrls.push(publicData.publicUrl);
    }
    const allUrls = [...new Set([...getProductPhotos(editingPhotoProduct), ...uploadedUrls])];
    const { error: updateError } = await client.from("products").update({ image_urls: allUrls, image_url: allUrls[0] || "" }).eq("id", editingPhotoProduct.id);
    if (updateError) throw updateError;
    editingPhotoProduct.image_urls = allUrls;
    editingPhotoProduct.image_url = allUrls[0] || "";
    message(dashboardMessage, `${uploadedUrls.length} foto(s) adicionada(s) a “${editingPhotoProduct.name}”.`);
    renderAdminProducts();
    closePhotoModal();
  } catch (error) {
    console.error(error);
    message(photoMessage, "Não foi possível salvar as fotos. Confira se executou o SQL de múltiplas fotos e as políticas do Storage.", true);
  } finally {
    savePhotoButton.disabled = false;
    removePhotoButton.disabled = false;
  }
});
removePhotoButton.addEventListener("click", async () => {
  if (!client || !editingPhotoProduct || !getProductPhotos(editingPhotoProduct).length) return;
  if (!confirm("Tem certeza de que deseja remover todas as fotos deste produto?")) return;
  removePhotoButton.disabled = true;
  savePhotoButton.disabled = true;
  message(photoMessage, "Removendo fotos do produto...");
  const { error } = await client.from("products").update({ image_urls: [], image_url: "" }).eq("id", editingPhotoProduct.id);
  if (error) {
    console.error(error);
    message(photoMessage, "Não foi possível remover as fotos. Confira as permissões do Supabase.", true);
    removePhotoButton.disabled = false;
    savePhotoButton.disabled = false;
    return;
  }
  editingPhotoProduct.image_urls = [];
  editingPhotoProduct.image_url = "";
  renderAdminProducts();
  message(dashboardMessage, `Fotos removidas de “${editingPhotoProduct.name}”.`);
  closePhotoModal();
  savePhotoButton.disabled = false;
  removePhotoButton.disabled = false;
});

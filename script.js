/*
  CONFIGURAÇÃO:
  1. Crie um projeto no Supabase.
  2. Copie a Project URL e a anon/public key do Supabase.
  3. Cole os dois valores abaixo.
  4. Configure a tabela usando o arquivo supabase-schema.sql.
  Nunca coloque a service_role key neste arquivo.
*/
const SUPABASE_URL = "https://mytsjfcegfmwuomvnvsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YygDZy2UAAcWPqgRrdOeFQ_7PmjjEk4";
const WHATSAPP_NUMBER = "5511999999999";

const productGrid = document.querySelector("#product-grid");
const filterButtons = document.querySelectorAll(".filter-button");
let products = [];

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 2
  }).format(value);
}
function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
function showSetupMessage() {
  productGrid.innerHTML = '<p class="catalog-message">O catálogo está sendo configurado. Volte em breve.</p>';
}
async function loadProducts() {
  if (SUPABASE_URL.startsWith("COLE_AQUI") || SUPABASE_ANON_KEY.startsWith("COLE_AQUI")) {
    showSetupMessage();
    return;
  }
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=id.asc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!response.ok) throw new Error("Não foi possível carregar o catálogo.");
    products = await response.json();
    renderProducts();
  } catch (error) {
    productGrid.innerHTML = '<p class="catalog-message">Não foi possível carregar os produtos agora. Tente novamente mais tarde.</p>';
    console.error(error);
  }
}
function renderProducts(filter = "todos") {
  const filteredProducts = products.filter(product => filter === "todos" || product.category === filter);
  productGrid.innerHTML = filteredProducts.map(product => {
    const available = product.available;
    const photos = Array.isArray(product.image_urls) && product.image_urls.length ? product.image_urls : (product.image_url ? [product.image_url] : []);
    const imageMarkup = photos.length
      ? `<div class="product-gallery"><img class="product-image" src="${escapeHtml(photos[0])}" alt="${escapeHtml(product.name)}" loading="lazy">${photos.length > 1 ? `<div class="product-thumbnails">${photos.map((url, i) => `<button class="product-thumbnail ${i === 0 ? "active" : ""}" type="button" data-photo="${i}" aria-label="Ver foto ${i+1} de ${escapeHtml(product.name)}"><img src="${escapeHtml(url)}" alt=""></button>`).join("")}</div>` : ""}</div>`
      : `<div class="image-placeholder">FOTO DO PRODUTO</div>`;
    const message = `Olá! Tenho interesse no produto "${product.name}", anunciado por ${formatPrice(product.price)}. Ele ainda está disponível?`;
    const action = available
      ? `<a class="product-link" href="${whatsappLink(message)}" target="_blank" rel="noopener noreferrer">Tenho interesse ↗</a>`
      : `<span class="product-link disabled">Vendido</span>`;
    return `<article class="product-card">
      <div class="product-image-wrap">${imageMarkup}<span class="status-badge ${available ? "" : "sold"}">${available ? "Disponível" : "Vendido"}</span></div>
      <div class="product-info"><p class="product-category">${escapeHtml(product.category_label || product.category)}</p>
      <h3>${escapeHtml(product.name)}</h3><p class="product-description">${escapeHtml(product.description || "")}</p>
      <div class="product-bottom"><span class="product-price">${formatPrice(product.price)}</span>${action}</div></div>
    </article>`;
  }).join("");
  productGrid.querySelectorAll(".product-thumbnail").forEach(button => button.addEventListener("click", () => {
    const gallery = button.closest(".product-gallery");
    const photos = Array.from(gallery.querySelectorAll(".product-thumbnail img")).map(img => img.src);
    const main = gallery.querySelector(".product-image");
    main.src = photos[Number(button.dataset.photo)];
    gallery.querySelectorAll(".product-thumbnail").forEach(item => item.classList.toggle("active", item === button));
  }));
  if (!filteredProducts.length) productGrid.innerHTML = "<p>Nenhum item encontrado nesta categoria.</p>";
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
filterButtons.forEach(button => button.addEventListener("click", () => {
  filterButtons.forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  renderProducts(button.dataset.filter);
}));
const generalWhatsApp = document.querySelector("#general-whatsapp");
if (generalWhatsApp) generalWhatsApp.href = whatsappLink("Olá! Gostaria de mais informações sobre os móveis anunciados.");
const year = document.querySelector("#current-year");
if (year) year.textContent = new Date().getFullYear();
loadProducts();

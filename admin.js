/*
  CONFIGURAÇÃO:
  Cole a mesma Project URL e anon/public key do Supabase usadas em script.js.
  Crie seu usuário administrador em Supabase > Authentication > Users.
  Nunca use a chave service_role no navegador.
*/
const SUPABASE_URL = "https://mytsjfcegfmwuomvnvsc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YygDZy2UAAcWPqgRrdOeFQ_7PmjjEk4";
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
      <div>
        <div class="admin-product-name">${escapeHtml(p.name)}</div>
        <div class="admin-product-meta">${money(p.price)} · ${escapeHtml(p.category_label || p.category)}</div>
        <span class="admin-status ${p.available ? "available" : "sold"}">${p.available ? "Disponível" : "Vendido"}</span>
      </div>
      <button class="status-toggle" type="button" data-id="${p.id}" data-available="${p.available}">
        ${p.available ? "Marcar como vendido" : "Marcar como disponível"}
      </button>
    </article>`).join("");
  if (!shown.length) productList.innerHTML = "<p>Nenhum produto encontrado.</p>";
  productList.querySelectorAll(".status-toggle").forEach(button => button.addEventListener("click", () => toggleAvailability(button)));
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

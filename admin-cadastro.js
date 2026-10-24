/*
  Complemento do painel administrativo: cadastro de novos produtos.
  Usa a chave pública do Supabase; nunca colocar service_role/secret key no navegador.
*/
(() => {
  const SUPABASE_URL = "https://mytsjfcegfmwuomvnvsc.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_YygDZy2UAAcWPqgRrdOeFQ_7PmjjEk4";
  const STORAGE_BUCKET = "product-photos";

  function start() {
    if (!window.supabase || !document.querySelector("#dashboard-panel")) return;
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const dashboard = document.querySelector("#dashboard-panel");
    if (document.querySelector("#new-product-panel")) return;

    const panel = document.createElement("section");
    panel.id = "new-product-panel";
    panel.className = "admin-panel new-product-panel";
    panel.innerHTML = `
      <div class="new-product-heading">
        <div>
          <p class="eyebrow">CATÁLOGO</p>
          <h2>Adicionar novo produto</h2>
          <p>Cadastre um item sem precisar editar os arquivos da loja.</p>
        </div>
      </div>
      <form id="new-product-form" class="new-product-form">
        <label for="new-product-name">Nome do produto *</label>
        <input id="new-product-name" name="name" type="text" maxlength="120" required placeholder="Ex.: Mesa de jantar com 4 cadeiras">

        <label for="new-product-price">Preço (R$) *</label>
        <input id="new-product-price" name="price" type="number" min="0" step="0.01" required placeholder="Ex.: 450,00">

        <label for="new-product-category">Categoria *</label>
        <select id="new-product-category" name="category" required>
          <option value="sala">Sala</option>
          <option value="quarto">Quarto</option>
          <option value="cozinha">Cozinha</option>
          <option value="escritorio">Escritório</option>
          <option value="decoracao">Decoração</option>
          <option value="eletronicos">Eletrônicos</option>
          <option value="outros" selected>Outros</option>
        </select>

        <label for="new-product-description">Descrição (opcional)</label>
        <textarea id="new-product-description" name="description" rows="3" maxlength="1000" placeholder="Detalhes, medidas, estado de conservação..."></textarea>

        <label for="new-product-photos">Fotos do produto</label>
        <input id="new-product-photos" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple>
        <p class="new-product-help">JPG, PNG ou WebP. Até 5 MB por foto. Você pode selecionar várias imagens.</p>
        <div id="new-product-preview" class="new-product-preview" aria-live="polite"></div>

        <p id="new-product-message" class="form-message" role="status"></p>
        <div class="new-product-actions">
          <button id="new-product-submit" class="button button-dark" type="submit">Salvar produto</button>
          <button id="new-product-reset" class="button button-outline" type="reset">Limpar formulário</button>
        </div>
      </form>`;
    dashboard.insertBefore(panel, dashboard.querySelector(".admin-tools"));

    const form = panel.querySelector("#new-product-form");
    const fileInput = panel.querySelector("#new-product-photos");
    const preview = panel.querySelector("#new-product-preview");
    const status = panel.querySelector("#new-product-message");
    const submit = panel.querySelector("#new-product-submit");

    const categoryLabels = {
      sala: "Sala", quarto: "Quarto", cozinha: "Cozinha",
      escritorio: "Escritório", decoracao: "Decoração",
      eletronicos: "Eletrônicos", outros: "Outros"
    };

    function showMessage(text, error = false) {
      status.textContent = text;
      status.classList.toggle("error", error);
    }

    function validFiles(files) {
      return files.every(file =>
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= 5 * 1024 * 1024
      );
    }

    function renderPreview() {
      preview.replaceChildren();
      Array.from(fileInput.files || []).forEach(file => {
        const item = document.createElement("div");
        item.className = "new-product-preview-item";
        const img = document.createElement("img");
        img.alt = file.name;
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        const caption = document.createElement("span");
        caption.textContent = file.name;
        item.append(img, caption);
        preview.appendChild(item);
      });
    }

    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      if (!validFiles(files)) {
        fileInput.value = "";
        preview.replaceChildren();
        showMessage("Use apenas JPG, PNG ou WebP, com até 5 MB por foto.", true);
        return;
      }
      renderPreview();
      showMessage(files.length ? `${files.length} foto(s) selecionada(s).` : "");
    });

    form.addEventListener("reset", () => {
      preview.replaceChildren();
      showMessage("");
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (submit.disabled) return;

      const name = panel.querySelector("#new-product-name").value.trim();
      const price = Number(panel.querySelector("#new-product-price").value);
      const category = panel.querySelector("#new-product-category").value;
      const description = panel.querySelector("#new-product-description").value.trim();
      const files = Array.from(fileInput.files || []);

      if (!name || !Number.isFinite(price) || price < 0) {
        showMessage("Informe um nome e um preço válido.", true);
        return;
      }
      if (!validFiles(files)) {
        showMessage("Confira as fotos: JPG, PNG ou WebP, até 5 MB por imagem.", true);
        return;
      }

      submit.disabled = true;
      showMessage("Salvando produto...");
      let insertedProduct = null;
      const uploadedPaths = [];

      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError || !sessionData.session) {
          throw new Error("Sua sessão expirou. Entre novamente no painel.");
        }

        // O esquema atual usa bigint como chave primária sem geração automática.
        // A leitura pública dos produtos já é usada pela própria loja.
        const { data: lastRows, error: lastError } = await client
          .from("products").select("id").order("id", { ascending: false }).limit(1);
        if (lastError) throw lastError;
        const nextId = (lastRows && lastRows.length ? Number(lastRows[0].id) : 0) + 1;

        const { data: created, error: insertError } = await client
          .from("products")
          .insert({
            id: nextId,
            name,
            price,
            category,
            category_label: categoryLabels[category] || "Outros",
            description,
            image_url: "",
            image_urls: [],
            available: true
          })
          .select("*")
          .single();
        if (insertError) throw insertError;
        insertedProduct = created;

        const urls = [];
        for (const file of files) {
          const safeName = file.name.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `${nextId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
          const { error: uploadError } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
              upsert: false,
              contentType: file.type,
              cacheControl: "3600"
            });
          if (uploadError) throw uploadError;
          uploadedPaths.push(path);
          const { data: publicData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          urls.push(publicData.publicUrl);
        }

        if (urls.length) {
          const { error: photoUpdateError } = await client
            .from("products")
            .update({ image_urls: urls, image_url: urls[0] })
            .eq("id", nextId);
          if (photoUpdateError) throw photoUpdateError;
        }

        showMessage("Produto cadastrado com sucesso! Atualizando o painel...");
        form.reset();

        // Recarrega a lista de produtos no painel existente.
        const reloadButton = document.querySelector("#search-products");
        if (reloadButton) reloadButton.dispatchEvent(new Event("input", { bubbles: true }));
        window.setTimeout(() => window.location.reload(), 900);
      } catch (error) {
        console.error("Erro ao cadastrar produto:", error);
        // Se a inclusão ocorreu, mas o envio das fotos falhou, mantém o produto
        // cadastrado para que as fotos possam ser adicionadas depois pelo painel.
        if (insertedProduct) {
          showMessage("O produto foi criado, mas houve um problema ao enviar as fotos. Você pode adicioná-las pelo botão de fotos. Confira as políticas do Storage.", true);
        } else {
          const detail = error && error.message ? ` Detalhe: ${error.message}` : "";
          showMessage("Não foi possível cadastrar. Confira as políticas SQL e se você está logado." + detail, true);
        }
      } finally {
        submit.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

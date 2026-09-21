const modules = [
  ["💻", "Programación"],
  ["🗄️", "Bases de Datos"],
  ["🛠️", "Entornos de Desarrollo"],
  ["🖥️", "Sistemas Informáticos"],
  ["🌐", "Lenguajes de Marcas"],
  ["📱", "Digitalización"],
  ["💼", "IPE I"],
  ["♻️", "Sostenibilidad"]
];

const sampleDocs = [
  {
    id: "demo-1",
    title: "Bienvenido a DAMFLIX",
    module: "Programación",
    type: "Apuntes",
    url: "",
    favorite: true,
    status: "Pendiente",
    demo: true
  }
];

let docs = JSON.parse(
  localStorage.getItem("damflix_docs") || "null"
) || sampleDocs;

let activeModule = "Todos";
let activeFilter = "Todos";

const moduleRow = document.getElementById("moduleRow");
const documentGrid = document.getElementById("documentGrid");
const searchInput = document.getElementById("searchInput");
const moduleSelect = document.getElementById("module");
const modal = document.getElementById("uploadModal");
const uploadStatus = document.getElementById("uploadStatus");


// ===============================
// SUPABASE
// ===============================

const CONFIG = window.DAMFLIX_CONFIG || {};

const configured =
  CONFIG.supabaseUrl &&
  CONFIG.supabaseAnonKey &&
  !CONFIG.supabaseUrl.includes("PEGA_AQUI") &&
  !CONFIG.supabaseAnonKey.includes("PEGA_AQUI");

const supabaseClient =
  configured && window.supabase
    ? window.supabase.createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey
      )
    : null;


// ===============================
// CREAR MÓDULOS
// ===============================

modules.forEach(([icon, name]) => {

  const card = document.createElement("div");

  card.className = "module-card";

  card.innerHTML = `
    <div class="icon">${icon}</div>
    <h3>${name}</h3>
    <p>Ver documentos</p>
  `;

  card.onclick = () => {

    activeModule = name;

    document
      .getElementById("biblioteca")
      .scrollIntoView();

    renderDocs();
  };

  moduleRow.appendChild(card);


  const option = document.createElement("option");

  option.value = name;
  option.textContent = name;

  moduleSelect.appendChild(option);

});


// ===============================
// GUARDAR DOCUMENTOS
// ===============================

function saveDocs() {

  localStorage.setItem(
    "damflix_docs",
    JSON.stringify(docs)
  );

}


// ===============================
// SEGURIDAD HTML
// ===============================

function escapeHtml(text) {

  return String(text).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[c]
  );

}


// ===============================
// MOSTRAR DOCUMENTOS
// ===============================

function renderDocs() {

  const q =
    searchInput.value
      .trim()
      .toLowerCase();


  const filtered = docs.filter(doc => {

    const matchesSearch =
      [
        doc.title,
        doc.module,
        doc.type
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);


    const matchesModule =
      activeModule === "Todos" ||
      doc.module === activeModule;


    let matchesFilter = true;


    if (activeFilter === "Favoritos") {

      matchesFilter = !!doc.favorite;

    }


    if (activeFilter === "Pendiente") {

      matchesFilter =
        doc.status === "Pendiente";

    }


    if (activeFilter === "Completado") {

      matchesFilter =
        doc.status === "Completado";

    }


    return (
      matchesSearch &&
      matchesModule &&
      matchesFilter
    );

  });


  documentGrid.innerHTML = "";


  document
    .getElementById("emptyState")
    .classList.toggle(
      "hidden",
      filtered.length > 0
    );


  filtered.forEach(doc => {

    const card =
      document.createElement("article");

    card.className = "doc-card";


    card.innerHTML = `
      <div class="doc-cover">
        📕

        <button
          class="favorite ${doc.favorite ? "on" : ""}"
          title="Favorito"
        >
          ★
        </button>
      </div>

      <div class="doc-body">

        <span class="badge">
          ${escapeHtml(
            doc.status || "Pendiente"
          )}
        </span>

        <h3>
          ${escapeHtml(doc.title)}
        </h3>

        <div class="meta">
          ${escapeHtml(doc.module)}
          ·
          ${escapeHtml(doc.type)}
        </div>

        <div class="doc-actions">

          <button class="open-btn">
            ${doc.demo ? "Demo" : "Abrir"}
          </button>

          <button class="progress-btn">
            ${
              doc.status === "Completado"
                ? "↩"
                : "✓"
            }
          </button>

          ${
            doc.demo
              ? ""
              : '<button class="delete-btn">×</button>'
          }

        </div>

      </div>
    `;


    // FAVORITO

    card
      .querySelector(".favorite")
      .onclick = () => {

        doc.favorite = !doc.favorite;

        saveDocs();

        renderDocs();

      };


    // COMPLETADO

    card
      .querySelector(".progress-btn")
      .onclick = () => {

        doc.status =
          doc.status === "Completado"
            ? "Pendiente"
            : "Completado";

        saveDocs();

        renderDocs();

      };


    // ABRIR PDF

    card
      .querySelector(".open-btn")
      .onclick = () => {

        if (doc.demo) {

          alert(
            "Sube tu primer PDF con el botón '+ Subir PDF'."
          );

        } else if (doc.url) {

          window.open(
            doc.url,
            "_blank",
            "noopener,noreferrer"
          );

        }

      };


    // ELIMINAR PDF

    const deleteBtn =
      card.querySelector(".delete-btn");


    if (deleteBtn) {

      deleteBtn.onclick = async () => {

        if (
          !confirm(
            `¿Eliminar "${doc.title}" de DAMFLIX?`
          )
        ) {
          return;
        }


        try {

          if (
            doc.path &&
            supabaseClient
          ) {

            const {
              error
            } = await supabaseClient
              .storage
              .from(CONFIG.bucket)
              .remove([doc.path]);


            if (error) {

              console.error(
                "Error eliminando archivo:",
                error
              );

            }

          }

        } catch (error) {

          console.error(
            "Error eliminando archivo:",
            error
          );

        }


        docs =
          docs.filter(
            x => x.id !== doc.id
          );


        saveDocs();

        renderDocs();

      };

    }


    documentGrid.appendChild(card);

  });

}


// ===============================
// FILTROS
// ===============================

document
  .querySelectorAll(".filter")
  .forEach(btn => {

    btn.onclick = () => {

      document
        .querySelectorAll(".filter")
        .forEach(b =>
          b.classList.remove("active")
        );


      btn.classList.add("active");


      activeFilter =
        btn.dataset.filter;


      renderDocs();

    };

  });


// ===============================
// BUSCADOR
// ===============================

searchInput.addEventListener(
  "input",
  renderDocs
);


// ===============================
// MODAL SUBIR PDF
// ===============================

function openModal() {

  modal.classList.remove("hidden");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

}


function closeModal() {

  modal.classList.add("hidden");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  uploadStatus.textContent = "";

}


document
  .getElementById("openUpload")
  .onclick = openModal;


document
  .getElementById("heroUpload")
  .onclick = openModal;


document
  .getElementById("closeUpload")
  .onclick = closeModal;


modal.addEventListener(
  "click",
  e => {

    if (e.target === modal) {

      closeModal();

    }

  }
);


// ===============================
// SUBIR PDF
// ===============================

document
  .getElementById("uploadForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      // Comprobar conexión

      if (!supabaseClient) {

        uploadStatus.textContent =
          "Error: Supabase no está configurado correctamente.";

        return;

      }


      const file =
        document
          .getElementById("file")
          .files[0];


      const title =
        document
          .getElementById("title")
          .value
          .trim();


      const module =
        document
          .getElementById("module")
          .value;


      const type =
        document
          .getElementById("type")
          .value;


      if (!file) {

        uploadStatus.textContent =
          "Selecciona un PDF.";

        return;

      }


      // Comprobar PDF

      if (
        file.type !== "application/pdf" &&
        !file.name
          .toLowerCase()
          .endsWith(".pdf")
      ) {

        uploadStatus.textContent =
          "Solo puedes subir archivos PDF.";

        return;

      }


      uploadStatus.textContent =
        "Subiendo PDF...";


      try {

        // Limpiar nombre

        const safeName =
          file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


        // Crear carpeta según módulo

        const moduleFolder =
          module.replace(
            /\s+/g,
            "_"
          );


        // Nombre único

        const fileName =
          `${Date.now()}_${safeName}`;


        // Ruta final

        const path =
          `${moduleFolder}/${fileName}`;


        console.log(
          "Subiendo:",
          path
        );


        // SUBIR A SUPABASE

        const {
          error: uploadError
        } = await supabaseClient
          .storage
          .from(CONFIG.bucket)
          .upload(
            path,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                file.type ||
                "application/pdf"
            }
          );


        if (uploadError) {

          throw uploadError;

        }


        // OBTENER URL PÚBLICA

        const {
          data
        } = supabaseClient
          .storage
          .from(CONFIG.bucket)
          .getPublicUrl(path);


        // GUARDAR EN LA BIBLIOTECA LOCAL

        docs.unshift({

          id:
            crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now()),

          title,

          module,

          type,

          url:
            data.publicUrl,

          path,

          favorite:
            false,

          status:
            "Pendiente"

        });


        saveDocs();

        renderDocs();


        // Limpiar formulario

        e.target.reset();


        uploadStatus.textContent =
          "PDF subido correctamente.";


        // Cerrar ventana

        setTimeout(
          closeModal,
          700
        );


      } catch (error) {

        console.error(
          "ERROR SUPABASE:",
          error
        );


        uploadStatus.textContent =
          "Error: " +
          (
            error.message ||
            "No se pudo subir el archivo."
          );

      }

    }
  );


// ===============================
// INICIAR DAMFLIX
// ===============================

renderDocs();

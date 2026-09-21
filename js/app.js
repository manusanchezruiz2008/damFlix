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
    topic: "Tema 1",
    type: "Apuntes",
    url: "",
    path: "",
    favorite: true,
    status: "Pendiente",
    demo: true
  }
];

let docs =
  JSON.parse(
    localStorage.getItem("damflix_docs") || "null"
  ) || sampleDocs;

let activeModule = "Todos";
let activeFilter = "Todos";


const moduleRow =
  document.getElementById("moduleRow");

const documentGrid =
  document.getElementById("documentGrid");

const searchInput =
  document.getElementById("searchInput");

const moduleSelect =
  document.getElementById("module");

const modal =
  document.getElementById("uploadModal");

const uploadStatus =
  document.getElementById("uploadStatus");


/* =====================================
   SUPABASE
===================================== */

const CONFIG =
  window.DAMFLIX_CONFIG || {};

const configured =
  CONFIG.supabaseUrl &&
  CONFIG.supabaseAnonKey &&
  CONFIG.bucket &&
  !CONFIG.supabaseUrl.includes("PEGA_AQUI") &&
  !CONFIG.supabaseAnonKey.includes("PEGA_AQUI");

const supabaseClient =
  configured && window.supabase
    ? window.supabase.createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey
      )
    : null;


/* =====================================
   MÓDULOS
===================================== */

modules.forEach(([icon, name]) => {

  const card =
    document.createElement("div");

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
      .scrollIntoView({
        behavior: "smooth"
      });

    renderDocs();

  };

  moduleRow.appendChild(card);


  const option =
    document.createElement("option");

  option.value = name;

  option.textContent = name;

  moduleSelect.appendChild(option);

});


/* =====================================
   GUARDAR DOCUMENTOS
===================================== */

function saveDocs() {

  localStorage.setItem(
    "damflix_docs",
    JSON.stringify(docs)
  );

}


/* =====================================
   SEGURIDAD
===================================== */

function escapeHtml(text) {

  return String(text).replace(
    /[&<>"']/g,
    function(character) {

      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];

    }
  );

}


/* =====================================
   MOSTRAR DOCUMENTOS
===================================== */

function renderDocs() {

  const q =
    searchInput.value
      .trim()
      .toLowerCase();


  const filtered =
    docs.filter(doc => {

      const text = [
        doc.title,
        doc.module,
        doc.topic,
        doc.type
      ]
        .join(" ")
        .toLowerCase();


      const matchesSearch =
        text.includes(q);


      const matchesModule =
        activeModule === "Todos" ||
        doc.module === activeModule;


      let matchesFilter = true;


      if (
        activeFilter === "Favoritos"
      ) {

        matchesFilter =
          !!doc.favorite;

      }


      if (
        activeFilter === "Pendiente"
      ) {

        matchesFilter =
          doc.status === "Pendiente";

      }


      if (
        activeFilter === "Completado"
      ) {

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
          type="button"
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

          ${escapeHtml(
            doc.topic || "Sin tema"
          )}

          ·

          ${escapeHtml(doc.type)}

        </div>

        <div class="doc-actions">

          <button
            class="open-btn"
            type="button"
          >
            ${doc.demo ? "Demo" : "Abrir"}
          </button>

          <button
            class="progress-btn"
            type="button"
          >
            ${
              doc.status === "Completado"
                ? "↩"
                : "✓"
            }
          </button>

          ${
            doc.demo
              ? ""
              : `
                <button
                  class="delete-btn"
                  type="button"
                >
                  ×
                </button>
              `
          }

        </div>

      </div>
    `;


    /* FAVORITO */

    card
      .querySelector(".favorite")
      .onclick = () => {

        doc.favorite =
          !doc.favorite;

        saveDocs();

        renderDocs();

      };


    /* COMPLETADO */

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


    /* ABRIR */

    card
      .querySelector(".open-btn")
      .onclick = () => {

        if (doc.demo) {

          alert(
            "Este es el documento de demostración."
          );

          return;

        }

        if (doc.url) {

          window.open(
            doc.url,
            "_blank",
            "noopener,noreferrer"
          );

        }

      };


    /* ELIMINAR */

    const deleteBtn =
      card.querySelector(
        ".delete-btn"
      );


    if (deleteBtn) {

      deleteBtn.onclick =
        async () => {

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

              await supabaseClient
                .storage
                .from(CONFIG.bucket)
                .remove([
                  doc.path
                ]);

            }

          } catch (error) {

            console.error(error);

          }


          docs =
            docs.filter(
              item =>
                item.id !== doc.id
            );


          saveDocs();

          renderDocs();

        };

    }


    documentGrid.appendChild(card);

  });

}


/* =====================================
   FILTROS
===================================== */

document
  .querySelectorAll(".filter")
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(".filter")
        .forEach(item => {

          item.classList.remove(
            "active"
          );

        });


      button.classList.add(
        "active"
      );


      activeFilter =
        button.dataset.filter;


      renderDocs();

    };

  });


/* =====================================
   BUSCADOR
===================================== */

searchInput.addEventListener(
  "input",
  renderDocs
);


/* =====================================
   MODAL
===================================== */

function openModal() {

  modal.classList.remove(
    "hidden"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

}


function closeModal() {

  modal.classList.add(
    "hidden"
  );

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
  event => {

    if (
      event.target === modal
    ) {

      closeModal();

    }

  }
);


/* =====================================
   SUBIR PDF
===================================== */

document
  .getElementById("uploadForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!supabaseClient) {

        uploadStatus.textContent =
          "Supabase no está configurado correctamente.";

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


      const topic =
        document
          .getElementById("topic")
          .value
          .trim();


      const type =
        document
          .getElementById("type")
          .value;


      if (!file) {

        uploadStatus.textContent =
          "Selecciona un PDF.";

        return;

      }


      uploadStatus.textContent =
        "Subiendo PDF...";


      try {


        /* LIMPIAR NOMBRES */

        const moduleFolder =
          module
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            );


        const topicFolder =
          topic
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              "_"
            );


        const safeName =
          file.name
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            )
            .replace(
              /[^a-zA-Z0-9._-]/g,
              "_"
            );


        /* RUTA FINAL */

        const path =
          `${moduleFolder}/${topicFolder}/${Date.now()}_${safeName}`;


        console.log(
          "Subiendo:",
          path
        );


        /* SUBIR */

        const {
          error
        } =
          await supabaseClient
            .storage
            .from(CONFIG.bucket)
            .upload(
              path,
              file,
              {
                cacheControl: "3600",
                upsert: false,
                contentType:
                  "application/pdf"
              }
            );


        if (error) {

          throw error;

        }


        /* URL */

        const {
          data
        } =
          supabaseClient
            .storage
            .from(CONFIG.bucket)
            .getPublicUrl(path);


        /* GUARDAR DOCUMENTO */

        docs.unshift({

          id:
            crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now()),

          title:
            title ||
            file.name,

          module:

            module,

          topic:

            topic,

          type:

            type,

          url:

            data.publicUrl,

          path:

            path,

          favorite:

            false,

          status:

            "Pendiente",

          demo:

            false

        });


        saveDocs();

        renderDocs();


        event.target.reset();


        uploadStatus.textContent =
          "PDF subido correctamente.";


        setTimeout(
          closeModal,
          800
        );


      } catch (error) {

        console.error(
          "ERROR:",
          error
        );


        uploadStatus.textContent =
          "Error: " +
          (
            error.message ||
            "No se pudo subir el PDF."
          );

      }

    }
  );


/* =====================================
   INICIAR
===================================== */

renderDocs();

console.log(
  "DAMFLIX cargado correctamente"
);

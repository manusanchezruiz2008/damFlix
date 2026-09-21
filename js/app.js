const supabaseClient = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseAnonKey
);


/* =========================================================
   MÓDULOS
========================================================= */

const modules = [
    {
        name: "Programación",
        icon: "💻"
    },
    {
        name: "Bases de Datos",
        icon: "🗄️"
    },
    {
        name: "Entornos de Desarrollo",
        icon: "🛠️"
    },
    {
        name: "Sistemas Informáticos",
        icon: "🖥️"
    },
    {
        name: "Digitalización",
        icon: "🔢"
    },
    {
        name: "IPE I",
        icon: "💼"
    },
    {
        name: "Sostenibilidad",
        icon: "♻️"
    }
];


/* =========================================================
   VARIABLES
========================================================= */

let documents = [];

let currentModule = "";

let currentFilter = "all";


/* =========================================================
   INICIAR APLICACIÓN
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    checkSupabase();

    loadModules();

    loadDocuments();

    setupEvents();

});


/* =========================================================
   COMPROBAR SUPABASE
========================================================= */

function checkSupabase() {

    if (!CONFIG.supabaseUrl) {

        console.error("Falta supabaseUrl en config.js");

        return false;

    }

    if (!CONFIG.supabaseAnonKey) {

        console.error("Falta supabaseAnonKey en config.js");

        return false;

    }

    if (!CONFIG.bucket) {

        console.error("Falta el nombre del bucket en config.js");

        return false;

    }

    return true;
}


/* =========================================================
   CARGAR MÓDULOS
========================================================= */

function loadModules() {

    const moduleRow =
        document.getElementById("moduleRow");

    const moduleSelect =
        document.getElementById("module");

    const uploadModule =
        document.getElementById("uploadModule");


    modules.forEach(function (module) {

        /* TARJETA DEL MÓDULO */

        const card = document.createElement("div");

        card.className = "module-card";

        card.innerHTML = `
            <div class="module-icon">
                ${module.icon}
            </div>

            <h3>
                ${module.name}
            </h3>

            <p>
                Ver documentos
            </p>
        `;


        card.addEventListener("click", function () {

            currentModule = module.name;

            document.getElementById("module").value =
                module.name;

            loadDocuments();

            document
                .getElementById("biblioteca")
                .scrollIntoView({
                    behavior: "smooth"
                });

        });


        moduleRow.appendChild(card);


        /* SELECT PRINCIPAL */

        const option =
            document.createElement("option");

        option.value = module.name;

        option.textContent = module.name;

        moduleSelect.appendChild(option);


        /* SELECT DEL MODAL */

        const uploadOption =
            document.createElement("option");

        uploadOption.value = module.name;

        uploadOption.textContent = module.name;

        uploadModule.appendChild(uploadOption);

    });

}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {


    /* ABRIR MODAL */

    document
        .getElementById("openUpload")
        .addEventListener("click", function () {

            document
                .getElementById("uploadModal")
                .classList.add("show");

        });


    /* CERRAR MODAL */

    document
        .getElementById("closeUpload")
        .addEventListener("click", closeModal);


    /* CLICK FUERA DEL MODAL */

    document
        .getElementById("uploadModal")
        .addEventListener("click", function (event) {

            if (event.target === this) {

                closeModal();

            }

        });


    /* FORMULARIO */

    document
        .getElementById("uploadForm")
        .addEventListener("submit", function (event) {

            event.preventDefault();

            uploadDocument();

        });


    /* SELECT DE MÓDULO */

    document
        .getElementById("module")
        .addEventListener("change", function () {

            currentModule = this.value;

            loadDocuments();

        });


    /* BUSCADOR */

    document
        .getElementById("searchInput")
        .addEventListener("input", function () {

            renderDocuments();

        });


    /* FILTROS */

    document
        .querySelectorAll(".filter")
        .forEach(function (button) {

            button.addEventListener("click", function () {

                document
                    .querySelectorAll(".filter")
                    .forEach(function (btn) {

                        btn.classList.remove("active");

                    });

                this.classList.add("active");

                currentFilter =
                    this.dataset.filter;

                renderDocuments();

            });

        });

}


/* =========================================================
   CERRAR MODAL
========================================================= */

function closeModal() {

    document
        .getElementById("uploadModal")
        .classList.remove("show");

}


/* =========================================================
   CARGAR DOCUMENTOS
========================================================= */

async function loadDocuments() {

    const grid =
        document.getElementById("documentGrid");

    grid.innerHTML =
        "<p>Cargando documentos...</p>";


    try {

        const { data, error } =
            await supabaseClient
                .from("files")
                .select("*")
                .order("created_at", {
                    ascending: false
                });


        if (error) {

            console.error(error);

            grid.innerHTML =
                "<p>No se pudieron cargar los documentos.</p>";

            return;

        }


        documents = data || [];


        renderDocuments();

    } catch (error) {

        console.error(error);

        grid.innerHTML =
            "<p>Error al cargar los documentos.</p>";

    }

}


/* =========================================================
   MOSTRAR DOCUMENTOS
========================================================= */

function renderDocuments() {

    const grid =
        document.getElementById("documentGrid");

    const searchInput =
        document.getElementById("searchInput");

    const search =
        searchInput.value.toLowerCase().trim();


    let filtered =
        documents.slice();


    /* FILTRAR POR MÓDULO */

    if (currentModule !== "") {

        filtered =
            filtered.filter(function (document) {

                return document.module === currentModule;

            });

    }


    /* BUSCADOR */

    if (search !== "") {

        filtered =
            filtered.filter(function (document) {

                const text = `

                    ${document.title || ""}

                    ${document.module || ""}

                    ${document.topic || ""}

                    ${document.type || ""}

                `.toLowerCase();


                return text.includes(search);

            });

    }


    /* FAVORITOS */

    if (currentFilter === "favorite") {

        filtered =
            filtered.filter(function (document) {

                return document.favorite === true;

            });

    }


    /* PENDIENTES */

    if (currentFilter === "pending") {

        filtered =
            filtered.filter(function (document) {

                return document.completed !== true;

            });

    }


    /* COMPLETADOS */

    if (currentFilter === "completed") {

        filtered =
            filtered.filter(function (document) {

                return document.completed === true;

            });

    }


    /* NO HAY DOCUMENTOS */

    if (filtered.length === 0) {

        grid.innerHTML = `
            <div class="empty">
                No hay documentos para mostrar.
            </div>
        `;

        return;

    }


    /* CREAR TARJETAS */

    grid.innerHTML = "";


    filtered.forEach(function (document) {

        const card =
            createDocumentCard(document);

        grid.appendChild(card);

    });

}


/* =========================================================
   CREAR TARJETA
========================================================= */

function createDocumentCard(document) {

    const card =
        document.createElement("div");

    card.className =
        "document-card";


    const completed =
        document.completed === true;


    const favorite =
        document.favorite === true;


    card.innerHTML = `

        <div class="document-top">

            <span class="document-type">
                ${escapeHTML(document.type || "Archivo")}
            </span>

            <button
                class="favorite-button"
                title="Favorito"
            >
                ${favorite ? "★" : "☆"}
            </button>

        </div>


        <div class="document-icon">
            ${getFileIcon(document)}
        </div>


        <h3>
            ${escapeHTML(document.title || "Sin título")}
        </h3>


        <p class="document-info">

            ${escapeHTML(document.module || "")}

            ·

            ${escapeHTML(document.topic || "Sin tema")}

        </p>


        <div class="document-status">

            ${completed
                ? "Completado"
                : "Pendiente"
            }

        </div>


        <div class="document-actions">

            <button class="open-document">
                Abrir
            </button>

            <button class="complete-document">

                ${completed
                    ? "Pendiente"
                    : "Completar"
                }

            </button>

        </div>

    `;


    /* FAVORITO */

    card
        .querySelector(".favorite-button")
        .addEventListener("click", function () {

            toggleFavorite(document);

        });


    /* COMPLETADO */

    card
        .querySelector(".complete-document")
        .addEventListener("click", function () {

            toggleCompleted(document);

        });


    /* ABRIR */

    card
        .querySelector(".open-document")
        .addEventListener("click", function () {

            openDocument(document);

        });


    return card;

}


/* =========================================================
   ICONO DEL ARCHIVO
========================================================= */

function getFileIcon(document) {

    const path =
        document.path ||
        document.url ||
        "";

    const extension =
        path
            .split("?")[0]
            .split(".")
            .pop()
            .toLowerCase();


    if (extension === "pdf") {
        return "📕";
    }

    if (
        extension === "doc" ||
        extension === "docx"
    ) {
        return "📘";
    }

    if (
        extension === "xls" ||
        extension === "xlsx"
    ) {
        return "📗";
    }

    if (
        extension === "ppt" ||
        extension === "pptx"
    ) {
        return "📙";
    }

    if (
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "png" ||
        extension === "gif" ||
        extension === "webp"
    ) {
        return "🖼️";
    }

    if (
        extension === "zip" ||
        extension === "rar" ||
        extension === "7z"
    ) {
        return "🗜️";
    }

    if (
        extension === "html" ||
        extension === "css" ||
        extension === "js" ||
        extension === "php" ||
        extension === "java" ||
        extension === "py"
    ) {
        return "💻";
    }

    if (
        extension === "txt" ||
        extension === "md"
    ) {
        return "📄";
    }

    return "📁";

}


/* =========================================================
   SUBIR ARCHIVO
========================================================= */

async function uploadDocument() {

    const title =
        document.getElementById("title")
            .value
            .trim();


    const module =
        document.getElementById("uploadModule")
            .value;


    const topic =
        document.getElementById("topic")
            .value
            .trim();


    const type =
        document.getElementById("type")
            .value;


    const fileInput =
        document.getElementById("file");


    const file =
        fileInput.files[0];


    const status =
        document.getElementById("uploadStatus");


    status.textContent = "";


    /* VALIDACIONES */

    if (!title) {

        status.textContent =
            "Escribe un título.";

        return;

    }


    if (!module) {

        status.textContent =
            "Selecciona un módulo.";

        return;

    }


    if (!topic) {

        status.textContent =
            "Escribe un tema.";

        return;

    }


    if (!file) {

        status.textContent =
            "Selecciona un archivo.";

        return;

    }


    try {

        status.textContent =
            "Subiendo archivo...";


        /*
         * LIMPIAMOS LOS NOMBRES
         */

        const moduleFolder =
            cleanPath(module);


        const topicFolder =
            cleanPath(topic);


        const fileName =
            cleanFileName(file.name);


        /*
         * RUTA FINAL
         *
         * IMPORTANTE:
         * NO empieza por /
         */

        const path =
            moduleFolder +
            "/" +
            topicFolder +
            "/" +
            Date.now() +
            "_" +
            fileName;


        console.log("Bucket:", CONFIG.bucket);

        console.log("Ruta:", path);


        /*
         * SUBIR A STORAGE
         */

        const {
            data: uploadData,
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
                        "application/octet-stream"
                }
            );


        if (uploadError) {

            console.error(
                "Error Storage:",
                uploadError
            );

            status.textContent =
                "Error: " +
                uploadError.message;

            return;

        }


        /*
         * OBTENER URL
         */

        const {
            data: publicData
        } = supabaseClient
            .storage
            .from(CONFIG.bucket)
            .getPublicUrl(path);


        if (
            !publicData ||
            !publicData.publicUrl
        ) {

            status.textContent =
                "El archivo se subió, pero no se pudo obtener su URL.";

            return;

        }


        /*
         * GUARDAR EN BASE DE DATOS
         */

        const {
            data: databaseData,
            error: databaseError
        } = await supabaseClient
            .from("files")
            .insert([

                {
                    title: title,
                    module: module,
                    topic: topic,
                    type: type,
                    url: publicData.publicUrl,
                    path: path,
                    favorite: false,
                    completed: false
                }

            ])
            .select();


        if (databaseError) {

            console.error(
                "Error Base de Datos:",
                databaseError
            );


            /*
             * EL ARCHIVO YA SE SUBIÓ.
             * NO LO BORRAMOS.
             */

            status.textContent =
                "El archivo se subió, pero hubo un error al guardarlo en la biblioteca.";

            return;

        }


        /*
         * TODO CORRECTO
         */

        status.textContent =
            "Archivo subido correctamente.";


        /*
         * LIMPIAR FORMULARIO
         */

        document
            .getElementById("uploadForm")
            .reset();


        /*
         * ACTUALIZAR BIBLIOTECA
         */

        await loadDocuments();


        /*
         * CERRAR MODAL
         */

        setTimeout(function () {

            closeModal();

            status.textContent = "";

        }, 700);


    } catch (error) {

        console.error(
            "Error general:",
            error
        );


        status.textContent =
            "Error al subir el archivo: " +
            error.message;

    }

}


/* =========================================================
   LIMPIAR RUTA
========================================================= */

function cleanPath(text) {

    return text

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
        )

        .replace(
            /^_+|_+$/g,
            ""
        )

        || "sin_nombre";

}


/* =========================================================
   LIMPIAR NOMBRE DE ARCHIVO
========================================================= */

function cleanFileName(text) {

    return text

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )

        .replace(
            /^_+|_+$/g,
            ""
        )

        || "archivo";

}


/* =========================================================
   ABRIR DOCUMENTO
========================================================= */

function openDocument(document) {

    if (!document.url) {

        alert(
            "Este documento no tiene una URL."
        );

        return;

    }


    window.open(
        document.url,
        "_blank"
    );

}


/* =========================================================
   FAVORITO
========================================================= */

async function toggleFavorite(document) {

    const newValue =
        document.favorite !== true;


    const {
        error
    } = await supabaseClient
        .from("files")
        .update({
            favorite: newValue
        })
        .eq("id", document.id);


    if (error) {

        console.error(error);

        return;

    }


    document.favorite =
        newValue;


    renderDocuments();

}


/* =========================================================
   COMPLETADO
========================================================= */

async function toggleCompleted(document) {

    const newValue =
        document.completed !== true;


    const {
        error
    } = await supabaseClient
        .from("files")
        .update({
            completed: newValue
        })
        .eq("id", document.id);


    if (error) {

        console.error(error);

        return;

    }


    document.completed =
        newValue;


    renderDocuments();

}


/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}

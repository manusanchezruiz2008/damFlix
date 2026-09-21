/* =========================================================
   CONFIGURACIÓN SUPABASE

   PEGA AQUÍ TUS DATOS REALES.
========================================================= */

const SUPABASE_URL =
    "https://sriifbloyfivdyfisixn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_l26P02t68OP-dPzfgQcxeg_9xrc7aJT";

const STORAGE_BUCKET =
    "files";


/* =========================================================
   CONEXIÓN SUPABASE
========================================================= */

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   MÓDULOS DAM
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
        name: "Lenguajes de Marcas",
        icon: "🌐"
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

let documentsList = [];

let currentModule = "";

let currentFilter = "all";


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        createModules();

        setupEvents();

        loadDocuments();

    }
);


/* =========================================================
   CREAR MÓDULOS
========================================================= */

function createModules() {

    const moduleRow =
        document.getElementById(
            "moduleRow"
        );

    const moduleFilter =
        document.getElementById(
            "moduleFilter"
        );

    const uploadModule =
        document.getElementById(
            "uploadModule"
        );


    modules.forEach(function (module) {

        /* =====================
           TARJETA
        ===================== */

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "module-card";

        card.dataset.module =
            module.name;


        card.innerHTML = `

            <div class="module-icon">
                ${module.icon}
            </div>

            <h3>
                ${escapeHTML(module.name)}
            </h3>

            <p>
                Ver documentos
            </p>

        `;


        card.addEventListener(
            "click",
            function () {

                selectModule(
                    module.name
                );

            }
        );


        moduleRow.appendChild(
            card
        );


        /* =====================
           SELECT FILTRO
        ===================== */

        const filterOption =
            document.createElement(
                "option"
            );

        filterOption.value =
            module.name;

        filterOption.textContent =
            module.name;

        moduleFilter.appendChild(
            filterOption
        );


        /* =====================
           SELECT SUBIDA
        ===================== */

        const uploadOption =
            document.createElement(
                "option"
            );

        uploadOption.value =
            module.name;

        uploadOption.textContent =
            module.name;

        uploadModule.appendChild(
            uploadOption
        );

    });

}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    /* =========================
       ABRIR MODAL
    ========================= */

    document
        .getElementById(
            "openUpload"
        )
        .addEventListener(
            "click",
            function () {

                document
                    .getElementById(
                        "uploadModal"
                    )
                    .classList
                    .add("show");

            }
        );


    /* =========================
       CERRAR MODAL
    ========================= */

    document
        .getElementById(
            "closeUpload"
        )
        .addEventListener(
            "click",
            closeModal
        );


    /* =========================
       CERRAR CLICK FUERA
    ========================= */

    document
        .getElementById(
            "uploadModal"
        )
        .addEventListener(
            "click",
            function (event) {

                if (
                    event.target === this
                ) {

                    closeModal();

                }

            }
        );


    /* =========================
       FORMULARIO
    ========================= */

    document
        .getElementById(
            "uploadForm"
        )
        .addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                uploadDocument();

            }
        );


    /* =========================
       SELECT MÓDULO
    ========================= */

    document
        .getElementById(
            "moduleFilter"
        )
        .addEventListener(
            "change",
            function () {

                selectModule(
                    this.value
                );

            }
        );


    /* =========================
       BUSCADOR
    ========================= */

    document
        .getElementById(
            "searchInput"
        )
        .addEventListener(
            "input",
            renderDocuments
        );


    /* =========================
       FILTROS
    ========================= */

    const filterButtons =
        document.querySelectorAll(
            ".filter"
        );


    filterButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    filterButtons.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    this.classList.add(
                        "active"
                    );


                    currentFilter =
                        this.dataset.filter;


                    renderDocuments();

                }
            );

        }
    );

}


/* =========================================================
   SELECCIONAR MÓDULO
========================================================= */

function selectModule(moduleName) {

    currentModule =
        moduleName;


    document
        .getElementById(
            "moduleFilter"
        )
        .value =
        moduleName;


    document
        .querySelectorAll(
            ".module-card"
        )
        .forEach(
            function (card) {

                if (
                    card.dataset.module ===
                    moduleName
                ) {

                    card.classList.add(
                        "selected"
                    );

                } else {

                    card.classList.remove(
                        "selected"
                    );

                }

            }
        );


    const subtitle =
        document.getElementById(
            "librarySubtitle"
        );


    if (moduleName) {

        subtitle.textContent =
            moduleName;

    } else {

        subtitle.textContent =
            "Todos tus documentos";

    }


    renderDocuments();

}


/* =========================================================
   CERRAR MODAL
========================================================= */

function closeModal() {

    document
        .getElementById(
            "uploadModal"
        )
        .classList
        .remove("show");

}


/* =========================================================
   CARGAR DOCUMENTOS DE SUPABASE
========================================================= */

async function loadDocuments() {

    const grid =
        document.getElementById(
            "documentGrid"
        );


    grid.innerHTML =
        '<div class="empty">Cargando documentos...</div>';


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("files")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Error leyendo files:",
                error
            );


            grid.innerHTML =
                `
                <div class="empty">
                    Error al cargar los documentos:
                    ${escapeHTML(error.message)}
                </div>
                `;

            return;

        }


        documentsList =
            data || [];


        renderDocuments();

    } catch (error) {

        console.error(
            error
        );


        grid.innerHTML =
            `
            <div class="empty">
                Error al conectar con Supabase.
            </div>
            `;

    }

}


/* =========================================================
   MOSTRAR DOCUMENTOS
========================================================= */

function renderDocuments() {

    const grid =
        document.getElementById(
            "documentGrid"
        );


    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .trim()
            .toLowerCase();


    let results =
        documentsList.slice();


    /* =========================
       MÓDULO
    ========================= */

    if (currentModule) {

        results =
            results.filter(
                function (item) {

                    return (
                        item.module ===
                        currentModule
                    );

                }
            );

    }


    /* =========================
       BUSCADOR
    ========================= */

    if (search) {

        results =
            results.filter(
                function (item) {

                    const text = `

                        ${item.title || ""}

                        ${item.module || ""}

                        ${item.topic || ""}

                        ${item.type || ""}

                    `
                        .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    /* =========================
       FAVORITOS
    ========================= */

    if (
        currentFilter ===
        "favorite"
    ) {

        results =
            results.filter(
                function (item) {

                    return (
                        item.favorite === true
                    );

                }
            );

    }


    /* =========================
       PENDIENTES
    ========================= */

    if (
        currentFilter ===
        "pending"
    ) {

        results =
            results.filter(
                function (item) {

                    return (
                        item.completed !== true
                    );

                }
            );

    }


    /* =========================
       COMPLETADOS
    ========================= */

    if (
        currentFilter ===
        "completed"
    ) {

        results =
            results.filter(
                function (item) {

                    return (
                        item.completed === true
                    );

                }
            );

    }


    /* =========================
       VACÍO
    ========================= */

    if (
        results.length === 0
    ) {

        grid.innerHTML =
            `
            <div class="empty">
                No hay documentos para mostrar.
            </div>
            `;

        return;

    }


    grid.innerHTML = "";


    results.forEach(
        function (item) {

            const card =
                createDocumentCard(
                    item
                );


            grid.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   CREAR TARJETA
========================================================= */

function createDocumentCard(item) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "document-card";


    const favorite =
        item.favorite === true;


    const completed =
        item.completed === true;


    card.innerHTML = `

        <div class="document-top">

            <span class="document-type">

                ${escapeHTML(
                    item.type ||
                    "Archivo"
                )}

            </span>


            <button
                type="button"
                class="favorite-button"
            >

                ${favorite
                    ? "★"
                    : "☆"
                }

            </button>

        </div>


        <div class="document-icon">

            ${getFileIcon(
                item.path ||
                item.url ||
                ""
            )}

        </div>


        <h3>

            ${escapeHTML(
                item.title ||
                "Sin título"
            )}

        </h3>


        <p class="document-info">

            ${escapeHTML(
                item.module ||
                ""
            )}

            <br>

            ${escapeHTML(
                item.topic ||
                "Sin tema"
            )}

        </p>


        <div class="document-status">

            ${completed
                ? "Completado"
                : "Pendiente"
            }

        </div>


        <div class="document-actions">

            <button
                type="button"
                class="open-document"
            >
                Abrir
            </button>


            <button
                type="button"
                class="complete-document"
            >

                ${completed
                    ? "Marcar pendiente"
                    : "Completar"
                }

            </button>

        </div>


        <button
            type="button"
            class="delete-document"
        >
            Eliminar
        </button>

    `;


    /* FAVORITO */

    card
        .querySelector(
            ".favorite-button"
        )
        .addEventListener(
            "click",
            function () {

                toggleFavorite(
                    item
                );

            }
        );


    /* ABRIR */

    card
        .querySelector(
            ".open-document"
        )
        .addEventListener(
            "click",
            function () {

                openDocument(
                    item
                );

            }
        );


    /* COMPLETADO */

    card
        .querySelector(
            ".complete-document"
        )
        .addEventListener(
            "click",
            function () {

                toggleCompleted(
                    item
                );

            }
        );


    /* ELIMINAR */

    card
        .querySelector(
            ".delete-document"
        )
        .addEventListener(
            "click",
            function () {

                deleteDocument(
                    item
                );

            }
        );


    return card;

}


/* =========================================================
   SUBIR CUALQUIER ARCHIVO
========================================================= */

async function uploadDocument() {

    const title =
        document
            .getElementById(
                "title"
            )
            .value
            .trim();


    const moduleName =
        document
            .getElementById(
                "uploadModule"
            )
            .value;


    const topic =
        document
            .getElementById(
                "topic"
            )
            .value
            .trim();


    const type =
        document
            .getElementById(
                "type"
            )
            .value;


    const fileInput =
        document.getElementById(
            "file"
        );


    const file =
        fileInput.files[0];


    const status =
        document.getElementById(
            "uploadStatus"
        );


    const button =
        document.getElementById(
            "uploadButton"
        );


    status.textContent = "";


    if (!title) {

        status.textContent =
            "Escribe un título.";

        return;

    }


    if (!moduleName) {

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


    button.disabled = true;

    button.textContent =
        "Subiendo...";


    try {

        /*
         * CREAMOS RUTA SEGURA
         */

        const moduleFolder =
            cleanPathPart(
                moduleName
            );


        const topicFolder =
            cleanPathPart(
                topic
            );


        const safeFileName =
            cleanFileName(
                file.name
            );


        const uniqueName =
            Date.now() +
            "_" +
            safeFileName;


        /*
         * MUY IMPORTANTE:
         *
         * Nada de "/" al principio.
         */

        const storagePath =
            moduleFolder +
            "/" +
            topicFolder +
            "/" +
            uniqueName;


        console.log(
            "Subiendo a:",
            STORAGE_BUCKET
        );


        console.log(
            "Ruta:",
            storagePath
        );


        /*
         * SUBIR ARCHIVO
         */

        const {
            data: uploadData,
            error: uploadError
        } =
            await supabaseClient
                .storage
                .from(
                    STORAGE_BUCKET
                )
                .upload(
                    storagePath,
                    file,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            file.type ||
                            "application/octet-stream"
                    }
                );


        if (uploadError) {

            throw uploadError;

        }


        /*
         * URL PÚBLICA
         */

        const {
            data: urlData
        } =
            supabaseClient
                .storage
                .from(
                    STORAGE_BUCKET
                )
                .getPublicUrl(
                    storagePath
                );


        const publicUrl =
            urlData.publicUrl;


        /*
         * GUARDAR EN TABLA FILES
         */

        const {
            error: databaseError
        } =
            await supabaseClient
                .from("files")
                .insert({

                    title:
                        title,

                    module:
                        moduleName,

                    topic:
                        topic,

                    type:
                        type,

                    url:
                        publicUrl,

                    path:
                        storagePath,

                    favorite:
                        false,

                    completed:
                        false

                });


        if (databaseError) {

            /*
             * Si falla la BD,
             * borramos el archivo
             * que acabamos de subir.
             */

            await supabaseClient
                .storage
                .from(
                    STORAGE_BUCKET
                )
                .remove([
                    storagePath
                ]);


            throw databaseError;

        }


        status.textContent =
            "Archivo subido correctamente.";


        document
            .getElementById(
                "uploadForm"
            )
            .reset();


        await loadDocuments();


        setTimeout(
            function () {

                closeModal();

                status.textContent =
                    "";

            },
            700
        );


    } catch (error) {

        console.error(
            "ERROR SUBIDA:",
            error
        );


        status.textContent =
            "Error: " +
            (
                error.message ||
                "No se pudo subir el archivo."
            );

    } finally {

        button.disabled =
            false;


        button.textContent =
            "Subir a DAMFLIX";

    }

}


/* =========================================================
   ABRIR ARCHIVO
========================================================= */

function openDocument(item) {

    if (!item.url) {

        alert(
            "No se encontró el archivo."
        );

        return;

    }


    window.open(
        item.url,
        "_blank"
    );

}


/* =========================================================
   FAVORITOS
========================================================= */

async function toggleFavorite(item) {

    const newValue =
        item.favorite !== true;


    const {
        error
    } =
        await supabaseClient
            .from("files")
            .update({

                favorite:
                    newValue

            })
            .eq(
                "id",
                item.id
            );


    if (error) {

        console.error(
            error
        );

        alert(
            "No se pudo cambiar el favorito."
        );

        return;

    }


    item.favorite =
        newValue;


    renderDocuments();

}


/* =========================================================
   COMPLETADO
========================================================= */

async function toggleCompleted(item) {

    const newValue =
        item.completed !== true;


    const {
        error
    } =
        await supabaseClient
            .from("files")
            .update({

                completed:
                    newValue

            })
            .eq(
                "id",
                item.id
            );


    if (error) {

        console.error(
            error
        );

        alert(
            "No se pudo cambiar el estado."
        );

        return;

    }


    item.completed =
        newValue;


    renderDocuments();

}


/* =========================================================
   ELIMINAR DOCUMENTO
========================================================= */

async function deleteDocument(item) {

    const confirmation =
        confirm(
            "¿Seguro que quieres eliminar \"" +
            item.title +
            "\"?"
        );


    if (!confirmation) {

        return;

    }


    try {

        /*
         * BORRAR STORAGE
         */

        if (item.path) {

            const {
                error: storageError
            } =
                await supabaseClient
                    .storage
                    .from(
                        STORAGE_BUCKET
                    )
                    .remove([
                        item.path
                    ]);


            if (storageError) {

                console.error(
                    storageError
                );

            }

        }


        /*
         * BORRAR TABLA
         */

        const {
            error: databaseError
        } =
            await supabaseClient
                .from("files")
                .delete()
                .eq(
                    "id",
                    item.id
                );


        if (databaseError) {

            throw databaseError;

        }


        await loadDocuments();


    } catch (error) {

        console.error(
            error
        );


        alert(
            "No se pudo eliminar el documento."
        );

    }

}


/* =========================================================
   LIMPIAR CARPETAS
========================================================= */

function cleanPathPart(text) {

    let result =
        text
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
                /_+/g,
                "_"
            )
            .replace(
                /^_+|_+$/g,
                ""
            );


    if (!result) {

        result =
            "sin_nombre";

    }


    return result;

}


/* =========================================================
   LIMPIAR NOMBRE ARCHIVO
========================================================= */

function cleanFileName(fileName) {

    /*
     * Separamos nombre y extensión
     */

    const lastDot =
        fileName.lastIndexOf(".");


    let name =
        fileName;


    let extension =
        "";


    if (
        lastDot > 0
    ) {

        name =
            fileName.substring(
                0,
                lastDot
            );


        extension =
            fileName.substring(
                lastDot + 1
            );

    }


    name =
        name
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
                /_+/g,
                "_"
            )
            .replace(
                /^_+|_+$/g,
                ""
            );


    extension =
        extension
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .toLowerCase();


    if (!name) {

        name =
            "archivo";

    }


    if (extension) {

        return (
            name +
            "." +
            extension
        );

    }


    return name;

}


/* =========================================================
   ICONOS SEGÚN ARCHIVO
========================================================= */

function getFileIcon(path) {

    const cleanPath =
        path
            .split("?")[0];


    const parts =
        cleanPath.split(".");


    let extension = "";


    if (
        parts.length > 1
    ) {

        extension =
            parts
                .pop()
                .toLowerCase();

    }


    if (
        extension === "pdf"
    ) {

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
        extension === "xlsx" ||
        extension === "csv"
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
        extension === "png" ||
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "gif" ||
        extension === "webp" ||
        extension === "svg"
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
        extension === "java" ||
        extension === "js" ||
        extension === "html" ||
        extension === "css" ||
        extension === "php" ||
        extension === "py" ||
        extension === "c" ||
        extension === "cpp" ||
        extension === "sql" ||
        extension === "xml" ||
        extension === "json"
    ) {

        return "💻";

    }


    if (
        extension === "mp3" ||
        extension === "wav" ||
        extension === "ogg"
    ) {

        return "🎵";

    }


    if (
        extension === "mp4" ||
        extension === "mov" ||
        extension === "avi" ||
        extension === "mkv"
    ) {

        return "🎬";

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
   EVITAR HTML EN LOS TÍTULOS
========================================================= */

function escapeHTML(text) {

    const element =
        document.createElement(
            "div"
        );


    element.textContent =
        String(text);


    return element.innerHTML;

}

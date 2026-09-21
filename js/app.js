const SUPABASE_URL = "https://sriifbloyfivdyfisixn.supabase.co";
const SUPABASE_KEY = "sb_publishable_l26P02t68OP-dPzfgQcxeg_9xrc7aJT";
const STORAGE_BUCKET = "files";

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

let supabaseClient = null;
let documentsList = [];
let currentModule = "";
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", function () {

    createModules();

    setupEvents();

    setupHtmlViewer();

    try {

        if (
            window.supabase &&
            typeof window.supabase.createClient === "function"
        ) {

            supabaseClient =
                window.supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_KEY
                );

            loadDocuments();

        } else {

            showSupabaseError(
                "No se ha podido cargar Supabase."
            );

        }

    } catch (error) {

        console.error(
            "Error iniciando Supabase:",
            error
        );

        showSupabaseError(
            "Error al conectar con Supabase."
        );

    }

});

function createModules() {

    const moduleRow =
        document.getElementById("moduleRow");

    const moduleFilter =
        document.getElementById("moduleFilter");

    const uploadModule =
        document.getElementById("uploadModule");

    if (!moduleRow || !moduleFilter || !uploadModule) {

        console.error(
            "No se encontraron los elementos de módulos."
        );

        return;
    }

    moduleRow.innerHTML = "";

    modules.forEach(function (module) {

        const card =
            document.createElement("div");

        card.className = "module-card";

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

        moduleRow.appendChild(card);

        const filterOption =
            document.createElement("option");

        filterOption.value =
            module.name;

        filterOption.textContent =
            module.name;

        moduleFilter.appendChild(
            filterOption
        );

        const uploadOption =
            document.createElement("option");

        uploadOption.value =
            module.name;

        uploadOption.textContent =
            module.name;

        uploadModule.appendChild(
            uploadOption
        );

    });
}

function setupEvents() {

    const openUpload =
        document.getElementById(
            "openUpload"
        );

    const closeUpload =
        document.getElementById(
            "closeUpload"
        );

    const uploadModal =
        document.getElementById(
            "uploadModal"
        );

    const uploadForm =
        document.getElementById(
            "uploadForm"
        );

    const moduleFilter =
        document.getElementById(
            "moduleFilter"
        );

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    if (openUpload) {

        openUpload.addEventListener(
            "click",
            function () {

                uploadModal.classList.add(
                    "show"
                );

            }
        );

    }

    if (closeUpload) {

        closeUpload.addEventListener(
            "click",
            closeModal
        );

    }

    if (uploadModal) {

        uploadModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    uploadModal
                ) {

                    closeModal();

                }

            }
        );

    }

    if (uploadForm) {

        uploadForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                uploadDocument();

            }
        );

    }

    if (moduleFilter) {

        moduleFilter.addEventListener(
            "change",
            function () {

                selectModule(
                    this.value
                );

            }
        );

    }

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderDocuments
        );

    }

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

function selectModule(moduleName) {

    currentModule =
        moduleName;

    const moduleFilter =
        document.getElementById(
            "moduleFilter"
        );

    if (moduleFilter) {

        moduleFilter.value =
            moduleName;

    }

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

    if (subtitle) {

        if (moduleName) {

            subtitle.textContent =
                moduleName;

        } else {

            subtitle.textContent =
                "Todos tus documentos";

        }

    }

    renderDocuments();
}

function closeModal() {

    const modal =
        document.getElementById(
            "uploadModal"
        );

    if (modal) {

        modal.classList.remove(
            "show"
        );

    }
}

async function loadDocuments() {

    const grid =
        document.getElementById(
            "documentGrid"
        );

    if (!supabaseClient) {

        showSupabaseError(
            "Supabase no está conectado."
        );

        return;
    }

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
            "Error cargando documentos:",
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

function showSupabaseError(message) {

    const grid =
        document.getElementById(
            "documentGrid"
        );

    if (grid) {

        grid.innerHTML =
            `
            <div class="empty">
                ${escapeHTML(message)}
            </div>
            `;

    }
}

function renderDocuments() {

    const grid =
        document.getElementById(
            "documentGrid"
        );

    if (!grid) {
        return;
    }

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";

    let results =
        documentsList.slice();

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

    if (search) {

        results =
            results.filter(
                function (item) {

                    const text = `
                        ${item.title || ""}
                        ${item.name || ""}
                        ${item.module || ""}
                        ${item.topic || ""}
                        ${item.type || ""}
                    `.toLowerCase();

                    return text.includes(
                        search
                    );

                }
            );

    }

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

            grid.appendChild(
                createDocumentCard(item)
            );

        }
    );
}

function createDocumentCard(item) {

    const card =
        document.createElement("div");

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
                ${favorite ? "★" : "☆"}
            </button>

        </div>

        <div class="document-icon">
            ${getFileIcon(
                item.path ||
                item.url ||
                item.name ||
                ""
            )}
        </div>

        <h3>
            ${escapeHTML(
                item.title ||
                item.name ||
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

    card
        .querySelector(
            ".favorite-button"
        )
        .addEventListener(
            "click",
            function () {

                toggleFavorite(item);

            }
        );

    card
        .querySelector(
            ".open-document"
        )
        .addEventListener(
            "click",
            function () {

                openDocument(item);

            }
        );

    card
        .querySelector(
            ".complete-document"
        )
        .addEventListener(
            "click",
            function () {

                toggleCompleted(item);

            }
        );

    card
        .querySelector(
            ".delete-document"
        )
        .addEventListener(
            "click",
            function () {

                deleteDocument(item);

            }
        );

    return card;
}

async function uploadDocument() {

    if (!supabaseClient) {

        alert(
            "Supabase no está conectado."
        );

        return;
    }

    const title =
        document
            .getElementById("title")
            .value
            .trim();

    const moduleName =
        document
            .getElementById("uploadModule")
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

    const fileInput =
        document.getElementById("file");

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

        const storagePath =
            moduleFolder +
            "/" +
            topicFolder +
            "/" +
            uniqueName;

        const {
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

        const {
            error: databaseError
        } =
            await supabaseClient
                .from("files")
                .insert({

                    name:
                        file.name,

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

                status.textContent = "";

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

        button.disabled = false;

        button.textContent =
            "Subir a DAMFLIX";

    }
}

function isHtmlFile(item) {

    const source =
        (item.path || item.name || item.url || "")
            .split("?")[0]
            .toLowerCase();

    return (
        source.endsWith(".html") ||
        source.endsWith(".htm")
    );
}

function openDocument(item) {

    if (!item.url) {

        alert(
            "No se encontró el archivo."
        );

        return;
    }

    // Supabase sirve los .html como texto plano,
    // así que los renderizamos nosotros en un visor.
    if (isHtmlFile(item)) {

        openHtmlViewer(item);

        return;
    }

    window.open(
        item.url,
        "_blank"
    );
}

let currentHtmlBlobUrl = null;

async function fetchHtmlAsText(item) {

    const response =
        await fetch(item.url);

    if (!response.ok) {

        throw new Error(
            "HTTP " + response.status
        );

    }

    return await response.text();
}

// Hace que las rutas relativas (css, imágenes, js)
// apunten a la carpeta del archivo en Supabase.
function addBaseTag(html, fileUrl) {

    const baseHref =
        fileUrl.substring(
            0,
            fileUrl.lastIndexOf("/") + 1
        );

    const baseTag =
        '<base href="' + baseHref + '">';

    if (/<head[^>]*>/i.test(html)) {

        return html.replace(
            /<head[^>]*>/i,
            function (match) {

                return match + baseTag;

            }
        );

    }

    return baseTag + html;
}

async function openHtmlViewer(item) {

    const viewer =
        document.getElementById("htmlViewer");

    const frame =
        document.getElementById("htmlViewerFrame");

    const title =
        document.getElementById("htmlViewerTitle");

    if (!viewer || !frame) {
        return;
    }

    title.textContent =
        item.title ||
        item.name ||
        "Documento";

    frame.srcdoc =
        "<p style='font-family:Arial;padding:20px'>" +
        "Cargando...</p>";

    viewer.classList.add("show");

    document.body.style.overflow = "hidden";

    try {

        const html =
            await fetchHtmlAsText(item);

        const finalHtml =
            addBaseTag(html, item.url);

        // Guardamos una versión Blob por si quiere
        // abrirla en una pestaña nueva.
        if (currentHtmlBlobUrl) {

            URL.revokeObjectURL(
                currentHtmlBlobUrl
            );

        }

        currentHtmlBlobUrl =
            URL.createObjectURL(
                new Blob(
                    [finalHtml],
                    { type: "text/html" }
                )
            );

        frame.srcdoc = finalHtml;

    } catch (error) {

        console.error(
            "Error abriendo HTML:",
            error
        );

        frame.srcdoc =
            "<p style='font-family:Arial;padding:20px'>" +
            "No se pudo cargar el archivo.</p>";

    }
}

function closeHtmlViewer() {

    const viewer =
        document.getElementById("htmlViewer");

    const frame =
        document.getElementById("htmlViewerFrame");

    if (viewer) {
        viewer.classList.remove("show");
    }

    if (frame) {
        frame.srcdoc = "";
    }

    document.body.style.overflow = "";
}

function setupHtmlViewer() {

    const closeButton =
        document.getElementById("closeHtmlViewer");

    const newTabButton =
        document.getElementById("htmlViewerNewTab");

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeHtmlViewer
        );

    }

    if (newTabButton) {

        newTabButton.addEventListener(
            "click",
            function () {

                if (currentHtmlBlobUrl) {

                    window.open(
                        currentHtmlBlobUrl,
                        "_blank"
                    );

                }

            }
        );

    }

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeHtmlViewer();

            }

        }
    );
}

async function toggleFavorite(item) {

    if (!supabaseClient) {
        return;
    }

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

        console.error(error);

        alert(
            "No se pudo cambiar el favorito."
        );

        return;
    }

    item.favorite =
        newValue;

    renderDocuments();
}

async function toggleCompleted(item) {

    if (!supabaseClient) {
        return;
    }

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

        console.error(error);

        alert(
            "No se pudo cambiar el estado."
        );

        return;
    }

    item.completed =
        newValue;

    renderDocuments();
}

async function deleteDocument(item) {

    if (!supabaseClient) {
        return;
    }

    const confirmation =
        confirm(
            "¿Seguro que quieres eliminar \"" +
            (
                item.title ||
                item.name ||
                "este archivo"
            ) +
            "\"?"
        );

    if (!confirmation) {
        return;
    }

    try {

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

function cleanFileName(fileName) {

    const lastDot =
        fileName.lastIndexOf(".");

    let name =
        fileName;

    let extension =
        "";

    if (lastDot > 0) {

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

function getFileIcon(path) {

    const cleanPath =
        path.split("?")[0];

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

function escapeHTML(text) {

    const element =
        document.createElement("div");

    element.textContent =
        String(text);

    return element.innerHTML;
}

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

// ---------------------------------------------
// USUARIOS Y COLABORACIÓN
// ---------------------------------------------
let currentUser = null;       // { id, email }
let currentProfile = null;    // fila de "profiles"
let currentScope = "mine";    // "mine" | "shared"
let sharesWithMe = [];        // comparticiones que otros me han hecho
let appInitialized = false;   // evita inicializar la UI de la app dos veces

document.addEventListener("DOMContentLoaded", function () {

    setupHtmlViewer();

    setupAuthEvents();

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

            initAuth();

        } else {

            showAuthStatus(
                "loginStatus",
                "No se ha podido cargar Supabase."
            );

        }

    } catch (error) {

        console.error(
            "Error iniciando Supabase:",
            error
        );

        showAuthStatus(
            "loginStatus",
            "Error al conectar con Supabase."
        );

    }

});

// ---------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------

async function initAuth() {

    // Si el enlace de recuperación de contraseña nos trae aquí,
    // Supabase deja la sesión en modo "recovery": mostramos el
    // formulario de nueva contraseña.
    if (window.location.hash.includes("type=recovery")) {

        showAuthForm("updatePasswordForm");

    }

    supabaseClient.auth.onAuthStateChange(
        function (event, session) {

            if (event === "PASSWORD_RECOVERY") {

                showAuthForm("updatePasswordForm");
                return;
            }

            if (session && session.user) {

                onLogin(session.user);

            } else {

                onLogout();

            }

        }
    );

    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (session && session.user) {

        onLogin(session.user);

    } else {

        onLogout();

    }
}

async function onLogin(user) {

    currentUser = {
        id: user.id,
        email: user.email
    };

    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    await loadOwnProfile();

    if (!appInitialized) {

        appInitialized = true;

        createModules();
        setupEvents();
        setupUserMenu();
        setupScopeTabs();
        setupShareModal();

    }

    await refreshEverything();
}

function onLogout() {

    currentUser = null;
    currentProfile = null;

    document.getElementById("app").classList.add("hidden");
    document.getElementById("authScreen").classList.remove("hidden");

    showAuthForm("loginForm");
}

async function loadOwnProfile() {

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {

        console.error("Error leyendo el perfil:", error);
        return;
    }

    currentProfile = data;

    const initial =
        document.getElementById("userInitial");

    const nameEl =
        document.getElementById("userMenuName");

    const emailEl =
        document.getElementById("userMenuEmail");

    const nameInput =
        document.getElementById("userMenuDisplayName");

    const displayName =
        (currentProfile && currentProfile.display_name) ||
        currentUser.email;

    if (initial) {
        initial.textContent = displayName.charAt(0).toUpperCase();
    }

    if (nameEl) {
        nameEl.textContent = displayName;
    }

    if (emailEl) {
        emailEl.textContent = currentUser.email;
    }

    if (nameInput) {
        nameInput.value = displayName;
    }
}

async function refreshEverything() {

    await loadShares();
    await loadDocuments();
}

function showAuthStatus(elementId, message) {

    const el = document.getElementById(elementId);

    if (el) {
        el.textContent = message || "";
    }
}

function showAuthForm(formId) {

    [
        "loginForm",
        "registerForm",
        "forgotForm",
        "updatePasswordForm"
    ].forEach(function (id) {

        const form = document.getElementById(id);

        if (form) {

            if (id === formId) {
                form.classList.remove("hidden");
            } else {
                form.classList.add("hidden");
            }

        }

    });
}

function setupAuthEvents() {

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const forgotForm = document.getElementById("forgotForm");
    const updatePasswordForm = document.getElementById("updatePasswordForm");

    const showRegister = document.getElementById("showRegister");
    const showForgot = document.getElementById("showForgot");
    const showLoginFromRegister = document.getElementById("showLoginFromRegister");
    const showLoginFromForgot = document.getElementById("showLoginFromForgot");

    if (showRegister) {
        showRegister.addEventListener("click", function (e) {
            e.preventDefault();
            showAuthForm("registerForm");
        });
    }

    if (showForgot) {
        showForgot.addEventListener("click", function (e) {
            e.preventDefault();
            showAuthForm("forgotForm");
        });
    }

    if (showLoginFromRegister) {
        showLoginFromRegister.addEventListener("click", function (e) {
            e.preventDefault();
            showAuthForm("loginForm");
        });
    }

    if (showLoginFromForgot) {
        showLoginFromForgot.addEventListener("click", function (e) {
            e.preventDefault();
            showAuthForm("loginForm");
        });
    }

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            showAuthStatus("loginStatus", "Entrando...");

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;

            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) {

                showAuthStatus("loginStatus", traducirErrorAuth(error));
                return;
            }

            showAuthStatus("loginStatus", "");

        });

    }

    if (registerForm) {

        registerForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            showAuthStatus("registerStatus", "Creando cuenta...");

            const name = document.getElementById("registerName").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const password = document.getElementById("registerPassword").value;

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { display_name: name }
                    }
                });

            if (error) {

                showAuthStatus("registerStatus", traducirErrorAuth(error));
                return;
            }

            if (data && data.session) {

                showAuthStatus("registerStatus", "");

            } else {

                showAuthStatus(
                    "registerStatus",
                    "Cuenta creada. Revisa tu email para confirmarla."
                );

            }

        });

    }

    if (forgotForm) {

        forgotForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            showAuthStatus("forgotStatus", "Enviando...");

            const email = document.getElementById("forgotEmail").value.trim();

            const { error } =
                await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname
                });

            if (error) {

                showAuthStatus("forgotStatus", traducirErrorAuth(error));
                return;
            }

            showAuthStatus(
                "forgotStatus",
                "Si el email existe, te hemos enviado un enlace."
            );

        });

    }

    if (updatePasswordForm) {

        updatePasswordForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            showAuthStatus("updatePasswordStatus", "Guardando...");

            const newPassword =
                document.getElementById("newPassword").value;

            const { error } =
                await supabaseClient.auth.updateUser({
                    password: newPassword
                });

            if (error) {

                showAuthStatus("updatePasswordStatus", traducirErrorAuth(error));
                return;
            }

            showAuthStatus(
                "updatePasswordStatus",
                "Contraseña actualizada. Ya puedes usarla."
            );

            showAuthForm("loginForm");

        });

    }

}

function traducirErrorAuth(error) {

    const message = (error && error.message) || "";

    if (message.includes("Invalid login credentials")) {
        return "Email o contraseña incorrectos.";
    }

    if (message.includes("already registered")) {
        return "Ese email ya tiene una cuenta.";
    }

    if (message.includes("Password should be")) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }

    return message || "Ha ocurrido un error.";
}

function setupUserMenu() {

    const button = document.getElementById("userMenuButton");
    const dropdown = document.getElementById("userMenuDropdown");
    const logoutButton = document.getElementById("logoutButton");
    const saveNameButton = document.getElementById("saveDisplayName");

    if (button && dropdown) {

        button.addEventListener("click", function () {
            dropdown.classList.toggle("show");
        });

        document.addEventListener("click", function (event) {

            if (
                !dropdown.contains(event.target) &&
                !button.contains(event.target)
            ) {
                dropdown.classList.remove("show");
            }

        });

    }

    if (logoutButton) {

        logoutButton.addEventListener("click", async function () {
            await supabaseClient.auth.signOut();
        });

    }

    if (saveNameButton) {

        saveNameButton.addEventListener("click", async function () {

            const newName =
                document.getElementById("userMenuDisplayName").value.trim();

            if (!newName) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("profiles")
                    .update({ display_name: newName })
                    .eq("id", currentUser.id);

            if (error) {

                console.error(error);
                alert("No se pudo guardar el nombre.");
                return;
            }

            await loadOwnProfile();

        });

    }

}

// ---------------------------------------------
// PESTAÑAS "MI CONTENIDO" / "COMPARTIDO CONMIGO"
// ---------------------------------------------

function setupScopeTabs() {

    document.querySelectorAll(".scope-tab").forEach(function (tab) {

        tab.addEventListener("click", function () {

            document.querySelectorAll(".scope-tab").forEach(function (t) {
                t.classList.remove("active");
            });

            tab.classList.add("active");

            currentScope = tab.dataset.scope;

            renderDocuments();
            updateModuleProgress();

        });

    });

}

// ---------------------------------------------
// COMPARTICIONES (SHARES)
// ---------------------------------------------

async function loadShares() {

    const { data, error } =
        await supabaseClient
            .from("shares")
            .select("*")
            .eq("shared_with_id", currentUser.id);

    if (error) {

        console.error("Error leyendo comparticiones:", error);
        sharesWithMe = [];
        return;
    }

    sharesWithMe = data || [];
}

// Calcula el permiso efectivo del usuario actual sobre un archivo:
// "propietario" | "editor" | "lector"
function getPermissionForItem(item) {

    if (item.owner_id === currentUser.id) {
        return "propietario";
    }

    let best = null;

    sharesWithMe.forEach(function (share) {

        if (share.owner_id !== item.owner_id) {
            return;
        }

        const matches =
            (share.scope === "file" && share.file_id === item.id) ||
            (share.scope === "topic" && share.module === item.module && share.topic === item.topic) ||
            (share.scope === "module" && share.module === item.module);

        if (!matches) {
            return;
        }

        if (share.permission === "editor") {
            best = "editor";
        } else if (best !== "editor") {
            best = "lector";
        }

    });

    return best || null;
}

let shareTarget = null; // { scope: 'module'|'topic'|'file', module, topic, file }

function openShareModal(target) {

    shareTarget = target;

    const label = document.getElementById("shareTargetLabel");
    const choiceBox = document.getElementById("shareScopeChoice");

    let title = "";

    if (target.scope === "module") {
        title = "Compartir el módulo \"" + target.module + "\"";
    } else if (target.scope === "topic") {
        title = "Compartir el tema \"" + target.topic + "\" (" + target.module + ")";
    } else {
        title = "Compartir \"" + (target.file.title || target.file.name) + "\"";
    }

    if (label) {
        label.textContent = title;
    }

    if (choiceBox) {

        let helpText = "";

        if (target.scope === "module") {
            helpText = "La persona verá todos los temas y archivos de este módulo.";
        } else if (target.scope === "topic") {
            helpText = "La persona verá todos los archivos de este tema.";
        } else {
            helpText = "La persona solo verá este archivo.";
        }

        choiceBox.textContent = helpText;
    }

    document.getElementById("shareEmail").value = "";
    document.getElementById("sharePermission").value = "lector";
    document.getElementById("shareStatus").textContent = "";

    document.getElementById("shareModal").classList.add("show");

    loadSharesForTarget();
}

function closeShareModal() {

    document.getElementById("shareModal").classList.remove("show");
    shareTarget = null;
}

async function loadSharesForTarget() {

    const list = document.getElementById("shareList");

    if (!list || !shareTarget) {
        return;
    }

    list.innerHTML = "Cargando...";

    let query =
        supabaseClient
            .from("shares")
            .select("*")
            .eq("owner_id", currentUser.id)
            .eq("scope", shareTarget.scope);

    if (shareTarget.scope === "module") {

        query = query.eq("module", shareTarget.module);

    } else if (shareTarget.scope === "topic") {

        query = query
            .eq("module", shareTarget.module)
            .eq("topic", shareTarget.topic);

    } else {

        query = query.eq("file_id", shareTarget.file.id);
    }

    const { data, error } = await query;

    if (error) {

        console.error(error);
        list.innerHTML = "No se pudieron cargar las comparticiones.";
        return;
    }

    if (!data || data.length === 0) {

        list.innerHTML =
            '<p class="file-help">Todavía no has compartido esto con nadie.</p>';

        return;
    }

    const profileIds = data.map(function (s) { return s.shared_with_id; });

    const { data: profiles } =
        await supabaseClient
            .from("profiles")
            .select("id, email, display_name")
            .in("id", profileIds);

    const profilesById = {};

    (profiles || []).forEach(function (p) {
        profilesById[p.id] = p;
    });

    list.innerHTML = "";

    data.forEach(function (share) {

        const profile = profilesById[share.shared_with_id];

        const row = document.createElement("div");
        row.className = "share-row";

        row.innerHTML = `
            <span class="share-row-info">
                ${escapeHTML(
                    (profile && (profile.display_name || profile.email)) ||
                    "Usuario"
                )}
            </span>

            <select class="share-row-permission">
                <option value="lector" ${share.permission === "lector" ? "selected" : ""}>Lector</option>
                <option value="editor" ${share.permission === "editor" ? "selected" : ""}>Editor</option>
            </select>

            <button type="button" class="share-row-remove">Quitar</button>
        `;

        row.querySelector(".share-row-permission").addEventListener(
            "change",
            async function () {

                const { error: updateError } =
                    await supabaseClient
                        .from("shares")
                        .update({ permission: this.value })
                        .eq("id", share.id);

                if (updateError) {

                    console.error(updateError);
                    alert("No se pudo cambiar el permiso.");

                }

            }
        );

        row.querySelector(".share-row-remove").addEventListener(
            "click",
            async function () {

                const { error: deleteError } =
                    await supabaseClient
                        .from("shares")
                        .delete()
                        .eq("id", share.id);

                if (deleteError) {

                    console.error(deleteError);
                    alert("No se pudo quitar el acceso.");
                    return;
                }

                loadSharesForTarget();

            }
        );

        list.appendChild(row);

    });

}

function setupShareModal() {

    const closeButton = document.getElementById("closeShare");
    const modal = document.getElementById("shareModal");
    const form = document.getElementById("shareForm");

    if (closeButton) {

        closeButton.addEventListener("click", closeShareModal);
    }

    if (modal) {

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {
                closeShareModal();
            }

        });

    }

    if (form) {

        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            if (!shareTarget) {
                return;
            }

            const email =
                document.getElementById("shareEmail").value.trim();

            const permission =
                document.getElementById("sharePermission").value;

            const status =
                document.getElementById("shareStatus");

            status.textContent = "Buscando usuario...";

            const { data: profile, error: profileError } =
                await supabaseClient
                    .from("profiles")
                    .select("id, email")
                    .ilike("email", email)
                    .maybeSingle();

            if (profileError || !profile) {

                status.textContent =
                    "No hay ningún usuario registrado con ese email.";
                return;
            }

            if (profile.id === currentUser.id) {

                status.textContent =
                    "No puedes compartir contigo mismo.";
                return;
            }

            const payload = {
                owner_id: currentUser.id,
                shared_with_id: profile.id,
                scope: shareTarget.scope,
                permission: permission,
                module: shareTarget.scope !== "file" ? shareTarget.module : null,
                topic: shareTarget.scope === "topic" ? shareTarget.topic : null,
                file_id: shareTarget.scope === "file" ? shareTarget.file.id : null
            };

            const { error: insertError } =
                await supabaseClient
                    .from("shares")
                    .upsert(payload, {
                        onConflict: "owner_id,shared_with_id,scope,module,topic,file_id"
                    });

            if (insertError) {

                console.error(insertError);
                status.textContent = "No se pudo compartir: " + insertError.message;
                return;
            }

            status.textContent = "Compartido correctamente.";

            document.getElementById("shareEmail").value = "";

            loadSharesForTarget();

        });

    }

}

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
            <button type="button" class="module-share-button" title="Compartir módulo">
                👥
            </button>

            <div class="module-icon">
                ${module.icon}
            </div>

            <h3>
                ${escapeHTML(module.name)}
            </h3>

            <div class="module-progress">

                <div class="module-progress-bar">

                    <div class="module-progress-fill"></div>

                </div>

                <span class="module-progress-text">
                    Sin documentos
                </span>

            </div>
        `;

        card.addEventListener(
            "click",
            function () {

                selectModule(
                    module.name
                );

            }
        );

        card.querySelector(".module-share-button").addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                openShareModal({
                    scope: "module",
                    module: module.name
                });

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

// Documentos visibles según la pestaña activa
// ("mine" = solo los míos, "shared" = solo los compartidos conmigo)
function getScopedDocuments() {

    return documentsList.filter(function (item) {

        const isMine = item.owner_id === currentUser.id;

        return currentScope === "mine" ? isMine : !isMine;

    });
}

function updateModuleProgress() {

    const scoped = getScopedDocuments();

    document
        .querySelectorAll(".module-card")
        .forEach(function (card) {

            const moduleName =
                card.dataset.module;

            const docs =
                scoped.filter(
                    function (item) {

                        return (
                            item.module ===
                            moduleName
                        );

                    }
                );

            const fill =
                card.querySelector(
                    ".module-progress-fill"
                );

            const text =
                card.querySelector(
                    ".module-progress-text"
                );

            if (!fill || !text) {
                return;
            }

            if (docs.length === 0) {

                fill.style.width = "0%";

                text.textContent =
                    "Sin documentos";

                return;
            }

            const completedCount =
                docs.filter(
                    function (item) {

                        return (
                            item.completed === true
                        );

                    }
                ).length;

            const percent =
                Math.round(
                    (completedCount / docs.length) * 100
                );

            fill.style.width =
                percent + "%";

            text.textContent =
                completedCount +
                " / " +
                docs.length +
                " completados";

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

                uploadDocuments();

            }
        );

    }

    setupDropZone();

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

    pendingFiles = [];

    renderFileList();
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

        updateModuleProgress();

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
        getScopedDocuments();

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

    const permission =
        getPermissionForItem(item);

    const isOwner =
        permission === "propietario";

    const canEdit =
        permission === "propietario" ||
        permission === "editor";

    card.innerHTML = `
        <span class="ownership-badge" title="${isOwner ? 'Privado' : 'Compartido contigo'}">
            ${isOwner ? "🔒" : "👥"}
        </span>

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
                ${canEdit ? "" : "disabled"}
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
                ${canEdit ? "" : "disabled"}
            >
                ${completed
                    ? "Marcar pendiente"
                    : "Completar"
                }
            </button>

        </div>

        ${isOwner ? `
        <div class="document-actions">

            <button
                type="button"
                class="complete-document share-file-button"
            >
                👥 Compartir archivo
            </button>

            <button
                type="button"
                class="complete-document share-topic-button"
            >
                👥 Compartir tema
            </button>

        </div>
        ` : ""}

        ${isOwner ? `
        <button
            type="button"
            class="delete-document"
        >
            Eliminar
        </button>
        ` : ""}
    `;

    card
        .querySelector(
            ".favorite-button"
        )
        .addEventListener(
            "click",
            function () {

                if (canEdit) {
                    toggleFavorite(item);
                }

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

                if (canEdit) {
                    toggleCompleted(item);
                }

            }
        );

    const shareFileButton =
        card.querySelector(".share-file-button");

    if (shareFileButton) {

        shareFileButton.addEventListener(
            "click",
            function () {

                openShareModal({
                    scope: "file",
                    module: item.module,
                    topic: item.topic,
                    file: item
                });

            }
        );

    }

    const shareTopicButton =
        card.querySelector(".share-topic-button");

    if (shareTopicButton) {

        shareTopicButton.addEventListener(
            "click",
            function () {

                openShareModal({
                    scope: "topic",
                    module: item.module,
                    topic: item.topic
                });

            }
        );

    }

    const deleteButtons =
        card.querySelectorAll(".delete-document");

    deleteButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                deleteDocument(item);

            }
        );

    });

    return card;
}

// ---------------------------------------------
// ARRASTRAR Y SOLTAR / SELECCIÓN MÚLTIPLE
// ---------------------------------------------

let pendingFiles = [];

function fileNameWithoutExtension(name) {

    const lastDot =
        name.lastIndexOf(".");

    if (lastDot > 0) {

        return name.substring(
            0,
            lastDot
        );

    }

    return name;
}

function setupDropZone() {

    const dropZone =
        document.getElementById(
            "dropZone"
        );

    const fileInput =
        document.getElementById(
            "file"
        );

    if (!dropZone || !fileInput) {
        return;
    }

    dropZone.addEventListener(
        "click",
        function () {

            fileInput.click();

        }
    );

    fileInput.addEventListener(
        "change",
        function () {

            addFiles(
                fileInput.files
            );

            fileInput.value = "";

        }
    );

    [
        "dragenter",
        "dragover"
    ].forEach(function (eventName) {

        dropZone.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();

                dropZone.classList.add(
                    "drag-over"
                );

            }
        );

    });

    [
        "dragleave",
        "drop"
    ].forEach(function (eventName) {

        dropZone.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();

                dropZone.classList.remove(
                    "drag-over"
                );

            }
        );

    });

    dropZone.addEventListener(
        "drop",
        function (event) {

            if (
                event.dataTransfer &&
                event.dataTransfer.files
            ) {

                addFiles(
                    event.dataTransfer.files
                );

            }

        }
    );
}

function addFiles(fileArray) {

    Array.from(fileArray).forEach(
        function (file) {

            pendingFiles.push({

                file: file,

                title:
                    fileNameWithoutExtension(
                        file.name
                    )

            });

        }
    );

    renderFileList();
}

function removePendingFile(index) {

    pendingFiles.splice(index, 1);

    renderFileList();
}

function renderFileList() {

    const list =
        document.getElementById(
            "fileList"
        );

    if (!list) {
        return;
    }

    if (pendingFiles.length === 0) {

        list.innerHTML = "";

        return;
    }

    list.innerHTML = "";

    pendingFiles.forEach(
        function (entry, index) {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "file-row";

            row.innerHTML = `
                <span class="file-row-icon">
                    ${getFileIcon(entry.file.name)}
                </span>

                <input
                    type="text"
                    class="file-row-title"
                    value="${escapeHTMLAttr(entry.title)}"
                    placeholder="Título del documento"
                >

                <button
                    type="button"
                    class="file-row-remove"
                    title="Quitar"
                >
                    ✕
                </button>
            `;

            row.querySelector(
                ".file-row-title"
            ).addEventListener(
                "input",
                function () {

                    entry.title =
                        this.value;

                }
            );

            row.querySelector(
                ".file-row-remove"
            ).addEventListener(
                "click",
                function () {

                    removePendingFile(
                        index
                    );

                }
            );

            list.appendChild(row);

        }
    );
}

function escapeHTMLAttr(text) {

    return escapeHTML(text).replace(
        /"/g,
        "&quot;"
    );
}

async function uploadDocuments() {

    if (!supabaseClient) {

        alert(
            "Supabase no está conectado."
        );

        return;
    }

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

    const status =
        document.getElementById(
            "uploadStatus"
        );

    const button =
        document.getElementById(
            "uploadButton"
        );

    status.textContent = "";

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

    if (pendingFiles.length === 0) {

        status.textContent =
            "Arrastra o elige al menos un archivo.";

        return;
    }

    button.disabled = true;

    let uploaded = 0;

    const total =
        pendingFiles.length;

    const failed = [];

    for (
        let i = 0;
        i < pendingFiles.length;
        i++
    ) {

        const entry =
            pendingFiles[i];

        button.textContent =
            "Subiendo " +
            (i + 1) +
            " / " +
            total +
            "...";

        try {

            await uploadSingleFile(
                entry.file,
                entry.title ||
                    fileNameWithoutExtension(
                        entry.file.name
                    ),
                moduleName,
                topic,
                type
            );

            uploaded++;

        } catch (error) {

            console.error(
                "ERROR SUBIDA:",
                error
            );

            failed.push(
                entry.file.name
            );

        }

    }

    button.disabled = false;

    button.textContent =
        "Subir a DAMFLIX";

    if (failed.length === 0) {

        status.textContent =
            uploaded +
            " archivo(s) subido(s) correctamente.";

        pendingFiles = [];

        renderFileList();

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
            900
        );

    } else {

        status.textContent =
            uploaded +
            " subido(s), fallaron: " +
            failed.join(", ");

        await loadDocuments();

    }
}

async function uploadSingleFile(
    file,
    title,
    moduleName,
    topic,
    type
) {

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
        Math.random()
            .toString(36)
            .slice(2, 7) +
        "_" +
        safeFileName;

    const storagePath =
        currentUser.id +
        "/" +
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

    // Ya no guardamos una URL pública: los archivos son privados
    // y se abren generando una signed URL en el momento (ver openDocument).
    const {
        error: databaseError
    } =
        await supabaseClient
            .from("files")
            .insert({

                owner_id:
                    currentUser.id,

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
}

// ---------------------------------------------
// VISOR (HTML, PDF, IMÁGENES)
// ---------------------------------------------

function getExtension(item) {

    const source =
        (item.path || item.name || item.url || "")
            .split("?")[0]
            .toLowerCase();

    const dot =
        source.lastIndexOf(".");

    if (dot < 0) {
        return "";
    }

    return source.substring(dot + 1);
}

const IMAGE_EXTENSIONS = [
    "png", "jpg", "jpeg", "gif", "webp", "svg"
];

// El bucket es privado: generamos una URL firmada (temporal) cada
// vez que se abre un archivo, en vez de guardar una URL pública.
async function getSignedUrl(path) {

    const { data, error } =
        await supabaseClient
            .storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(path, 300); // 5 minutos

    if (error || !data) {

        console.error("Error creando signed URL:", error);
        return null;
    }

    return data.signedUrl;
}

function trackRecent(item) {

    supabaseClient
        .from("recent_files")
        .upsert(
            {
                user_id: currentUser.id,
                file_id: item.id,
                opened_at: new Date().toISOString()
            },
            { onConflict: "user_id,file_id" }
        )
        .then(function (result) {

            if (result && result.error) {
                console.error(result.error);
            }

        });
}

async function openDocument(item) {

    if (!item.path) {

        alert(
            "No se encontró el archivo."
        );

        return;
    }

    const url = await getSignedUrl(item.path);

    if (!url) {

        alert(
            "No se pudo generar el enlace de acceso al archivo."
        );

        return;
    }

    trackRecent(item);

    const extension =
        getExtension(item);

    // Supabase sirve los .html como texto plano,
    // así que los renderizamos nosotros en un visor.
    if (extension === "html" || extension === "htm") {

        openHtmlViewer(item, url);

        return;
    }

    if (extension === "pdf") {

        openPdfViewer(item, url);

        return;
    }

    if (IMAGE_EXTENSIONS.includes(extension)) {

        openImageViewer(item, url);

        return;
    }

    window.open(
        url,
        "_blank"
    );
}

let currentViewerUrl = null;
let currentViewerIsBlob = false;

function showViewer(title) {

    const viewer =
        document.getElementById("htmlViewer");

    const titleEl =
        document.getElementById("htmlViewerTitle");

    titleEl.textContent =
        title ||
        "Documento";

    viewer.classList.add("show");

    document.body.style.overflow = "hidden";
}

function resetViewerContent() {

    const frame =
        document.getElementById("htmlViewerFrame");

    const image =
        document.getElementById("htmlViewerImage");

    frame.removeAttribute("srcdoc");
    frame.removeAttribute("src");
    frame.className = "html-viewer-frame";
    frame.removeAttribute("sandbox");

    image.removeAttribute("src");
    image.className = "html-viewer-image";

    if (currentViewerIsBlob && currentViewerUrl) {

        URL.revokeObjectURL(
            currentViewerUrl
        );

    }

    currentViewerUrl = null;
    currentViewerIsBlob = false;
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

async function openHtmlViewer(item, url) {

    resetViewerContent();

    const frame =
        document.getElementById("htmlViewerFrame");

    frame.classList.add("visible");

    // sandbox sin allow-same-origin: el HTML subido
    // queda aislado de tu web.
    frame.setAttribute(
        "sandbox",
        "allow-scripts allow-popups allow-forms"
    );

    frame.srcdoc =
        "<p style='font-family:Arial;padding:20px'>" +
        "Cargando...</p>";

    showViewer(
        item.title ||
        item.name
    );

    try {

        const response =
            await fetch(url);

        if (!response.ok) {

            throw new Error(
                "HTTP " + response.status
            );

        }

        const html =
            await response.text();

        const finalHtml =
            addBaseTag(html, url);

        currentViewerUrl =
            URL.createObjectURL(
                new Blob(
                    [finalHtml],
                    { type: "text/html" }
                )
            );

        currentViewerIsBlob = true;

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

function openPdfViewer(item, url) {

    resetViewerContent();

    const frame =
        document.getElementById("htmlViewerFrame");

    frame.classList.add(
        "visible",
        "pdf"
    );

    // El PDF se sirve mediante una signed URL temporal (bucket privado);
    // el propio navegador lo renderiza dentro del iframe.
    frame.src =
        url +
        "#toolbar=1&navpanes=0";

    currentViewerUrl =
        url;

    currentViewerIsBlob = false;

    showViewer(
        item.title ||
        item.name
    );
}

function openImageViewer(item, url) {

    resetViewerContent();

    const image =
        document.getElementById("htmlViewerImage");

    image.src = url;

    image.classList.add("visible");

    currentViewerUrl =
        url;

    currentViewerIsBlob = false;

    showViewer(
        item.title ||
        item.name
    );
}

function closeHtmlViewer() {

    const viewer =
        document.getElementById("htmlViewer");

    if (viewer) {
        viewer.classList.remove("show");
    }

    resetViewerContent();

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

                if (currentViewerUrl) {

                    window.open(
                        currentViewerUrl,
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

    updateModuleProgress();
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

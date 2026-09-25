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
        setupNavigation();
        setupScheduleModal();
        setupTaskModal();
        setupEventModal();

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
    await loadSchedule();
    await loadTasks();
    await loadEvents();

    renderDashboard();
    renderFavoritesView();
    renderProfileView();

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
// NAVEGACIÓN (sidebar / vistas)
// ---------------------------------------------

function setupNavigation() {

    const links =
        document.querySelectorAll(".sidebar-link");

    const sidebar =
        document.getElementById("sidebar");

    const toggle =
        document.getElementById("sidebarToggle");

    links.forEach(function (link) {

        link.addEventListener("click", function () {

            const viewName =
                link.dataset.view;

            links.forEach(function (l) {
                l.classList.remove("active");
            });

            link.classList.add("active");

            document
                .querySelectorAll(".view")
                .forEach(function (view) {
                    view.classList.remove("active");
                });

            const targetView =
                document.getElementById("view-" + viewName);

            if (targetView) {
                targetView.classList.add("active");
            }

            if (viewName === "horario") {
                loadSchedule();
            }

            if (viewName === "calendario") {
                loadEvents();
            }

            if (viewName === "tareas") {
                loadTasks();
            }

            if (viewName === "dashboard") {
                renderDashboard();
            }

            if (viewName === "favoritos") {
                renderFavoritesView();
            }

            if (viewName === "perfil") {
                renderProfileView();
            }

            if (sidebar) {
                sidebar.classList.remove("open");
            }

        });

    });

    if (toggle && sidebar) {

        toggle.addEventListener("click", function () {
            sidebar.classList.toggle("open");
        });

    }

}

// ---------------------------------------------
// HORARIO (schedule_slots)
// ---------------------------------------------

const DAY_NAMES = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes"
};

// Horario de partida: se usa solo para precargar la tabla la
// primera vez que el usuario abre "Mi horario" (tabla vacía).
// A partir de ahí son datos normales, 100% editables.
const INITIAL_SCHEDULE = [
    { day: 1, start_time: "08:15", end_time: "09:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 1, start_time: "09:15", end_time: "10:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 1, start_time: "10:15", end_time: "11:15", subject: "ENDES", teacher: "Pablo Hernández García" },
    { day: 1, start_time: "11:45", end_time: "12:45", subject: "IPE I", teacher: "Alejandro Martín Rodríguez" },
    { day: 1, start_time: "12:45", end_time: "13:45", subject: "LMSGI", teacher: "Pablo Hernández García" },
    { day: 1, start_time: "13:45", end_time: "14:45", subject: "SIINF", teacher: "Juan Aguilar Ferrer" },

    { day: 2, start_time: "08:15", end_time: "09:15", subject: "BADAT", teacher: "Miguel Ángel García Blanes" },
    { day: 2, start_time: "09:15", end_time: "10:15", subject: "BADAT", teacher: "Miguel Ángel García Blanes" },
    { day: 2, start_time: "10:15", end_time: "11:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 2, start_time: "11:45", end_time: "12:45", subject: "ENDES", teacher: "Pablo Hernández García" },
    { day: 2, start_time: "12:45", end_time: "13:45", subject: "SASP", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 2, start_time: "13:45", end_time: "14:45", subject: "SIINF", teacher: "Juan Aguilar Ferrer" },

    { day: 3, start_time: "08:15", end_time: "09:15", subject: "DASPGS", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 3, start_time: "09:15", end_time: "10:15", subject: "BADAT", teacher: "Miguel Ángel García Blanes" },
    { day: 3, start_time: "10:15", end_time: "11:15", subject: "BADAT", teacher: "Miguel Ángel García Blanes", notes: "+ tutoría" },
    { day: 3, start_time: "11:45", end_time: "12:45", subject: "LMSGI", teacher: "Pablo Hernández García" },
    { day: 3, start_time: "12:45", end_time: "13:45", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 3, start_time: "13:45", end_time: "14:45", subject: "IPE I", teacher: "Alejandro Martín Rodríguez" },

    { day: 4, start_time: "08:15", end_time: "09:15", subject: "ENDES", teacher: "Pablo Hernández García" },
    { day: 4, start_time: "09:15", end_time: "10:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 4, start_time: "10:15", end_time: "11:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 4, start_time: "11:45", end_time: "12:45", subject: "Tutoría / SIINF", teacher: "" },
    { day: 4, start_time: "12:45", end_time: "13:45", subject: "SIINF", teacher: "Juan Aguilar Ferrer" },
    { day: 4, start_time: "13:45", end_time: "14:45", subject: "IPE I", teacher: "Alejandro Martín Rodríguez" },

    { day: 5, start_time: "08:15", end_time: "09:15", subject: "LMSGI", teacher: "Pablo Hernández García" },
    { day: 5, start_time: "09:15", end_time: "10:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 5, start_time: "10:15", end_time: "11:15", subject: "PROGR", teacher: "Luis Manuel Vázquez Venegas" },
    { day: 5, start_time: "11:45", end_time: "12:45", subject: "BADAT", teacher: "Miguel Ángel García Blanes" },
    { day: 5, start_time: "12:45", end_time: "13:45", subject: "BADAT", teacher: "Miguel Ángel García Blanes" },
    { day: 5, start_time: "13:45", end_time: "14:45", subject: "SIINF", teacher: "Juan Aguilar Ferrer" }
];

let scheduleList = [];
let scheduleLoaded = false;

async function loadSchedule() {

    const grid =
        document.getElementById("scheduleGrid");

    if (!supabaseClient || !currentUser) {
        return;
    }

    if (!scheduleLoaded) {

        grid.innerHTML =
            '<div class="empty">Cargando horario...</div>';

    }

    const { data, error } =
        await supabaseClient
            .from("schedule_slots")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("day", { ascending: true })
            .order("start_time", { ascending: true });

    if (error) {

        console.error("Error leyendo el horario:", error);

        grid.innerHTML =
            '<div class="empty">Error al cargar el horario.</div>';

        return;
    }

    // Primera vez: tabla vacía -> precargamos el horario inicial.
    if ((data || []).length === 0 && !scheduleLoaded) {

        await seedInitialSchedule();
        scheduleLoaded = true;
        return loadSchedule();
    }

    scheduleLoaded = true;
    scheduleList = data || [];

    renderSchedule();
}

async function seedInitialSchedule() {

    const rows =
        INITIAL_SCHEDULE.map(function (slot) {

            return {
                user_id: currentUser.id,
                day: slot.day,
                start_time: slot.start_time,
                end_time: slot.end_time,
                subject: slot.subject,
                teacher: slot.teacher || null,
                notes: slot.notes || null
            };

        });

    const { error } =
        await supabaseClient
            .from("schedule_slots")
            .insert(rows);

    if (error) {
        console.error("Error precargando el horario:", error);
    }
}

function renderSchedule() {

    const grid =
        document.getElementById("scheduleGrid");

    if (!grid) {
        return;
    }

    grid.innerHTML = "";

    for (let day = 1; day <= 5; day++) {

        const dayColumn =
            document.createElement("div");

        dayColumn.className = "schedule-day";

        const dayClasses =
            scheduleList.filter(function (slot) {
                return slot.day === day;
            });

        let html =
            '<div class="schedule-day-title">' +
            DAY_NAMES[day] +
            "</div>";

        if (dayClasses.length === 0) {

            html +=
                '<div class="schedule-day-empty">Sin clases</div>';

        } else {

            dayClasses.forEach(function (slot) {

                html +=
                    '<div class="class-card" data-id="' +
                    slot.id +
                    '">' +
                    '<div class="class-card-time">' +
                    slot.start_time.substring(0, 5) +
                    " - " +
                    slot.end_time.substring(0, 5) +
                    "</div>" +
                    '<div class="class-card-subject">' +
                    escapeHTML(slot.subject) +
                    "</div>" +
                    (slot.teacher
                        ? '<div class="class-card-teacher">' + escapeHTML(slot.teacher) + "</div>"
                        : "") +
                    (slot.notes
                        ? '<div class="class-card-notes">' + escapeHTML(slot.notes) + "</div>"
                        : "") +
                    "</div>";

            });

        }

        dayColumn.innerHTML = html;
        grid.appendChild(dayColumn);

    }

    grid
        .querySelectorAll(".class-card")
        .forEach(function (card) {

            card.addEventListener("click", function () {

                const slot =
                    scheduleList.find(function (s) {
                        return String(s.id) === card.dataset.id;
                    });

                if (slot) {
                    openClassModal(slot);
                }

            });

        });

}

function openClassModal(slot) {

    const modal =
        document.getElementById("classModal");

    const title =
        document.getElementById("classModalTitle");

    const deleteButton =
        document.getElementById("deleteClassButton");

    document.getElementById("classId").value =
        slot ? slot.id : "";

    document.getElementById("classDay").value =
        slot ? slot.day : "1";

    document.getElementById("classStart").value =
        slot ? slot.start_time.substring(0, 5) : "";

    document.getElementById("classEnd").value =
        slot ? slot.end_time.substring(0, 5) : "";

    document.getElementById("classSubject").value =
        slot ? slot.subject : "";

    document.getElementById("classTeacher").value =
        slot && slot.teacher ? slot.teacher : "";

    document.getElementById("classNotes").value =
        slot && slot.notes ? slot.notes : "";

    document.getElementById("classStatus").textContent = "";

    title.textContent =
        slot ? "Editar clase" : "Añadir clase";

    if (deleteButton) {
        deleteButton.classList.toggle("hidden", !slot);
    }

    modal.classList.add("show");

}

function closeClassModal() {

    document
        .getElementById("classModal")
        .classList.remove("show");

}

function setupScheduleModal() {

    const openButton =
        document.getElementById("openAddClass");

    const closeButton =
        document.getElementById("closeClassModal");

    const form =
        document.getElementById("scheduleForm");

    const deleteButton =
        document.getElementById("deleteClassButton");

    if (openButton) {

        openButton.addEventListener("click", function () {
            openClassModal(null);
        });

    }

    if (closeButton) {

        closeButton.addEventListener("click", closeClassModal);

    }

    if (form) {

        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const status =
                document.getElementById("classStatus");

            const id =
                document.getElementById("classId").value;

            const payload = {
                user_id: currentUser.id,
                day: Number(document.getElementById("classDay").value),
                start_time: document.getElementById("classStart").value,
                end_time: document.getElementById("classEnd").value,
                subject: document.getElementById("classSubject").value.trim(),
                teacher: document.getElementById("classTeacher").value.trim() || null,
                notes: document.getElementById("classNotes").value.trim() || null
            };

            status.textContent = "Guardando...";

            let error;

            if (id) {

                ({ error } =
                    await supabaseClient
                        .from("schedule_slots")
                        .update(payload)
                        .eq("id", id)
                        .eq("user_id", currentUser.id));

            } else {

                ({ error } =
                    await supabaseClient
                        .from("schedule_slots")
                        .insert(payload));

            }

            if (error) {

                console.error("Error guardando la clase:", error);
                status.textContent = "Error al guardar: " + error.message;
                return;
            }

            closeClassModal();
            await loadSchedule();

        });

    }

    if (deleteButton) {

        deleteButton.addEventListener("click", async function () {

            const id =
                document.getElementById("classId").value;

            if (!id) {
                return;
            }

            if (!confirm("¿Eliminar esta clase del horario?")) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("schedule_slots")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", currentUser.id);

            if (error) {

                console.error("Error eliminando la clase:", error);
                document.getElementById("classStatus").textContent =
                    "Error al eliminar: " + error.message;
                return;
            }

            closeClassModal();
            await loadSchedule();

        });

    }

}

// ---------------------------------------------
// TAREAS (tasks)
// ---------------------------------------------

let tasksList = [];

async function loadTasks() {

    if (!supabaseClient || !currentUser) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("tasks")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("completed", { ascending: true })
            .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
        console.error("Error leyendo tareas:", error);
        return;
    }

    tasksList = data || [];

    renderTasks();
    renderDashboard();
}

function formatDueDate(dateStr) {

    if (!dateStr) {
        return "Sin fecha límite";
    }

    const parts = dateStr.split("-");

    return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function renderTasks() {

    const list =
        document.getElementById("taskList");

    if (!list) {
        return;
    }

    if (tasksList.length === 0) {

        list.innerHTML =
            '<div class="empty">Todavía no tienes tareas. Pulsa "+ Añadir tarea" para crear la primera.</div>';

        return;
    }

    list.innerHTML = "";

    tasksList.forEach(function (task) {

        const row =
            document.createElement("div");

        row.className =
            "task-row" + (task.completed ? " completed" : "");

        row.innerHTML =
            '<input type="checkbox" class="task-row-checkbox" ' +
            (task.completed ? "checked" : "") +
            ' data-id="' + task.id + '">' +
            '<div class="task-row-body" data-id="' + task.id + '">' +
            '<div class="task-row-title' + (task.completed ? " completed-text" : "") + '">' +
            escapeHTML(task.title) +
            "</div>" +
            '<div class="task-row-meta">' +
            (task.subject ? escapeHTML(task.subject) + " · " : "") +
            formatDueDate(task.due_date) +
            "</div>" +
            "</div>" +
            '<span class="priority-badge priority-' + task.priority + '">' +
            task.priority +
            "</span>";

        list.appendChild(row);

    });

    list
        .querySelectorAll(".task-row-checkbox")
        .forEach(function (checkbox) {

            checkbox.addEventListener("click", async function (event) {

                event.stopPropagation();

                const task =
                    tasksList.find(function (t) {
                        return String(t.id) === checkbox.dataset.id;
                    });

                if (!task) {
                    return;
                }

                const { error } =
                    await supabaseClient
                        .from("tasks")
                        .update({ completed: checkbox.checked })
                        .eq("id", task.id)
                        .eq("user_id", currentUser.id);

                if (error) {
                    console.error("Error actualizando tarea:", error);
                    return;
                }

                await loadTasks();

            });

        });

    list
        .querySelectorAll(".task-row-body")
        .forEach(function (body) {

            body.addEventListener("click", function () {

                const task =
                    tasksList.find(function (t) {
                        return String(t.id) === body.dataset.id;
                    });

                if (task) {
                    openTaskModal(task);
                }

            });

        });

}

function openTaskModal(task) {

    const modal =
        document.getElementById("taskModal");

    const title =
        document.getElementById("taskModalTitle");

    const deleteButton =
        document.getElementById("deleteTaskButton");

    document.getElementById("taskId").value =
        task ? task.id : "";

    document.getElementById("taskTitle").value =
        task ? task.title : "";

    document.getElementById("taskSubject").value =
        task && task.subject ? task.subject : "";

    document.getElementById("taskDue").value =
        task && task.due_date ? task.due_date : "";

    document.getElementById("taskPriority").value =
        task ? task.priority : "media";

    document.getElementById("taskCompleted").checked =
        task ? task.completed === true : false;

    document.getElementById("taskStatus").textContent = "";

    title.textContent =
        task ? "Editar tarea" : "Añadir tarea";

    if (deleteButton) {
        deleteButton.classList.toggle("hidden", !task);
    }

    modal.classList.add("show");

}

function closeTaskModal() {

    document
        .getElementById("taskModal")
        .classList.remove("show");

}

function setupTaskModal() {

    const openButton =
        document.getElementById("openAddTask");

    const closeButton =
        document.getElementById("closeTaskModal");

    const form =
        document.getElementById("taskForm");

    const deleteButton =
        document.getElementById("deleteTaskButton");

    if (openButton) {

        openButton.addEventListener("click", function () {
            openTaskModal(null);
        });

    }

    if (closeButton) {

        closeButton.addEventListener("click", closeTaskModal);

    }

    if (form) {

        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const status =
                document.getElementById("taskStatus");

            const id =
                document.getElementById("taskId").value;

            const payload = {
                user_id: currentUser.id,
                title: document.getElementById("taskTitle").value.trim(),
                subject: document.getElementById("taskSubject").value.trim() || null,
                due_date: document.getElementById("taskDue").value || null,
                priority: document.getElementById("taskPriority").value,
                completed: document.getElementById("taskCompleted").checked
            };

            status.textContent = "Guardando...";

            let error;

            if (id) {

                ({ error } =
                    await supabaseClient
                        .from("tasks")
                        .update(payload)
                        .eq("id", id)
                        .eq("user_id", currentUser.id));

            } else {

                ({ error } =
                    await supabaseClient
                        .from("tasks")
                        .insert(payload));

            }

            if (error) {
                console.error("Error guardando la tarea:", error);
                status.textContent = "Error al guardar: " + error.message;
                return;
            }

            closeTaskModal();
            await loadTasks();

        });

    }

    if (deleteButton) {

        deleteButton.addEventListener("click", async function () {

            const id =
                document.getElementById("taskId").value;

            if (!id || !confirm("¿Eliminar esta tarea?")) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("tasks")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", currentUser.id);

            if (error) {
                console.error("Error eliminando tarea:", error);
                return;
            }

            closeTaskModal();
            await loadTasks();

        });

    }

}

// ---------------------------------------------
// CALENDARIO (events)
// ---------------------------------------------

let eventsList = [];
let calendarViewDate = new Date();

const CATEGORY_ICONS = {
    academico: "📚",
    examen: "📝",
    vacaciones: "🏖️",
    festivo: "🎉",
    personal: "👤"
};

const CATEGORY_LABELS = {
    academico: "Académico",
    examen: "Examen/evaluación",
    vacaciones: "Vacaciones",
    festivo: "Festivo",
    personal: "Personal"
};

async function loadEvents() {

    if (!supabaseClient || !currentUser) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("events")
            .select("*")
            .eq("user_id", currentUser.id)
            .order("start_at", { ascending: true });

    if (error) {

        console.error("Error leyendo eventos:", error);

        const grid =
            document.getElementById("calendarGrid");

        if (grid) {

            grid.innerHTML =
                '<div class="empty">No se pudieron cargar los eventos: ' +
                escapeHTML(error.message) +
                "</div>";

        }

        return;
    }

    eventsList = data || [];

    renderCalendar();
    renderUpcomingEvents();
    renderDashboard();
}

function renderCalendar() {

    const grid =
        document.getElementById("calendarGrid");

    const label =
        document.getElementById("calendarLabel");

    if (!grid || !label) {
        return;
    }

    const year =
        calendarViewDate.getFullYear();

    const month =
        calendarViewDate.getMonth();

    const monthNames = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ];

    label.textContent =
        monthNames[month] + " " + year;

    grid.innerHTML = "";

    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(function (name) {

        const el =
            document.createElement("div");

        el.className = "calendar-weekday";
        el.textContent = name;

        grid.appendChild(el);

    });

    const firstDay =
        new Date(year, month, 1);

    // Lunes = 0 ... Domingo = 6
    let startOffset =
        firstDay.getDay() - 1;

    if (startOffset < 0) {
        startOffset = 6;
    }

    const daysInMonth =
        new Date(year, month + 1, 0).getDate();

    const today =
        new Date();

    const totalCells =
        Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {

        const dayNumber =
            i - startOffset + 1;

        const cell =
            document.createElement("div");

        const cellDate =
            new Date(year, month, dayNumber);

        const isOutside =
            dayNumber < 1 || dayNumber > daysInMonth;

        const isToday =
            !isOutside &&
            cellDate.toDateString() === today.toDateString();

        cell.className =
            "calendar-day" +
            (isOutside ? " outside" : "") +
            (isToday ? " today" : "");

        let html =
            '<div class="calendar-day-number">' +
            (isOutside ? "" : dayNumber) +
            "</div>";

        if (!isOutside) {

            const dayEvents =
                eventsList.filter(function (ev) {

                    const evDate =
                        new Date(ev.start_at);

                    return evDate.toDateString() === cellDate.toDateString();

                });

            dayEvents.forEach(function (ev) {

                html +=
                    '<div class="calendar-event-chip chip-' + ev.category + '" data-id="' + ev.id + '">' +
                    CATEGORY_ICONS[ev.category] + " " + escapeHTML(ev.title) +
                    "</div>";

            });

        }

        cell.innerHTML = html;

        if (!isOutside) {

            cell.addEventListener("click", function (event) {

                const chip =
                    event.target.closest(".calendar-event-chip");

                if (chip) {

                    const ev =
                        eventsList.find(function (e) {
                            return String(e.id) === chip.dataset.id;
                        });

                    if (ev) {
                        openEventModal(ev);
                    }

                    return;
                }

                const prefillDate =
                    year + "-" +
                    String(month + 1).padStart(2, "0") + "-" +
                    String(dayNumber).padStart(2, "0");

                openEventModal(null, prefillDate);

            });

        }

        grid.appendChild(cell);

    }

}

function renderUpcomingEvents() {

    const container =
        document.getElementById("upcomingEvents");

    if (!container) {
        return;
    }

    const now =
        new Date();

    const upcoming =
        eventsList
            .filter(function (ev) {
                return new Date(ev.start_at) >= now;
            })
            .slice(0, 8);

    if (upcoming.length === 0) {

        container.innerHTML =
            '<div class="dashboard-empty">No tienes eventos próximos.</div>';

        return;
    }

    container.innerHTML = "";

    upcoming.forEach(function (ev) {

        const row =
            document.createElement("div");

        row.className = "dashboard-row";
        row.dataset.id = ev.id;

        row.innerHTML =
            '<div class="dashboard-row-title">' + CATEGORY_ICONS[ev.category] + " " + escapeHTML(ev.title) + "</div>" +
            '<div class="dashboard-row-meta">' +
            formatDateTime(ev.start_at) + " · " + CATEGORY_LABELS[ev.category] +
            "</div>";

        row.addEventListener("click", function () {
            openEventModal(ev);
        });

        container.appendChild(row);

    });

}

function formatDateTime(isoString) {

    const d =
        new Date(isoString);

    return d.toLocaleDateString("es-ES") + " " +
        d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocalValue(isoString) {

    if (!isoString) {
        return "";
    }

    const d =
        new Date(isoString);

    const pad =
        function (n) { return String(n).padStart(2, "0"); };

    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
        "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());

}

function openEventModal(ev, prefillDate) {

    const modal =
        document.getElementById("eventModal");

    const title =
        document.getElementById("eventModalTitle");

    const deleteButton =
        document.getElementById("deleteEventButton");

    const saveButton =
        document.getElementById("saveEventButton");

    const officialBadge =
        document.getElementById("eventOfficialBadge");

    const isOfficial =
        ev && ev.is_official === true;

    document.getElementById("eventId").value =
        ev ? ev.id : "";

    document.getElementById("eventTitle").value =
        ev ? ev.title : "";

    document.getElementById("eventStart").value =
        ev ? toDatetimeLocalValue(ev.start_at) :
        (prefillDate ? prefillDate + "T09:00" : "");

    document.getElementById("eventEnd").value =
        ev ? toDatetimeLocalValue(ev.end_at) : "";

    document.getElementById("eventDescription").value =
        ev && ev.description ? ev.description : "";

    document.getElementById("eventStatus").textContent = "";

    title.textContent =
        isOfficial ? "Evento del centro" : (ev ? "Editar evento" : "Añadir evento");

    // Eventos oficiales: solo lectura, ni editar ni eliminar.
    ["eventTitle", "eventStart", "eventEnd", "eventDescription"]
        .forEach(function (id) {
            document.getElementById(id).disabled = isOfficial;
        });

    if (officialBadge) {
        officialBadge.classList.toggle("hidden", !isOfficial);
    }

    if (deleteButton) {
        deleteButton.classList.toggle("hidden", !ev || isOfficial);
    }

    if (saveButton) {
        saveButton.classList.toggle("hidden", isOfficial);
    }

    modal.classList.add("show");

}

function closeEventModal() {

    document
        .getElementById("eventModal")
        .classList.remove("show");

}

function setupEventModal() {

    const openButton =
        document.getElementById("openAddEvent");

    const closeButton =
        document.getElementById("closeEventModal");

    const form =
        document.getElementById("eventForm");

    const deleteButton =
        document.getElementById("deleteEventButton");

    const prevButton =
        document.getElementById("calendarPrev");

    const nextButton =
        document.getElementById("calendarNext");

    if (openButton) {

        openButton.addEventListener("click", function () {
            openEventModal(null);
        });

    }

    if (closeButton) {

        closeButton.addEventListener("click", closeEventModal);

    }

    if (prevButton) {

        prevButton.addEventListener("click", function () {
            calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
            renderCalendar();
        });

    }

    if (nextButton) {

        nextButton.addEventListener("click", function () {
            calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
            renderCalendar();
        });

    }

    if (form) {

        form.addEventListener("submit", async function (event) {

            event.preventDefault();

            const status =
                document.getElementById("eventStatus");

            const id =
                document.getElementById("eventId").value;

            const startValue =
                document.getElementById("eventStart").value;

            const endValue =
                document.getElementById("eventEnd").value;

            const payload = {
                user_id: currentUser.id,
                title: document.getElementById("eventTitle").value.trim(),
                category: "personal",
                is_official: false,
                start_at: startValue ? new Date(startValue).toISOString() : null,
                end_at: endValue ? new Date(endValue).toISOString() : null,
                description: document.getElementById("eventDescription").value.trim() || null
            };

            status.textContent = "Guardando...";

            let error;

            if (id) {

                ({ error } =
                    await supabaseClient
                        .from("events")
                        .update(payload)
                        .eq("id", id)
                        .eq("user_id", currentUser.id)
                        .eq("is_official", false));

            } else {

                ({ error } =
                    await supabaseClient
                        .from("events")
                        .insert(payload));

            }

            if (error) {
                console.error("Error guardando el evento:", error);
                status.textContent = "Error al guardar: " + error.message;
                return;
            }

            closeEventModal();
            await loadEvents();

        });

    }

    if (deleteButton) {

        deleteButton.addEventListener("click", async function () {

            const id =
                document.getElementById("eventId").value;

            if (!id || !confirm("¿Eliminar este evento?")) {
                return;
            }

            const { error } =
                await supabaseClient
                    .from("events")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", currentUser.id)
                    .eq("is_official", false);

            if (error) {
                console.error("Error eliminando evento:", error);
                return;
            }

            closeEventModal();
            await loadEvents();

        });

    }

}

// ---------------------------------------------
// DASHBOARD
// ---------------------------------------------

function renderDashboard() {

    const statsBox =
        document.getElementById("dashboardStats");

    if (!statsBox) {
        return;
    }

    const myFiles =
        documentsList.filter(function (d) {
            return d.owner_id === currentUser.id;
        });

    const favoriteFiles =
        myFiles.filter(function (d) {
            return d.favorite === true;
        });

    const pendingTasks =
        tasksList.filter(function (t) {
            return !t.completed;
        });

    const now = new Date();

    const upcomingEventsCount =
        eventsList.filter(function (ev) {
            return new Date(ev.start_at) >= now;
        }).length;

    statsBox.innerHTML =
        statCard(myFiles.length, "Archivos") +
        statCard(favoriteFiles.length, "Favoritos") +
        statCard(pendingTasks.length, "Tareas pendientes") +
        statCard(upcomingEventsCount, "Próximos eventos");

    // Próximas tareas
    const tasksBox =
        document.getElementById("dashboardTasks");

    if (tasksBox) {

        const nextTasks =
            pendingTasks.slice(0, 5);

        tasksBox.innerHTML =
            nextTasks.length === 0
                ? '<div class="dashboard-empty">Sin tareas pendientes.</div>'
                : nextTasks.map(function (t) {
                    return dashboardRow(t.title, formatDueDate(t.due_date));
                }).join("");

    }

    // Próximos eventos
    const eventsBox =
        document.getElementById("dashboardEvents");

    if (eventsBox) {

        const nextEvents =
            eventsList
                .filter(function (ev) { return new Date(ev.start_at) >= now; })
                .slice(0, 5);

        eventsBox.innerHTML =
            nextEvents.length === 0
                ? '<div class="dashboard-empty">Sin eventos próximos.</div>'
                : nextEvents.map(function (ev) {
                    return dashboardRow(CATEGORY_ICONS[ev.category] + " " + ev.title, formatDateTime(ev.start_at));
                }).join("");

    }

    // Horario de hoy
    const todayBox =
        document.getElementById("dashboardToday");

    if (todayBox) {

        const weekday =
            now.getDay();

        const todaySlots =
            (weekday >= 1 && weekday <= 5)
                ? scheduleList.filter(function (s) { return s.day === weekday; })
                : [];

        todayBox.innerHTML =
            todaySlots.length === 0
                ? '<div class="dashboard-empty">No tienes clases hoy.</div>'
                : todaySlots.map(function (s) {
                    return dashboardRow(
                        s.subject,
                        s.start_time.substring(0, 5) + " - " + s.end_time.substring(0, 5)
                    );
                }).join("");

    }

    // Archivos recientes
    const filesBox =
        document.getElementById("dashboardFiles");

    if (filesBox) {

        const recent =
            myFiles.slice(0, 5);

        filesBox.innerHTML =
            recent.length === 0
                ? '<div class="dashboard-empty">Aún no has subido archivos.</div>'
                : recent.map(function (f) {
                    return dashboardRow(f.title || f.name, f.module || "");
                }).join("");

    }

    // Favoritos
    const favBox =
        document.getElementById("dashboardFavorites");

    if (favBox) {

        const favs =
            favoriteFiles.slice(0, 5);

        favBox.innerHTML =
            favs.length === 0
                ? '<div class="dashboard-empty">Aún no tienes favoritos.</div>'
                : favs.map(function (f) {
                    return dashboardRow(f.title || f.name, f.module || "");
                }).join("");

    }

}

function statCard(value, label) {

    return (
        '<div class="stat-card">' +
        '<div class="stat-card-value">' + value + "</div>" +
        '<div class="stat-card-label">' + label + "</div>" +
        "</div>"
    );

}

function dashboardRow(title, meta) {

    return (
        '<div class="dashboard-row">' +
        '<div class="dashboard-row-title">' + escapeHTML(title) + "</div>" +
        '<div class="dashboard-row-meta">' + escapeHTML(meta) + "</div>" +
        "</div>"
    );

}

// ---------------------------------------------
// FAVORITOS (vista dedicada)
// ---------------------------------------------

function renderFavoritesView() {

    const grid =
        document.getElementById("favoritesGrid");

    if (!grid) {
        return;
    }

    const favorites =
        documentsList.filter(function (d) {
            return d.owner_id === currentUser.id && d.favorite === true;
        });

    if (favorites.length === 0) {

        grid.innerHTML = "";
        return;
    }

    grid.innerHTML = "";

    favorites.forEach(function (item) {

        const card =
            document.createElement("div");

        card.className = "favorite-card";

        card.innerHTML =
            '<div class="favorite-card-title">★ ' + escapeHTML(item.title || item.name) + "</div>" +
            '<div class="favorite-card-meta">' +
            escapeHTML(item.module || "") + (item.topic ? " · " + escapeHTML(item.topic) : "") +
            "</div>";

        card.addEventListener("click", function () {
            openDocument(item);
        });

        grid.appendChild(card);

    });

}

// ---------------------------------------------
// PERFIL (vista dedicada)
// ---------------------------------------------

function renderProfileView() {

    const nameEl =
        document.getElementById("profileName");

    const emailEl =
        document.getElementById("profileEmail");

    const avatarEl =
        document.getElementById("profileAvatar");

    const statsBox =
        document.getElementById("profileStats");

    if (!nameEl || !currentUser) {
        return;
    }

    const displayName =
        (currentProfile && currentProfile.display_name) || currentUser.email;

    nameEl.textContent = displayName;
    emailEl.textContent = currentUser.email;
    avatarEl.textContent = displayName.charAt(0).toUpperCase();

    const myFiles =
        documentsList.filter(function (d) {
            return d.owner_id === currentUser.id;
        });

    const favoriteFiles =
        myFiles.filter(function (d) {
            return d.favorite === true;
        });

    if (statsBox) {

        statsBox.innerHTML =
            statCard(myFiles.length, "Archivos subidos") +
            statCard(favoriteFiles.length, "Favoritos") +
            statCard(tasksList.length, "Tareas totales") +
            statCard(eventsList.length, "Eventos totales");

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
    renderDashboard();
    renderFavoritesView();
    renderProfileView();
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

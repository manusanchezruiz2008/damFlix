# DAMFLIX

Biblioteca web personal para 1º DAM, con aspecto inspirado en plataformas de streaming.

## Incluye
- Portada tipo streaming
- Tarjetas por módulo
- Biblioteca de documentos
- Buscador
- Filtros
- Favoritos
- Marcar documentos como completados
- Subida de PDFs a Supabase Storage
- Apertura de PDFs desde la web
- Diseño adaptable a móvil

## 1. Configurar Supabase
Abre:

`js/config.js`

Y cambia:

```js
supabaseUrl: "PEGA_AQUI_TU_PROJECT_URL",
supabaseAnonKey: "PEGA_AQUI_TU_ANON_O_PUBLISHABLE_KEY",
bucket: "files"
```

por tus datos.

IMPORTANTE: usa únicamente una clave pública/anon/publishable destinada al navegador. Nunca pongas una `service_role`.

## 2. Bucket
El proyecto está preparado para usar un bucket llamado:

`files`

Si ya lo tienes creado, perfecto.

Para que `getPublicUrl()` funcione directamente, el bucket debe ser público.

## 3. Política de subida
Si Supabase devuelve un error de permisos al subir, revisa las Policies de Storage del bucket.

Para una web pública en GitHub Pages, no conviene permitir subidas anónimas a cualquiera. Lo recomendable es añadir autenticación antes de publicar la subida para todo Internet.

## 4. Abrir en local
Puedes abrir `index.html` directamente, aunque para probarlo como web es mejor usar Live Server en VS Code.

## 5. GitHub Pages
Sube el contenido del proyecto a tu repositorio y activa:

Settings > Pages > Deploy from a branch

Selecciona `main` y `/root`.

## Estructura
```text
DAMFLIX/
├── index.html
├── README.md
├── css/
│   └── style.css
└── js/
    ├── app.js
    └── config.js
```

# Kronos — PWA

Tracker personal de categorías de tiempo. Local-first, sin cuentas, sin sync.

## Estructura

```
kronos-pwa/
├── index.html              # entry point (hi-fi actual)
├── hifi.js                 # lógica de pantallas (datos demo incluidos)
├── manifest.webmanifest    # metadata PWA
├── sw.js                   # service worker (offline cache)
└── icons/                  # íconos de app (192, 512, maskable)
```

## Deploy a GitHub Pages

1. Crea un repo público (ej. `kronos`).
2. Subí el contenido de esta carpeta al root del repo:
   ```bash
   cd kronos-pwa
   git init
   git add .
   git commit -m "kronos hi-fi pwa"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/kronos.git
   git push -u origin main
   ```
3. En GitHub → Settings → Pages → Source: `main` / `/ (root)` → Save.
4. URL pública: `https://TU_USUARIO.github.io/kronos/`

## Deploy alternativo (Netlify / Vercel / Cloudflare Pages)

Todos soportan drag&drop de la carpeta. Son gratis y te dan HTTPS automático, que es requisito para que una PWA se pueda instalar.

- **Netlify Drop:** https://app.netlify.com/drop — arrastrás la carpeta y listo.
- **Vercel:** `npx vercel` desde la carpeta.
- **Cloudflare Pages:** conectás el repo de GitHub.

## Instalar en el móvil

- **iOS Safari:** abrí la URL → botón compartir → "Agregar a pantalla de inicio".
- **Android Chrome:** abrí la URL → menú ⋮ → "Instalar app" o "Agregar a inicio".

Una vez instalada, funciona offline. Los datos viven en el dispositivo.

## Estado actual

Esto es el **prototipo de diseño hi-fi**, no la versión funcional. Incluye:

- ✅ 3 pantallas (Registro, Historial, Stats) con variantes elegidas
- ✅ 4 estados interactivos (idle, sesión activa, modal terminar, modal editar)
- ✅ Datos demo precargados para visualizar el layout
- ✅ Shell PWA instalable + offline

Falta para un producto real:

- Timer funcional con persistencia en localStorage / IndexedDB
- Validación de inputs en modales
- Export/import JSON real
- Notificaciones push (iOS limitado)
- Empty states para primer uso

## Próximo paso

Pasar de prototipo a implementación. Opciones:

1. **Handoff a Claude Code** con los tokens y componentes ya decididos.
2. Iterar más el diseño antes de construir (empty states, animaciones, edge cases).

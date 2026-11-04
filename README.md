# CloudCTRL

Versión 0.2.1 · by OmT Finance

App web (PWA): la nube privada de TextCTRL y SheetCTRL. Mismo estilo que las demás apps de OmT Finance, en rosa.

## Funciones

- Lista de textos, hojas y archivos, con filtros, búsqueda y espacio usado.
- Subir cualquier archivo y descargarlo (hasta 36 MB cada uno, 200 MB por cuenta).
- Al pulsar un archivo se abre un emergente con su vista previa (textos, hojas, imágenes, PDF, audio, vídeo y texto plano) y sus opciones debajo.
- Papelera: lo borrado se puede recuperar durante 30 días.
- TextCTRL y SheetCTRL se conectan desde su menú ⋯ → Nube y mantienen sus documentos iguales en todos los dispositivos.

## Cómo funciona

- Cifrado de extremo a extremo: contenido y nombres se cifran (AES-GCM) en el dispositivo con una clave derivada de la contraseña, que no se puede recuperar.
- `cloud.js` es el cliente y es igual en cloudctrl, textctrl y sheetctrl: si cambia, se copia a las tres.
- `api/cloud.js` guarda los bloques cifrados en Upstash Redis (claves `cld:`). Acepta llamadas de los dominios de TextCTRL y SheetCTRL (lista `ORIGINS`).
- `engine.js` es una copia del de sheetctrl: calcula las fórmulas de la vista previa de las hojas.
- Si dos dispositivos cambian el mismo documento a la vez, se conservan las dos versiones.

## Puesta en marcha

1. Crear el proyecto en Vercel y conectar Upstash Redis (Storage).
2. Comprobar que `/api/cloud` responde `configured: true`.
3. La dirección de la app está en `ORIGIN`, al principio de `cloud.js`: si cambia, se copia el archivo a textctrl y sheetctrl.

## Seguridad

- **Política de seguridad (CSP) y cabeceras** en `vercel.json`, como en las demás apps de OmT: solo se ejecuta código de la propia app (nada en línea: lo que iba en `index.html` está en `boot.js`), solo se conecta a su propio servidor, no se puede incrustar en otra web (`frame-ancestors 'none'`), `nosniff`, `no-referrer` y sin permiso de cámara, micrófono ni ubicación. La vista previa de los documentos va en un marco sin permisos (`sandbox`): lo que contenga no puede ejecutar nada.

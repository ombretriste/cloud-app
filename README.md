# CloudCTRL

Versión 0.1.0 · by OmT Finance

App web (PWA): la nube privada de TextCTRL y SheetCTRL. Mismo estilo que las demás apps de OmT Finance, en rosa.

## Funciones

- Lista de textos, hojas y archivos, con filtros, búsqueda y espacio usado.
- Subir cualquier archivo y descargarlo (hasta 36 MB cada uno, 200 MB por cuenta).
- Papelera: lo borrado se puede recuperar durante 30 días.
- TextCTRL y SheetCTRL se conectan desde su menú ⋯ → Nube y mantienen sus documentos iguales en todos los dispositivos.

## Cómo funciona

- Cifrado de extremo a extremo: contenido y nombres se cifran (AES-GCM) en el dispositivo con una clave derivada de la contraseña, que no se puede recuperar.
- `cloud.js` es el cliente y es igual en cloudctrl, textctrl y sheetctrl: si cambia, se copia a las tres.
- `api/cloud.js` guarda los bloques cifrados en Upstash Redis (claves `cld:`). Acepta llamadas de los dominios de TextCTRL y SheetCTRL (lista `ORIGINS`).
- Si dos dispositivos cambian el mismo documento a la vez, se conservan las dos versiones.

## Puesta en marcha

1. Crear el proyecto en Vercel y conectar Upstash Redis (Storage).
2. Comprobar que `/api/cloud` responde `configured: true`.
3. Poner la dirección definitiva en `ORIGIN`, al principio de `cloud.js`, y copiar el archivo a textctrl y sheetctrl.

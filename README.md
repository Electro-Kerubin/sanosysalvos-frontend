# Sanos y Salvos - Frontend

Bienvenido al repositorio del frontend de **Sanos y Salvos**, una plataforma colaborativa para reportar, buscar y rescatar mascotas perdidas en tu comunidad.

> **Nota importante:** Este repositorio contiene **exclusivamente el código del frontend**. La aplicación se conecta a un ecosistema de microservicios (Backend) a través de un API Gateway que maneja la autenticación, bases de datos, el motor de coincidencias y notificaciones en tiempo real.

## Características Principales

- **Diseño Responsivo:** UI adaptativa y optimizada para verse de forma ordenada y legible en cualquier tamaño u orientación de pantalla, ya sea un dispositivo móvil, tablet o monitor ultra ancho.
- **Reportes de Mascotas:** Funcionalidad completa para reportar una mascota perdida o encontrada con soporte para subida de fotos y selección de coordenadas en un mapa.
- **Mensajería Privada:** Chat asincrónico entre usuarios para coordinar rescates o reportes de mascotas encontradas de manera segura, con soporte para fotos y ubicación compartida.
- **Progressive Web App (PWA):** Soporte offline básico y capacidad de instalarse en el dispositivo mediante service workers.
- **Ecosistema Multiplataforma:** Desarrollado con React Native y Expo, soportando ambientes Web y Móvil.

## Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)

## Instalación y Configuración

1. Clona este repositorio:
   ```bash
   git clone <tu-repositorio>
   cd sanosysalvos-frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Configura tus variables de entorno (por ejemplo, la URL del API Gateway) en un archivo `.env` en la raíz del proyecto.

## Ejecución del Proyecto

Para ejecutar el frontend en modo de desarrollo web:
```bash
npm run web
```

## Contribuciones
Las contribuciones son bienvenidas. Por favor abre un _issue_ para discutir los cambios mayores antes de enviar un _pull request_.
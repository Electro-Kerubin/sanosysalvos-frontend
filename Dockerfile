# Usa una imagen base de Node.js
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias e instálalas
COPY package*.json ./
RUN npm install

# Copia el resto del código y expone el puerto 3000
COPY . .
EXPOSE 3000

# Comando para levantar la aplicación (ajusta según tu framework: npm start, npm run web, etc.)
CMD ["npm", "start"]
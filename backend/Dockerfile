# Use Node.js runtime
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose port
ENV PORT=8080

# Start app
CMD ["node", "server.js"]
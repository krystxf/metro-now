# Base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app


COPY package.json pnpm-lock.yaml ./
 

# Install app dependencies
RUN npm install -g pnpm
RUN pnpm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN pnpm run build

# Expose the port on which the app will run
EXPOSE 3001

# Start the server using the production build
CMD ["npm", "run", "start:prod"]

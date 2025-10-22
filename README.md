# Simple Backend for Chat Demo

This repository contains a minimal Node.js backend that demonstrates how to set up
a basic Express server with Socket.IO for real‑time communication. The goal is
to provide a working starting point that you can deploy to a platform like
Render or combine with a front‑end built with Astro, React, and Tailwind.

## Features

- **Express server**: Provides REST API endpoints and serves as the foundation for
  your backend.
- **Socket.IO integration**: Allows real‑time bidirectional communication for
  chat or other interactive features.
- **Health check**: The root endpoint (`/`) returns a JSON response so you can
  quickly verify the server is running.
- **Example API endpoint**: The `/api/greet/:name` route demonstrates how to
  accept parameters and return JSON.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the server**

   ```bash
   npm start
   ```

   The server listens on the port defined by the `PORT` environment variable or
   defaults to `3000` if not set. Once running, you can visit
   `http://localhost:3000/` to see the health check response.

3. **Using Socket.IO**

   Connect to the server using the Socket.IO client library:

   ```javascript
   const socket = io('http://localhost:3000');
   socket.on('welcome', (data) => {
     console.log(data.message);
   });
   socket.on('chat message', (msg) => {
     console.log('New chat message:', msg);
   });
   // To send a chat message
   socket.emit('chat message', { user: 'You', content: 'Hello everyone!' });
   ```

## Deployment on Render

To deploy this backend on [Render](https://render.com), follow these general
steps:

1. **Create a new Web Service**
2. **Connect your GitHub repository** (after pushing this code)
3. **Set environment variables** (if needed)
4. **Define the start command**: `npm start`

Render will install your dependencies, start your server, and provide a public
URL for your backend. You can also add a PostgreSQL database on Render and
connect it using the `pg` library if required.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

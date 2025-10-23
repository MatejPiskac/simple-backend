import jwt from 'jsonwebtoken';

export function configureSocket(io) {
  io.use((socket, next) => {
    try {
      const cookies = Object.fromEntries(
        (socket.handshake.headers.cookie || '')
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => {
            const idx = c.indexOf('=');
            return [decodeURIComponent(c.slice(0, idx)), decodeURIComponent(c.slice(idx + 1))];
          })
      );
      const header = socket.handshake.auth?.token || socket.handshake.headers.authorization;
      const bearer = typeof header === 'string' ? header.replace('Bearer ', '') : undefined;
      const token = cookies.token || bearer;
      if (!token) return next(new Error('Unauthorized'));
      const secret = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      return next();
    } catch (e) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.emit('welcome', { message: `Welcome ${socket.user?.email || 'user'}!` });
    socket.on('chat message', (msg) => {
      const payload = { ...msg, username: socket.user?.email || msg.username };
      io.emit('chat message', payload);
    });
  });
}


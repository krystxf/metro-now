const getUsernameFromCookies = (cookies: string | null) => {
  if (!cookies) return "Anonymous";

  var regex = /username=([^;]+)/;
  var match = regex.exec(cookies);

  if (!match) return "Anonymous";

  return match[1];
};

const server = Bun.serve<{ username: string }>({
  fetch(req, server) {
    const cookies = req.headers.get("cookie");
    const username = getUsernameFromCookies(cookies);
    const success = server.upgrade(req, { data: { username } });

    if (success) {
      console.log(`User ${username} connected`);
      return undefined;
    }

    return new Response("Hello world");
  },
  websocket: {
    open(ws) {
      const msg = `${ws.data.username} has entered the chat`;
      ws.subscribe("the-group-chat");
      server.publish("the-group-chat", msg);
    },
    message(ws, message) {
      // the server re-broadcasts incoming messages to everyone
      server.publish("the-group-chat", `${ws.data.username}: ${message}`);
    },
    close(ws) {
      const msg = `${ws.data.username} has left the chat`;
      server.publish("the-group-chat", msg);
      ws.unsubscribe("the-group-chat");
    },
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);

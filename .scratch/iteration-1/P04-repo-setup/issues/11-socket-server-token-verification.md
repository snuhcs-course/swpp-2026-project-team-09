# 11: Socket server recognises a User by access token

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Socket server skeleton), 06 (Sign in with an SNU Google account)

## What to build

The socket server verifies a User's access token by itself, without calling the main server. When the app opens a Socket.IO connection with a valid access token, the socket server accepts it and knows which User it belongs to. A connection with a missing or invalid token is refused.

The socket server is the only other server that accepts connections from Users: the app never calls the match or worker server (P08). Placing a connection in the User's room and pushing messages belong to P08.

## Acceptance criteria

- [ ] The socket server accepts Socket.IO connections.
- [ ] A connection with a valid access token is accepted and associated with its User.
- [ ] A connection with a missing, expired or altered token, or a token signed with another key, is refused.
- [ ] Verification uses only the main server's public key, given as a setting. The socket server makes no request to the main server to verify a token.
- [ ] The public key setting is validated at startup and listed in the example settings file.
- [ ] Tests open a socket connection as the app would. They use tokens signed with a test key pair and cover acceptance of a valid token and refusal of each invalid case.

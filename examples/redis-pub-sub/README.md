# Redis Pub/Sub Example

## Usage instructions

Start Redis with Docker

```bash
docker run -p "6379:6379" redis:7.0.2
```

Start two server instances running on different ports

```bash
PORT=4000 yarn --filter example-redis-pub-sub start
PORT=4001 yarn --filter example-redis-pub-sub start
```

Visit and set up the subscription by pressing the Play button.

```bash
http://127.0.0.1:4000/graphql?query=subscription+%7B%0A++message%0A%7D
```

Visit and execute the mutation by pressing the Play button.

```bash
http://127.0.0.1:4001/graphql?query=mutation+%7B%0A++sendMessage%28message%3A+%22Yo+we+share+a+redis+instance.%22%29%0A%7D
```

See your subscription update appear on `127.0.0.1:4000`, even though you executed the mutation on a
different Node.js server instance running on `127.0.0.1:4001`.

The magic of Redis. 🪄✨

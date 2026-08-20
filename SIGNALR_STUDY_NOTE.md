# ASP.NET Core + SignalR Study Note

This project is a small ASP.NET Core app used to learn the basics before adding SignalR.

## What I built so far

- An empty ASP.NET Core app created with `dotnet new web`
- Static files served from `wwwroot`
- A simple page in `wwwroot/index.html`
- Separate styling in `wwwroot/site.css`
- Local client-side behavior in `wwwroot/site.js`

## Current server setup

`Program.cs` is minimal:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.Run();
```

`UseDefaultFiles()` lets `/` map to `wwwroot/index.html`.
`UseStaticFiles()` serves files like `/site.css` and `/site.js` from `wwwroot`.

## Current page structure

`wwwroot/index.html` includes:

- a stylesheet link for `site.css`
- a script tag for `site.js`
- a form with username, message, and send button
- a message list placeholder

The important part is that external CSS and JavaScript are linked with:

```html
<link rel="stylesheet" href="site.css">
<script src="site.js"></script>
```

## How to verify static files are loaded

### Check `site.css`

- Open browser DevTools
- Go to the `Network` tab
- Reload the page
- Look for `site.css`

If it is loaded correctly, expect:

- status `200`
- content type `text/css`
- the file to appear in the stylesheet requests list

You can also open this directly in the browser:

```text
http://localhost:<port>/site.css
```

If that URL returns the CSS file, static file serving is working.

### Check in the Elements panel

- Inspect an element on the page
- Look in the `Styles` panel
- Confirm rules are coming from `site.css`

## Do CSS changes require a restart?

Usually no.

For static CSS files, a restart is not normally needed. Refresh the browser instead.

If the browser keeps showing old styles:

- do a hard refresh with `Ctrl+Shift+R`
- check that the file was saved
- check that the page still links to `site.css`

## How local JavaScript is loaded

Put JavaScript in a separate file in `wwwroot`, for example `site.js`, then reference it from `index.html`.

Example pattern:

```javascript
const button = document.getElementById('myButton')
const title = document.getElementById('title')

button.addEventListener('click', () => {
  title.textContent = 'Button clicked'
})
```

Keep the `<script>` tag near the end of `<body>` so the DOM exists before the script runs.

## Do you need to put `site.css` inside `<style>`?

No.

- `<style>` is for inline CSS
- `<link rel="stylesheet" href="site.css">` loads the external file

## Practical development loop

1. Edit `index.html`, `site.css`, or `site.js`
2. Refresh the browser
3. Hard refresh if cached content does not update
4. Restart the app only when you change server-side code

## Next SignalR learning step

Once the static page is working, the next useful step is:

- add SignalR to the server
- add the SignalR client in `site.js`
- connect the send button to a hub method
- display incoming messages in `#messages`

That gives you a basic chat app and introduces the core SignalR flow:

- browser client
- hub connection
- server broadcast

## Breakdown: `Hubs/ChatHub.cs`

```csharp
using Microsoft.AspNetCore.SignalR;

namespace SignalR.Hubs;

public class ChatHub : Hub
{
	public async Task SendMessage(string user, string message)
	{
		await Clients.All.SendAsync("ReceiveMessage", user, message);
	}
}
```

Line by line:

- `using Microsoft.AspNetCore.SignalR` — gives access to the `Hub` base class and the `Clients` API.
- `namespace SignalR.Hubs` — folder name becomes the namespace. `Program.cs` uses `using SignalR.Hubs;` to find the class.
- `public class ChatHub : Hub` — `: Hub` turns this into a server-side endpoint for this connection type. The `Hub` base class provides `Clients`.
- `public async Task SendMessage(string user, string message)` — any `public` method is callable by the client via `connection.invoke('SendMessage', user, message)`. Non-public methods are not callable. The name maps directly to the JS invoke string.
- `await Clients.All.SendAsync("ReceiveMessage", user, message)` — the core magic:
  - `Clients.All` = every connected client (the group of all connections)
  - `SendAsync("ReceiveMessage", ...)` = invoke the `ReceiveMessage` handler on each client. The string name must match the JS `connection.on('ReceiveMessage', ...)`
  - `await` = the broadcast is async; returning a `Task` lets the connection know when the send finished

Flow map:

```text
browser A ──invoke("SendMessage","jo","hi")──▶ ChatHub.SendMessage
                                                   │
                                                   ▼ Clients.All.SendAsync("ReceiveMessage","jo","hi")
browser A ◀──on('ReceiveMessage')──────┘
browser B ◀──on('ReceiveMessage')───────┘   (both get it)
```

Three touch points whose names must align:

| Name | Server (Hub) | Client (site.js) |
|---|---|---|
| method | `SendMessage` | `invoke('SendMessage')` |
| broadcast target | `"ReceiveMessage"` | `on('ReceiveMessage')` |

Note: a Hub instance is **per-invocation** — stateless. Each call gets a new instance. Long-lived state (who is connected) needs `ConnectionId`, `Groups`, or `OnConnectedAsync`. That is the next study step.

## Breakdown: `wwwroot/site.js`

```javascript
const connection = new signalR.HubConnectionBuilder()
	.withUrl("/chatHub")
	.configureLogging(signalR.LogLevel.Information)
	.build()

const form = document.getElementById('message-form')
const username = document.getElementById('username')
const message = document.getElementById('message')
const messages = document.getElementById('messages')

connection.on('ReceiveMessage', (user, text) => {
	const li = document.createElement('li')
	li.textContent = `${user}: ${text}`
	messages.appendChild(li)
})

form.addEventListener('submit', async (e) => {
	e.preventDefault()
	await connection.invoke('SendMessage', username.value, message.value)
	message.value = ''
})

connection.start().catch((err) => console.error(err))
```

Lines 1-4 — connection setup (chainable builder):

- `new signalR.HubConnectionBuilder()` — the `signalR` global comes from the `signalr.min.js` script tag. Builder pattern: configure, then build.
- `.withUrl("/chatHub")` — the WebSocket/SSE endpoint. Must match `app.MapHub<ChatHub>("/chatHub")` exactly.
- `.configureLogging(signalR.LogLevel.Information)` — log level to the DevTools console. Info shows reconnects and connection state changes, which helps debugging.
- `.build()` — freezes the config and returns the connection object (not started yet).

Lines 6-9 — plain DOM element references.

Lines 11-15 — receive side (`.on`):

- `connection.on('ReceiveMessage', (user, text) => ...)` — registers a handler for the broadcast named `"ReceiveMessage"`, which must match the server's `SendAsync("ReceiveMessage", ...)`. It runs whenever the server pushes a message.
- Builds a `<li>` and appends it to the `<ul>`. No page reload — that is the real-time part.

Lines 17-21 — send side (form submit):

- The `submit` event is used instead of `click`, so Enter works too. The handler is `async` because `invoke` returns a Promise.
- `e.preventDefault()` stops the browser's default page-reload (form POST).
- `await connection.invoke('SendMessage', username.value, message.value)` sends to the server. Method name + args map to the hub's `SendMessage(user, message)`.
- `message.value = ''` clears the input only after the send succeeds.

Line 23 — start (the actual connect):

- `connection.start()` initiates the handshake (negotiate then WebSocket) and returns a Promise. `.catch(...)` shows errors instead of leaving a silently dead page.

Key mental model:

| Direction | Client code | Server code |
|---|---|---|
| send | `invoke('SendMessage', ...)` | `SendMessage(user, message)` method |
| receive | `on('ReceiveMessage', ...)` | `SendAsync("ReceiveMessage", ...)` |

Gotchas:

- Order matters: call `.on()` **before** `.start()`, otherwise early broadcasts are missed.
- If `.start()` fails the connection is dead silently — that is why `.catch` exists.
- `invoke` waits for the server method to finish; `send` is fire-and-forget.
- Register handlers before `start()` resolves to avoid race conditions.

## Known startup detail from earlier

The project initially hit a `.NET 10` runtime/prune metadata issue during restore/build. The app was still usable after adding:

```bash
dotnet run -p:AllowMissingPrunePackageData=true
```

If that issue comes back, the project may need a more permanent SDK/runtime fix later.

## Lifecycle & Groups (next step, done)

Hub instance is still **per-invocation / stateless**. Lifecycle hooks run once per connection, not per call.

### `OnConnectedAsync` / `OnDisconnectedAsync`

```csharp
public override async Task OnConnectedAsync()
{
	await Clients.Others.SendAsync("SystemMessage", $"{Context.ConnectionId} connected");
	await base.OnConnectedAsync();
}
```

- Run once per connection connect/disconnect.
- `Context.ConnectionId` — opaque, unique per connection, regenerated each connect. Not a permanent identity.
- `base.OnConnectedAsync()` — required; lets SignalR finish setup.

### Groups

```csharp
await Groups.AddToGroupAsync(Context.ConnectionId, group);       // join
await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);  // leave
await Clients.Group(group).SendAsync("ReceiveMessage", user, message);  // broadcast to one group
```

- Groups live while the connection lives. On disconnect the server auto-removes the connection from all groups — no manual cleanup.
- `Clients.Group(...)` targets only members, unlike `Clients.All`.

### Client selector table

| Selector | Meaning |
|---|---|
| `Clients.All` | every connection |
| `Clients.Others` | all except caller |
| `Clients.Caller` | only caller |
| `Clients.Group("name")` | only group members |
| `Clients.Client(id)` | one connection by id |

### State gotcha

Any counter/tracker (e.g. online users) cannot live in a hub field — hub is destroyed per invocation. Needs a singleton service injected via DI.

### New touch points (names must align)

| Action | Server | Client |
|---|---|---|
| join | `JoinGroup(string group)` | `invoke('JoinGroup', g)` |
| leave | `LeaveGroup(string group)` | `invoke('LeaveGroup', g)` |
| group send | `SendToGroup(group, user, msg)` | `invoke('SendToGroup', ...)` |
| system msg | `SendAsync("SystemMessage", ...)` | `on('SystemMessage', ...)` |

### UI: `#send-to-group` checkbox

- Checked + group name present → invokes `SendToGroup`, only group members receive.
- Unchecked → `SendMessage`, everyone receives.

## Planned next study steps

### 1. `LeaveGroup` on the UI trigger (gap in current app)

Server method already exists:

```csharp
public async Task LeaveGroup(string group)
{
	await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
	await Clients.Group(group).SendAsync("SystemMessage", $"{Context.ConnectionId} left {group}");
}
```

But nothing in `site.js` calls it. To wire it up:

```javascript
// site.js — new button handler
const leaveForm = document.getElementById('leave-form')  // or a toggle button
leaveForm.addEventListener('submit', async (e) => {
	e.preventDefault()
	const g = groupName.value.trim()
	if (!g) return
	await connection.invoke('LeaveGroup', g)
})
```

```html
<!-- index.html — add a Leave button next to Join Group -->
<button id="leave-btn" type="button">Leave Group</button>
```

```javascript
document.getElementById('leave-btn').addEventListener('click', async () => {
	const g = groupName.value.trim()
	if (!g) return
	await connection.invoke('LeaveGroup', g)
})
```

Touch point: server `LeaveGroup(string group)` ↔ client `invoke('LeaveGroup', g)`.

### 2. State via DI

Problem recap: hub is per-invocation. A counter in a hub field resets on every call. Long-lived state must live in a singleton service, injected into the hub constructor.

```csharp
// Services/UserTracker.cs
public class UserTracker
{
	private readonly HashSet<string> _connections = new();
	public int Count => _connections.Count;
	public bool Add(string id) => _connections.Add(id);
	public bool Remove(string id) => _connections.Remove(id);
}
```

Register as singleton in `Program.cs`:

```csharp
builder.Services.AddSingleton<UserTracker>();
```

Inject into the hub:

```csharp
public class ChatHub : Hub
{
	private readonly UserTracker _tracker;

	public ChatHub(UserTracker tracker) => _tracker = tracker;

	public override async Task OnConnectedAsync()
	{
		_tracker.Add(Context.ConnectionId);
		await Clients.All.SendAsync("UserCount", _tracker.Count);  // push count to everyone
		await base.OnConnectedAsync();
	}

	public override async Task OnDisconnectedAsync(Exception? exception)
	{
		_tracker.Remove(Context.ConnectionId);
		await Clients.All.SendAsync("UserCount", _tracker.Count);
		await base.OnDisconnectedAsync(exception);
	}
}
```

Client side:

```javascript
connection.on('UserCount', (count) => {
	document.getElementById('online-count').textContent = count
})
```

Key points:

- Singleton + `lock` or concurrent collections needed if the tracker mutates concurrently. `HashSet` from two hub invocations on different threads = race → use `ConcurrentDictionary` or `lock`.
- A method like `GetOnlineCount()` can also be invoked directly by the client (`invoke('GetOnlineCount')` returns a value back).

Push-outside-a-hub pattern: to update the UI from non-hub code (a background service, a controller), inject `IHubContext<ChatHub>`:

```csharp
public class SomeService
{
	private readonly IHubContext<ChatHub> _hub;
	public SomeService(IHubContext<ChatHub> hub) => _hub = hub;

	public async Task Notify(string msg) =>
		await _hub.Clients.All.SendAsync("SystemMessage", msg);
}
```

`IHubContext` has no request/connection context — only `Clients`, `Groups`, `Context` info via user/connection. That is the trade-off.

### 3. Connection resilience

Current `site.js` starts once with a raw catch:

```javascript
connection.start().catch((err) => console.error(err))
```

If the network blips, the connection dies and never returns. Add auto-reconnect and lifecycle events.

```javascript
const connection = new signalR.HubConnectionBuilder()
	.withUrl("/chatHub")
	.withAutomaticReconnect()                       // retry: 0s, 2s, 10s, 30s then stop
	.configureLogging(signalR.LogLevel.Information)
	.build()

connection.onreconnecting((err) => {
	console.log('reconnecting', err)
	// show status: "Reconnecting..."
})

connection.onreconnected((connectionId) => {
	console.log('reconnected', connectionId)
	// show status: "Connected"
})

connection.onclose(() => {
	console.log('connection closed')
	// show status: "Disconnected"
})

connection.start()
	.then(() => console.log('connected'))
	.catch((err) => console.error(err))
```

Gotchas:

- `.withAutomaticReconnect()` — takes an optional array of delays in ms, default `[0, 2000, 10000, 30000]`. After the last attempt it gives up and fires `onclose`.
- `onreconnected` receives the new `connectionId` — it changes after reconnect. Do not treat it as identity (matches the opaque-ConnectionId note).
- Server state is lost on disconnect/reconnect: groups are auto-removed. If the app depends on group membership, the client must re-join after `onreconnected`.
- Custom reconnect: pass `IReconnectPolicy` on server or delays array on client.
- If `invoke` fails while reconnecting, it throws — guard sends with connection state check or retry.

### 4. Typed clients

Current code uses magic strings on both sides — a typo in `"ReceiveMessage"` fails silently at runtime. Typed hubs replace the string broadcast target with an interface method.

```csharp
// Hubs/IChatClient.cs
namespace SignalR.Hubs;

public interface IChatClient
{
	Task ReceiveMessage(string user, string message);
	Task SystemMessage(string text);
}
```

Hub implements the typed version:

```csharp
public class ChatHub : Hub<IChatClient>
{
	public override async Task OnConnectedAsync()
	{
		await Clients.Others.SystemMessage($"{Context.ConnectionId} connected");  // no SendAsync string
		await base.OnConnectedAsync();
	}

	public async Task SendMessage(string user, string message)
	{
		await Clients.All.ReceiveMessage(user, message);
	}
}
```

Key changes:

- `Hub<IChatClient>` — the interface replaces the magic broadcast target.
- `Clients.All.ReceiveMessage(...)` — compiler-checked call. A wrong method name = build error, not silent runtime failure.
- Client side is unchanged: still `connection.on('ReceiveMessage', ...)` — the JS handler name must match the interface method name.
- The interface only types the **server→client** direction. Client→server (`invoke`) still maps by method name on the hub class.

Trade-off: the JS side still has strings — typing only protects the server half. Interface methods must stay async-`Task`.

### Recommended order

1. Wire `LeaveGroup` button (small, closes a gap)
2. State via DI (fills statelessness hole, teaches DI + `IHubContext`)
3. Typed clients (kills magic strings server-side)
4. Connection resilience (robustness, works well with typed clients re-joining groups on reconnect)

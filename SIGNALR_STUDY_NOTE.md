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

## Known startup detail from earlier

The project initially hit a `.NET 10` runtime/prune metadata issue during restore/build. The app was still usable after adding:

```bash
dotnet run -p:AllowMissingPrunePackageData=true
```

If that issue comes back, the project may need a more permanent SDK/runtime fix later.

using Microsoft.AspNetCore.SignalR;

namespace SignalR.Hubs;

public class ChatHub : Hub
{
	public async Task SendMessage(string user, string message)
	{
		Console.WriteLine($"[chat] {user}: {message}");
		await Clients.All.SendAsync("ReceiveMessage", user, message);
	}
}

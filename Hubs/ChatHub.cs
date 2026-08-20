using Microsoft.AspNetCore.SignalR;

namespace SignalR.Hubs;

public class ChatHub : Hub
{
	public override async Task OnConnectedAsync()
	{
		await Clients.Others.SendAsync("SystemMessage", $"{Context.ConnectionId} connected");
		await base.OnConnectedAsync();
	}

	public override async Task OnDisconnectedAsync(Exception? exception)
	{
		await Clients.Others.SendAsync("SystemMessage", $"{Context.ConnectionId} disconnected");
		await base.OnDisconnectedAsync(exception);
	}

	public async Task JoinGroup(string group)
	{
		await Groups.AddToGroupAsync(Context.ConnectionId, group);
		await Clients.Group(group).SendAsync("SystemMessage", $"{Context.ConnectionId} joined {group}");
	}

	public async Task LeaveGroup(string group)
	{
		await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
		await Clients.Group(group).SendAsync("SystemMessage", $"{Context.ConnectionId} left {group}");
	}

	public async Task SendToGroup(string group, string user, string message)
	{
		await Clients.Group(group).SendAsync("ReceiveMessage", user, message);
	}

	public async Task SendMessage(string user, string message)
	{
		await Clients.All.SendAsync("ReceiveMessage", user, message);
	}
}

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

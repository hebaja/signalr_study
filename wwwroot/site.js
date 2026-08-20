const connection = new signalR.HubConnectionBuilder()
	.withUrl("/chatHub")
	.configureLogging(signalR.LogLevel.Information)
	.build()

const form = document.getElementById('message-form')
const username = document.getElementById('username')
const message = document.getElementById('message')
const messages = document.getElementById('messages')

const groupForm = document.getElementById('group-form')
const groupName = document.getElementById('group-name')
const sendToGroup = document.getElementById('send-to-group')

connection.on('ReceiveMessage', (user, text) => {
	append(`${user}: ${text}`)
})

connection.on('SystemMessage', (text) => {
	append(`[system] ${text}`)
})

function append(text) {
	const li = document.createElement('li')
	li.textContent = text
	messages.appendChild(li)
}

form.addEventListener('submit', async (e) => {
	e.preventDefault()
	if (sendToGroup.checked && groupName.value.trim()) {
		await connection.invoke('SendToGroup', groupName.value.trim(), username.value, message.value)
	} else {
		await connection.invoke('SendMessage', username.value, message.value)
	}
	message.value = ''
})

groupForm.addEventListener('submit', async (e) => {
	e.preventDefault()
	const g = groupName.value.trim()
	if (!g) return
	await connection.invoke('JoinGroup', g)
})

connection.start().catch((err) => console.error(err))

const button = document.getElementById('myButton')
const title = document.getElementById('title')

button.addEventListener('click', () => {
	title.textContent = 'Button clicked'
})

const form = document.getElementById('form')

form.addEventListener('submit', async function (event) {
  event.preventDefault()

  const data = {
    name: form.elements[0].value,
    id: form.elements[1].value, 
    password: form.elements[2].value,
    confirmPassword: form.elements[3].value,
    userType: document.querySelector('input[name="userType"]:checked').value, 
  }

  try {
    const response = await fetch('http://localhost:3000/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 
      },
      body: JSON.stringify(data), 
    })

    const responseData = await response.json()

    alert(`${responseData.message}`)

    if (!response.ok) {
      return
    }

    window.location.href = 'login.html'
  } catch (error) {
    console.error('Failed to sign up:', error)
    alert('회원가입 중 문제가 발생하였습니다. 다시 시도해 주세요.')
  }
})
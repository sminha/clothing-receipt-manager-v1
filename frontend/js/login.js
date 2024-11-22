const form = document.getElementById('form')

form.addEventListener('submit', async function (event) {
  event.preventDefault() 

  const data = {
    id: form.elements[0].value, 
    password: form.elements[1].value, 
  }

  try {
    const response = await fetch('http://localhost:3000/api/login', {
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

    if (responseData.token) {
      localStorage.setItem('token', responseData.token)
    }

    window.location.href = 'mypage.html' 
  } catch (error) {
    console.error('Failed to login:', error)
    alert('로그인 중 문제가 발생하였습니다. 다시 시도해 주세요.')
  }
})
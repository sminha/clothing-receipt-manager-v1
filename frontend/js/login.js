const form = document.getElementById('form')

form.addEventListener('submit', async function (event) {
  event.preventDefault() 

  const userType = document.querySelector('input[name="userType"]:checked');
  
  if (!userType) {
    alert('도매 또는 소매를 선택하세요.');
    return;
  }

  const data = {
    userType: userType.id,
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

    if (userType.id === 'retail') {
      window.location.href = 'mypage.html'; 
    } else {
      window.location.href = 'chat.html'; 
    }
  } catch (error) {
    console.error('Failed to login:', error)
    alert('로그인 중 문제가 발생하였습니다. 다시 시도해 주세요.')
  }
})
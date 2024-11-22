const logout = document.getElementById('logout')

logout.addEventListener('click', async function (event) {
  event.preventDefault()

  const token = localStorage.getItem('token')

  if (!token) {
    return alert('로그인이 되어 있지 않습니다.')
  }

  try {
    const response = await fetch('http://localhost:3000/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const responseData = await response.json()

    alert(`${responseData.message}`)

    if (!response.ok) {
      return
    }

    localStorage.removeItem('token')
    window.location.href = 'index.html'
  } catch (error) {
    console.error('Failed to logout:', error)
    alert('로그아웃 중 문제가 발생하였습니다. 다시 시도해 주세요.')
  }
})
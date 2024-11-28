document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('http://localhost:3000/api/mypage', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('마이페이지 데이터를 가져오는 데 실패했습니다.');
    }

    const data = await response.json();
    const { retailName, orders } = data;

    const textDiv = document.getElementById('text');
    textDiv.innerHTML = `<span>${retailName}님, 안녕하세요!</span>`;

    totalItems = orders.length; 
    window.allOrders = orders; 

    renderPaginationList(); 
    updatePage(); 
  } catch (error) {
    console.error(error.message);
    alert('마이페이지 데이터를 불러올 수 없습니다.');
    window.location.href = 'index.html' 
  }
});

const filterOrders = () => {
  const searchReservedCheckbox = document.getElementById('searchReserved');
  const searchFilter = document.getElementById('searchFilter').value;
  const searchBox = document.getElementById('searchBox').value.toLowerCase();

  const filteredOrders = window.allOrders.filter(order => {
    const isReserved = !searchReservedCheckbox.checked || order.totalReserved >= 1;
    const isSearchMatch = searchFilter === 'store' ?
      order.supplierName.toLowerCase().includes(searchBox) : 
      order.productName.toLowerCase().includes(searchBox);

    return isReserved && isSearchMatch;
  });

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIdx, endIdx);

  const tbody = document.querySelector('#content tbody');
  tbody.innerHTML = ''; 

  paginatedOrders.forEach((order, index) => {
    const formattedDate = new Date(order.purchaseDate).toLocaleDateString('ko-KR');
    const row = `
      <tr>
        <td>
          <a href="view-purchase.html?purchaseId=${order.purchaseId}" id="no-link">
            ${startIdx + index + 1}
          </a>
        </td> 
        <td>${order.supplierName}</td>
        <td>${formattedDate}</td>
        <td>${order.totalProducts}</td>
        <td>${order.totalQuantity}</td>
        <td>${order.totalPrice.toLocaleString()}</td>
        <td>${order.totalReserved}</td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

};

document.getElementById('searchReserved').addEventListener('change', updatePage);
document.getElementById('searchBox').addEventListener('input', updatePage);
document.getElementById('searchFilter').addEventListener('change', updatePage);

let totalItems = 0;
const itemsPerPage = 7;
const maxVisiblePages = 5;
let currentPage = 1;

function renderPaginationList() {
  const paginationList = document.getElementById('paginationList');

  paginationList.innerHTML = ''; 

  const totalPages = Math.ceil(totalItems / itemsPerPage); 
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  const prevButton = document.createElement('li');
  prevButton.innerHTML = `<a href="#">Prev</a>`;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updatePage();
    }
  });
  paginationList.appendChild(prevButton);

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('li');
    pageButton.innerHTML = `<a href="#">${i}</a>`;

    if (i === currentPage) {
      pageButton.classList.add('active');
    } else {
      pageButton.classList.remove('active');
    }

    pageButton.addEventListener('click', () => {
      currentPage = i;
      updatePage();
    });
    paginationList.appendChild(pageButton);
  }

  const nextButton = document.createElement('li');
  nextButton.innerHTML = `<a href="#">Next</a>`;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      updatePage();
    }
  });
  paginationList.appendChild(nextButton);
}

function updatePage() {
  renderPaginationList();
  filterOrders();
}

renderPaginationList();
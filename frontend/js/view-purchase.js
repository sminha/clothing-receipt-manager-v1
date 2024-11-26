document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const purchaseId = params.get('purchaseId');

  if (!purchaseId) {
    alert('유효하지 않은 요청입니다.');
    window.location.href = 'mypage.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/view-purchase/${purchaseId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('사입 내역을 불러올 수 없습니다.');
    }

    const data = await response.json();

    const formattedDate = new Date(data.purchaseDate).toISOString().split('T')[0];
    document.getElementById('purchase-date').value = formattedDate;
    document.getElementById('supplier-name').value = data.supplierName;

    const productsContainer = document.getElementById('products-container');
    let totalProducts = 0,
      totalQuantity = 0,
      totalPrice = 0,
      totalReserved = 0;

    data.products.forEach((product) => {
      totalProducts++;
      totalQuantity += product.quantity;
      const productTotalPrice = product.quantity * product.product_price;
      totalPrice += productTotalPrice;
      totalReserved += product.reserved_quantity;

      const productHTML = `
        <div class="product">
          <div class="form-row">
            <label for="product-name">상품명</label>
            <input type="text" class="product-name" value="${product.product_name}" readonly>
          </div>
          <div class="form-row">
            <label for="product-price">단가</label>
            <input type="text" class="product-price" value="${product.product_price}" readonly>
          </div>
          <div class="form-row">
            <label for="quantity">수량</label>
            <input type="text" class="quantity" value="${product.quantity}" readonly>
          </div>
          <div class="form-row">
            <label for="total-price">금액</label>
            <input type="text" class="total-price" value="${productTotalPrice}" readonly>
          </div>
          <div class="form-row">
            <label for="reserved-quantity">미송 수량</label>
            <input type="text" class="reserved-quantity" value="${product.reserved_quantity}" readonly>
          </div>
        </div
      `;
      productsContainer.insertAdjacentHTML('beforeend', productHTML);
    });

    const sumHTML = `
      <hr id="divider">
      <div id="sum">
        <div id="sum1"><span>합계</span></div>
        <div id="sum2"><span>${totalProducts}건</span></div>
        <div id="sum3"><span>${totalQuantity}개</span></div>
        <div id="sum4"><span>${totalPrice.toLocaleString()}원</span></div>
        <div id="sum5"><span>${totalReserved}개</span></div>
      </div>
    `;
    productsContainer.insertAdjacentHTML('beforeend', sumHTML);
  } catch (error) {
    console.error('Error fetching purchase details:', error.message);
    alert('데이터를 불러오는 중 오류가 발생했습니다.');
    window.location.href = 'mypage.html';
  }
});
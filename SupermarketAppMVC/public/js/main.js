// filepath: SupermarketAppMVC/public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
  const addToCartButtons = document.querySelectorAll('.add-to-cart');

  addToCartButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const productId = event.target.dataset.productId;
      const qty = document.querySelector(`#qty-${productId}`).value;

      fetch(`/add-to-cart/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qty }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Product added to cart!');
        } else {
          alert('Failed to add product to cart: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    });
  });

  const feedbackForm = document.querySelector('#feedback-form');
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(feedbackForm);

      fetch('/feedback', {
        method: 'POST',
        body: formData,
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Feedback submitted successfully!');
          feedbackForm.reset();
        } else {
          alert('Failed to submit feedback: ' + data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
    });
  }
});
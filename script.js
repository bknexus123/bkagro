document.addEventListener('DOMContentLoaded', function () {
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  var productCards = Array.from(document.querySelectorAll('.catalog-card'));

  function applyProductFilter(filter, activeButton) {
    filterButtons.forEach(function (button) {
      var isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    productCards.forEach(function (card) {
      var shouldHide = filter !== 'all' && card.dataset.category !== filter;
      card.hidden = shouldHide;
      card.classList.toggle('is-hidden', shouldHide);
    });
  }

  filterButtons.forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.addEventListener('click', function () {
      applyProductFilter(button.dataset.filter || 'all', button);
    });
  });

  var enquiryForm = document.getElementById('enquiry-form');
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('name').value.trim();
      var product = document.getElementById('product').value;
      var message = document.getElementById('message').value.trim();
      var text = 'আসসালামু আলাইকুম, আমি ' + name + '।\nপণ্য: ' + product + '\nবার্তা: ' + (message || 'বিস্তারিত জানতে চাই।');
      window.open('https://wa.me/8801873489708?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  }
});

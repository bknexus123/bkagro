document.getElementById('year').textContent = new Date().getFullYear();
document.querySelectorAll('.filter-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    var filter = button.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(function (item) { item.classList.toggle('active', item === button); });
    document.querySelectorAll('.catalog-card').forEach(function (card) {
      card.classList.toggle('is-hidden', filter !== 'all' && card.dataset.category !== filter);
    });
  });
});
document.getElementById('enquiry-form').addEventListener('submit', function (event) {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const product = document.getElementById('product').value;
  const message = document.getElementById('message').value.trim();
  const text = `আসসালামু আলাইকুম, আমি ${name}।\nপণ্য: ${product}\nবার্তা: ${message || 'বিস্তারিত জানতে চাই।'}`;
  window.open(`https://wa.me/8801873489708?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

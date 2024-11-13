function scrollToBottom() {
  setTimeout(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, 100);
}

document.addEventListener('DOMContentLoaded', function () {
  scrollToBottom();
});

const textarea = document.querySelector('textarea');
const form = document.querySelector('form');

textarea.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    textarea.readOnly = true;

    form.submit();
  }
});

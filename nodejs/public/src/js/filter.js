const input = document.querySelector('#filter-input');
const items = document.querySelectorAll('.filter-menu li')
const checkboxes = document.querySelectorAll('.filter-menu li input')

input.addEventListener('input', (e) => {
    const pattern = e.target.value.toLowerCase()
    for (var i = 0; i < items.length; i++) {
        var txtValue = items[i].textContent || items[i].innerText;
        if (txtValue.toLowerCase().indexOf(pattern) > -1) {
            items[i].style.display = "";
        } else {
            items[i].style.display = "none";
        }
    }
})

checkboxes.forEach(function(checkbox) {
    checkbox.addEventListener('change', function() {
        var li = this.parentElement;
        var ul = li.parentElement;
        if (this.checked) {
            ul.insertBefore(li, ul.firstChild);
        } else {
            ul.appendChild(li);
        }
    });
});
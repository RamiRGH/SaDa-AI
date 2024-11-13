document.addEventListener('DOMContentLoaded', function () {
  const uploader = document.querySelector('.uploader');
  const overlay = document.querySelector('.uploader .overlay');
  const closeBtn = document.querySelector('.uploader .close');
  const toggleUploader = document.querySelectorAll('.toggle-uploader');
  const dropzone = document.getElementById('dropzone');
  const step2 = document.querySelector('.step-2');
  const step3 = document.querySelector('.step-3');
  const uploadStatus = document.querySelector('.step-3 p');
  const confirmDetailsForm = document.getElementById('confirm-details-form');
  const hiddenFileInput = document.querySelector(
    '#confirm-details-form input[type="file"]'
  );

  const validFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'text/plain',
  ];

  function isValidFileType(file) {
    return validFileTypes.includes(file.type);
  }

  toggleUploader.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      uploader.classList.add('show');
    });
  });

  overlay.addEventListener('click', function () {
    uploader.classList.remove('show');
    dropzone.classList.remove('hide');
    step2.classList.remove('active');
    step3.classList.remove('active');
    step3.classList.remove('success');
    step3.classList.remove('error');
    uploadStatus.textContent = 'Your file is being processed. Please wait...';
    hiddenFileInput.value = '';
  });

  closeBtn.addEventListener('click', function (e) {
    e.preventDefault();
    uploader.classList.remove('show');
    dropzone.classList.remove('hide');
    step2.classList.remove('active');
    step3.classList.remove('active');
    step3.classList.remove('success');
    step3.classList.remove('error');
    uploadStatus.textContent = 'Your file is being processed. Please wait...';

    hiddenFileInput.value = '';
  });

  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropzone.classList.add('over');
    uploader.classList.add('show');
  });

  dropzone.addEventListener('dragleave', function () {
    dropzone.classList.remove('over');
  });

  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('over');
    const file = e.dataTransfer.files[0];
    if (isValidFileType(file)) {
      dropzone.classList.add('hide');
      document.querySelector('.uploader .error').classList.remove('show');
      step2.classList.add('active');
      hiddenFileInput.files = e.dataTransfer.files;
    } else {
      document.querySelector('.uploader .error').classList.add('show');
    }
  });

  dropzone.querySelector('button').addEventListener('click', function () {
    hiddenFileInput.click();
  });

  hiddenFileInput.addEventListener('change', function () {
    if (hiddenFileInput.files.length > 0) {
      const file = hiddenFileInput.files[0];
      if (isValidFileType(file)) {
        dropzone.classList.add('hide');
        document.querySelector('.uploader .error').classList.remove('show');
        step2.classList.add('active');
      } else {
        console.log('error');
        document.querySelector('.uploader .error').classList.add('show');
      }
    }
  });

  confirmDetailsForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(confirmDetailsForm);
    step2.classList.remove('active');
    step3.classList.add('active');
    const statusElement = document.querySelector('.step-3 p');

    axios
      .post('/api/upload', formData)
      .then(function (response) {
        setTimeout(() => {
          step3.classList.add('success');
          statusElement.textContent = 'File uploaded';
          if (window.location.pathname === '/') {
            updateTable(
              hiddenFileInput.files[0].name,
              formData.get('company-name'),
              formData.get('quarter'),
              formData.get('year'),
              new Date().toLocaleDateString()
            );
          }
        }, 1000);
      })
      .catch(function (error) {
        setTimeout(() => {
          step3.classList.add('error');
          statusElement.textContent = 'Error! Please try again';
        }, 1000);
      });
  });
  document.addEventListener('dragenter', function (e) {
    e.preventDefault();
    uploader.classList.add('show');
  });

  document.addEventListener('dragleave', function (e) {
    e.preventDefault();
    if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
      uploader.classList.remove('show');
      dropzone.classList.remove('hide');
      step2.classList.remove('active');
      step3.classList.remove('active');
      step3.classList.remove('success');
      step3.classList.remove('error');
      uploadStatus.textContent = 'Your file is being processed. Please wait...';
    }
  });

  document.addEventListener('dragend', function (e) {
    e.preventDefault();
    uploader.classList.remove('show');
    dropzone.classList.remove('hide');
    step2.classList.remove('active');
    step3.classList.remove('active');
    step3.classList.remove('success');
    step3.classList.remove('error');
    uploadStatus.textContent = 'Your file is being processed. Please wait...';
  });

  function updateTable(filename, companyName, quarter, year, uploadDate) {
    const filesContainer = document.querySelector('.files');
    const fileElement = document.createElement('div');
    fileElement.classList.add('file');

    fileElement.innerHTML = `
      <div class="name">${filename}</div>
      <div class="company">${companyName}</div>
      <div class="quarter">${quarter}</div>
      <div class="year">${year}</div>
      <div class="date">${uploadDate}</div>
      <div class="action">
        <a href="#" class="delete"><i class="ico ico-close"></i></a>
      </div>
    `;

    filesContainer.appendChild(fileElement);

    // remove .empty-table if it exists
    const emptyTable = document.querySelector('.empty-table');
    if (emptyTable) {
      emptyTable.remove();
    }
  }
});

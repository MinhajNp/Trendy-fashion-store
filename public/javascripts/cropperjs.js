var cropper;
var currentPreviewId;
var currentFileInput;

function getImagePreview(event, previewId) {
    var file = event.target.files[0];
    currentFileInput = event.target;
    var reader = new FileReader();
    reader.onload = function (e) {
        var image = document.createElement('img');
        image.id = 'image';
        image.src = e.target.result;
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        document.getElementById('imageContainer'+previewId).innerHTML = '';
        document.getElementById('imageContainer'+previewId).appendChild(image);

        currentPreviewId = previewId;

        // Initialize the Cropper
        if (cropper) {
            cropper.destroy();
        }
        cropper = new Cropper(image, {
            aspectRatio: 3/4,
            viewMode: 0,
            autoCropArea: 1,
            responsive: true
        });

        // Show crop button
        // document.getElementById('cropButton').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('cropButton').addEventListener('click', function () {
        if (cropper) {
            var canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400
            });

            canvas.toBlob(function (blob) {
                var url = URL.createObjectURL(blob);
                var preview = document.getElementById('preview' + currentPreviewId);
                preview.innerHTML = '<img src="' + url + '" alt="Cropped Image" class="img-fluid">';

                // Create a new file input with the cropped image blob
                var croppedFile = new File([blob], currentFileInput.files[0].name, { type: 'image/jpeg', lastModified: Date.now() });

                // Create a DataTransfer to simulate a file upload
                var dataTransfer = new DataTransfer();
                dataTransfer.items.add(croppedFile);

                // Replace the original file input with the new DataTransfer files
                currentFileInput.files = dataTransfer.files;

                // Destroy the cropper instance and hide the container
                cropper.destroy();
                cropper = null;
                document.getElementById('imageContainer'+currentPreviewId).innerHTML = '';
                // document.getElementById('cropButton').style.display = 'none';
            }, 'image/jpeg');
        }
    });
});


// var cropper;      
// var currentPreviewId;      //thse are already declared at top
// var currentFileInput;

function editImagePreview(event, previewId) {
    var file = event.target.files[0];
    currentFileInput = event.target;
    var reader = new FileReader();
    reader.onload = function (e) {
        var image = document.createElement('img');
        image.id = 'image';
        image.src = e.target.result;
        image.style.maxWidth = '100%';
        image.style.height = 'auto';
        document.getElementById('editImageContainer'+previewId).innerHTML = '';
        document.getElementById('editImageContainer'+previewId).appendChild(image);

        currentPreviewId = previewId;

        // Initialize the Cropper
        if (cropper) {
            cropper.destroy();
        }
        cropper = new Cropper(image, {
            aspectRatio: 3/4,
            viewMode: 0,
            autoCropArea: 1,
            responsive: true
        });

        // Show crop button
        //  document.getElementById('editCropButton').style.display="block";
    };
    reader.readAsDataURL(file);
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('editCropButton').addEventListener('click', function () {
        if (cropper) {
            var canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400
            });

            canvas.toBlob(function (blob) {
                var url = URL.createObjectURL(blob);
                var preview = document.getElementById(currentPreviewId+'preview');
                preview.innerHTML = '<img src="' + url + '" alt="Cropped Image" class="img-fluid">';

                // Create a new file input with the cropped image blob
                var croppedFile = new File([blob], currentFileInput.files[0].name, { type: 'image/jpeg', lastModified: Date.now() });

                // Create a DataTransfer to simulate a file upload
                var dataTransfer = new DataTransfer();
                dataTransfer.items.add(croppedFile);

                // Replace the original file input with the new DataTransfer files
                currentFileInput.files = dataTransfer.files;

                // Destroy the cropper instance and hide the container
                cropper.destroy();
                cropper = null;
                document.getElementById('editImageContainer'+currentPreviewId).innerHTML = '';
                // document.getElementById('cropButton').style.display = 'none';
            }, 'image/jpeg');
        }
    });
});


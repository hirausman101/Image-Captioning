const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const clearBtn = document.getElementById('clear-btn');
const predictBtn = document.getElementById('predict-btn');
const resultSection = document.getElementById('result-section');
const captionText = document.getElementById('caption-text');
const loader = document.querySelector('.loader');
const btnText = document.querySelector('.btn-text');

let selectedFile = null;

// Handle click to browse
dropZone.addEventListener('click', () => imageInput.click());

// Handle drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Handle file selection
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
    }
    
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
        dropZone.classList.add('hidden');
        predictBtn.disabled = false;
        resultSection.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// Clear selection
clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    imageInput.value = '';
    previewContainer.classList.add('hidden');
    dropZone.classList.remove('hidden');
    predictBtn.disabled = true;
    resultSection.classList.add('hidden');
});

// Run analysis
predictBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert(data.error);
        } else {
            showCaption(data.caption);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to analyze image. Make sure the backend is running.');
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    predictBtn.disabled = isLoading;
    if (isLoading) {
        loader.classList.remove('hidden');
        btnText.textContent = 'Analyzing...';
    } else {
        loader.classList.add('hidden');
        btnText.textContent = 'Analyze Actions';
    }
}

function showCaption(text) {
    captionText.textContent = text;
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

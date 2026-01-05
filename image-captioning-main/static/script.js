const dropZone = document.getElementById('drop-zone');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const clearBtn = document.getElementById('clear-btn');
const predictBtn = document.getElementById('predict-btn');
const resultSection = document.getElementById('result-section');
const captionText = document.getElementById('caption-text');
const sampleItems = document.querySelectorAll('.sample-item');

let selectedFile = null;
let selectedSamplePath = null;

// --- CONFIGURATION ---
// Set to your Hugging Face space URL for the live demo, e.g., 'https://user-space.hf.space'
// Leave as '' to use the local Flask backend
const API_URL = '';
const IS_HF = API_URL.includes('hf.space');

// Handle sample selection
sampleItems.forEach(item => {
    item.addEventListener('click', async () => {
        // UI updates
        sampleItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        selectedSamplePath = item.getAttribute('data-path');
        predictBtn.disabled = false;
        resultSection.classList.add('hidden');

        // Fetch the sample image to create a file object (so backend doesn't change)
        const response = await fetch(selectedSamplePath);
        const blob = await response.blob();
        selectedFile = new File([blob], selectedSamplePath.split('/').pop(), { type: blob.type });
    });
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
        let response;
        if (IS_HF) {
            // Handle Hugging Face (Gradio) API
            const base64 = await toBase64(selectedFile);
            response = await fetch(`${API_URL}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: [base64] })
            });
            const result = await response.json();
            showResult(result.data[0], result.data[1]);
        } else {
            // Handle local Flask API
            const formData = new FormData();
            formData.append('image', selectedFile);
            response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            showResult(data.caption, data.action);
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

function showResult(caption, action) {
    const actionBadge = document.getElementById('action-badge');
    actionBadge.textContent = action;
    captionText.textContent = caption;
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

// Utility to convert file to base64 for Gradio
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

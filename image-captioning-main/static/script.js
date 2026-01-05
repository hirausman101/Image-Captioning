const sampleItems = document.querySelectorAll('.sample-item');
const predictBtn = document.getElementById('predict-btn');
const resultSection = document.getElementById('result-section');
const imagePreview = document.getElementById('image-preview');
const previewContainer = document.getElementById('preview-container');
const captionText = document.getElementById('caption-text');
const loader = document.querySelector('.loader');
const btnText = document.querySelector('.btn-text');

let selectedSamplePath = null;

// --- PRE-CALCULATED RESULTS (Serverless Demo) ---
const SAMPLE_RESULTS = {
    'samples/basketball_dunk.png': {
        caption: "a basketball player is dunking a ball in a hoop",
        action: "Dunking"
    },
    'samples/running_dog.png': {
        caption: "a brown dog is running through the green grass",
        action: "Running"
    },
    'samples/sample1.jpg': {
        caption: "two people sit on dock at sunset",
        action: "Sit"
    }
};

// Handle sample selection
sampleItems.forEach(item => {
    item.addEventListener('click', () => {
        sampleItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        selectedSamplePath = item.getAttribute('data-path');
        imagePreview.src = selectedSamplePath;
        previewContainer.classList.remove('hidden');
        predictBtn.disabled = false;
        resultSection.classList.add('hidden');
    });
});

async function predict() {
    if (!selectedSamplePath) return;

    predictBtn.disabled = true;
    loader.classList.remove('hidden');
    btnText.style.opacity = '0.5';

    try {
        // Mock a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = SAMPLE_RESULTS[selectedSamplePath];

        if (result) {
            displayResult(result.caption, result.action);
        } else {
            throw new Error("Result not found");
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Analysis failed.');
    } finally {
        loader.classList.add('hidden');
        btnText.style.opacity = '1';
        predictBtn.disabled = false;
    }
}

function displayResult(caption, action) {
    resultSection.classList.remove('hidden');
    captionText.textContent = caption;
    document.getElementById('action-badge').textContent = action;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

predictBtn.addEventListener('click', predict);

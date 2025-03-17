let currentImage = null;
let net = null;
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loading');

// Initialize BodyPix model
async function initializeAI() {
    showLoading();
    try {
        net = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });
        console.log("AI Model loaded successfully");
    } catch (error) {
        console.error("Error loading AI model:", error);
        alert("AI Model failed to load. Please refresh the page.");
    }
    hideLoading();
}
initializeAI();

// Handle image upload
document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    showLoading();
    try {
        const img = await loadImage(file);
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        currentImage = img;
    } catch (error) {
        console.error("Image load error:", error);
        alert("Error loading image. Please try another file.");
    }
    hideLoading();
});

async function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Auto Enhance
async function autoEnhance() {
    if (!currentImage) return;
    
    showLoading();
    ctx.filter = 'contrast(115%) brightness(115%) saturate(120%)';
    ctx.drawImage(currentImage, 0, 0);
    hideLoading();
}

// Portrait Effect with Edge Detection
async function applyPortraitEffect() {
    if (!currentImage || !net) return;

    showLoading();
    try {
        // Detect human segmentation
        const segmentation = await net.segmentPerson(canvas, {
            internalResolution: 'high',
            segmentationThreshold: 0.7
        });

        // Create mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        bodyPix.drawMask(maskCanvas, canvas, segmentation, 0.7);

        // Apply blur to background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.filter = 'blur(12px)';
        tempCtx.drawImage(canvas, 0, 0);

        // Composite images
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
    } catch (error) {
        console.error("Portrait effect error:", error);
        alert("Error applying portrait effect. Please try again.");
    }
    hideLoading();
}

// Edge Detection
async function applyEdgeDetection() {
    if (!currentImage) return;

    showLoading();
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple edge detection algorithm
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale
            const avg = (r + g + b) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;
        }
        
        ctx.putImageData(imageData, 0, 0);
    } catch (error) {
        console.error("Edge detection error:", error);
    }
    hideLoading();
}

// Save image
function saveImage() {
    if (!currentImage) {
        alert("Please upload an image first!");
        return;
    }
    
    const link = document.createElement('a');
    link.download = `edited-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Utility functions
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Real-time adjustments
document.getElementById('brightness').addEventListener('input', function() {
    applyAdjustments();
});

document.getElementById('contrast').addEventListener('input', function() {
    applyAdjustments();
});

function applyAdjustments() {
    if (!currentImage) return;
    
    const brightness = document.getElementById('brightness').value;
    const contrast = document.getElementById('contrast').value;
    
    ctx.filter = `
        brightness(${100 + parseInt(brightness)}%)
        contrast(${100 + parseInt(contrast)}%)
    `;
    ctx.drawImage(currentImage, 0, 0);
}

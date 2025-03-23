// Global variables
let pdfDoc = null;
let originalFile = null;
let originalSize = 0;

// DOM elements
const uploadSection = document.getElementById('compress-upload-section');
const pdfUpload = document.getElementById('pdf-upload');
const uploadBtn = document.getElementById('upload-btn');
const compressionOptions = document.getElementById('compression-options');
const fileName = document.getElementById('file-name');
const originalSizeDisplay = document.getElementById('original-size');
const pageCount = document.getElementById('page-count');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('quality-value');
const compressBtn = document.getElementById('compress-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Event listeners
uploadBtn.addEventListener('click', () => pdfUpload.click());
pdfUpload.addEventListener('change', handleFileSelect);
qualitySlider.addEventListener('input', updateQualityValue);
compressBtn.addEventListener('click', compressPDF);
cancelBtn.addEventListener('click', resetInterface);

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const quality = parseInt(btn.dataset.quality);
        qualitySlider.value = quality;
        updateQualityValue();
    });
});

// Drag and drop handlers
uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('drag-over');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('drag-over');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        handleFile(file);
    }
});

// File handling
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    originalFile = file;
    originalSize = file.size;
    
    // Display file information
    fileName.textContent = file.name;
    originalSizeDisplay.textContent = formatFileSize(originalSize);
    
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        loadPDF(typedarray);
    };
    fileReader.readAsArrayBuffer(file);
}

// PDF loading and rendering
async function loadPDF(data) {
    try {
        pdfDoc = await pdfjsLib.getDocument(data).promise;
        pageCount.textContent = pdfDoc.numPages;
        
        // Show compression options
        uploadSection.style.display = 'none';
        compressionOptions.style.display = 'block';
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

// Quality slider
function updateQualityValue() {
    qualityValue.textContent = `${qualitySlider.value}%`;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Reset interface
function resetInterface() {
    uploadSection.style.display = 'flex';
    compressionOptions.style.display = 'none';
    pdfUpload.value = '';
    originalFile = null;
    pdfDoc = null;
    qualitySlider.value = 80;
    updateQualityValue();
}

// Compress PDF
async function compressPDF() {
    if (!pdfDoc) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const quality = qualitySlider.value / 100;
        let isFirstPage = true;

        // Show loading state
        compressBtn.disabled = true;
        compressBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Compressing...';

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            const imgData = canvas.toDataURL('image/jpeg', quality);

            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            doc.addImage(imgData, 'JPEG', 0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height);
        }

        // Save the compressed PDF
        doc.save('compressed.pdf');
        
        // Reset the interface
        resetInterface();
        
        // Show success message
        alert('PDF compressed successfully!');
    } catch (error) {
        console.error('Error compressing PDF:', error);
        alert('Error compressing PDF. Please try again.');
        compressBtn.disabled = false;
        compressBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Compress PDF';
    }
} 
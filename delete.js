// Global variables
let pdfDoc = null;
let selectedPages = new Set();
let originalFile = null;

// DOM elements
const uploadSection = document.getElementById('upload-section');
const pdfPreview = document.getElementById('pdf-preview');
const pageGrid = document.getElementById('page-grid');
const uploadBtn = document.getElementById('upload-btn');
const pdfUpload = document.getElementById('pdf-upload');
const deleteBtn = document.getElementById('delete-btn');
const clearBtn = document.getElementById('clear-btn');

// Event listeners
uploadBtn.addEventListener('click', () => pdfUpload.click());
pdfUpload.addEventListener('change', handleFileSelect);
clearBtn.addEventListener('click', clearSelection);

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
        uploadSection.style.display = 'none';
        pdfPreview.style.display = 'block';
        renderPages();
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

function renderPages() {
    pageGrid.innerHTML = '';
    selectedPages.clear();
    deleteBtn.disabled = true;

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const pageItem = document.createElement('div');
        pageItem.className = 'page-item';
        pageItem.dataset.pageNum = i;
        pageItem.innerHTML = `
            <canvas class="page-canvas"></canvas>
            <div class="page-number">Page ${i}</div>
        `;

        pageItem.addEventListener('click', () => togglePageSelection(i));
        pageGrid.appendChild(pageItem);

        renderPage(i, pageItem.querySelector('canvas'));
    }
}

async function renderPage(pageNum, canvas) {
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
        }).promise;
    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

// Page selection
function togglePageSelection(pageNum) {
    const pageItem = document.querySelector(`[data-page-num="${pageNum}"]`);
    if (selectedPages.has(pageNum)) {
        selectedPages.delete(pageNum);
        pageItem.classList.remove('selected');
    } else {
        selectedPages.add(pageNum);
        pageItem.classList.add('selected');
    }
    deleteBtn.disabled = selectedPages.size === 0;
}

function clearSelection() {
    selectedPages.clear();
    document.querySelectorAll('.page-item').forEach(item => {
        item.classList.remove('selected');
    });
    deleteBtn.disabled = true;
}

// Delete functionality
deleteBtn.addEventListener('click', async () => {
    if (selectedPages.size === 0) return;

    try {
        // Create a new PDF document
        const newPdfDoc = await PDFLib.PDFDocument.create();
        
        // Get all pages from the original PDF
        const pagesToKeep = [];
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            if (!selectedPages.has(i)) {
                pagesToKeep.push(i - 1); // PDF-Lib uses 0-based page indices
            }
        }

        // Copy the selected pages to the new document
        for (const pageNum of pagesToKeep) {
            const page = await pdfDoc.getPage(pageNum + 1);
            const viewport = page.getViewport({ scale: 1.0 });
            
            // Create a canvas to render the page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render the page to the canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Convert canvas to image
            const imageData = canvas.toDataURL('image/jpeg', 1.0);
            
            // Add the page to the new PDF
            const jpegImage = await newPdfDoc.embedJpg(imageData);
            const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
            newPage.drawImage(jpegImage, {
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height
            });
        }

        // Save the new PDF
        const newPdfBytes = await newPdfDoc.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = 'edited.pdf';
        link.click();
        
        URL.revokeObjectURL(url);
        
        // Reset the interface
        uploadSection.style.display = 'block';
        pdfPreview.style.display = 'none';
        pdfUpload.value = '';
        selectedPages.clear();
    } catch (error) {
        console.error('Error deleting pages:', error);
        alert('Error deleting pages. Please try again.');
    }
}); 
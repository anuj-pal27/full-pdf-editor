// Initialize variables
let pdfDoc = null;
let pageNum = 1;
let zoomScale = 1.0;
let currentPage = null;

// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing PDF viewer...');
    
    // Initialize file upload handlers
    initializeFileHandlers();
    
    // Initialize button handlers
    initializeButtonHandlers();
});

function initializeFileHandlers() {
    const uploadBtn = document.getElementById('upload-btn');
    const pdfUpload = document.getElementById('pdf-upload');
    const uploadSection = document.getElementById('upload-section');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => pdfUpload.click());
    }

    if (pdfUpload) {
        pdfUpload.addEventListener('change', handleFileSelect);
    }

    // Drag and drop handlers
    if (uploadSection) {
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
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        handleFile(file);
    }
}

function handleFile(file) {
    const fileReader = new FileReader();
    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);
        loadPDF(typedarray);
    };
    fileReader.readAsArrayBuffer(file);
}

async function loadPDF(data) {
    try {
        pdfDoc = await pdfjsLib.getDocument(data).promise;
        
        // Get required elements
        const uploadSection = document.getElementById('upload-section');
        const pdfContainer = document.getElementById('pdf-container');
        const pageCount = document.getElementById('page-count');
        
        // Check if elements exist before accessing them
        if (uploadSection) uploadSection.style.display = 'none';
        if (pdfContainer) pdfContainer.style.display = 'block';
        if (pageCount) pageCount.textContent = pdfDoc.numPages;
        
        // Render the first page
        await renderPage(pageNum);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

async function renderPage(num) {
    try {
        currentPage = await pdfDoc.getPage(num);
        const viewport = currentPage.getViewport({ scale: zoomScale });
        
        // Get the canvas element
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render PDF page
        await currentPage.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Get text content
        const textContent = await currentPage.getTextContent();
        
        // Create text layer div if it doesn't exist
        let textLayerDiv = document.getElementById('text-layer');
        if (!textLayerDiv) {
            textLayerDiv = document.createElement('div');
            textLayerDiv.setAttribute('id', 'text-layer');
            const pdfContainer = document.getElementById('pdf-container');
            if (pdfContainer) {
                pdfContainer.appendChild(textLayerDiv);
            }
        }
        
        // Clear previous text layer content
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.left = canvas.offsetLeft + 'px';
        textLayerDiv.style.top = canvas.offsetTop + 'px';
        textLayerDiv.style.height = canvas.height + 'px';
        textLayerDiv.style.width = canvas.width + 'px';

        // Render text layer
        pdfjsLib.renderTextLayer({
            textContent: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
        });

        // Update page number display
        const pageNumElement = document.getElementById('page-num');
        if (pageNumElement) {
            pageNumElement.textContent = num;
        }
        
    } catch (error) {
        console.error('Error rendering page:', error);
        alert('Error rendering page. Please try again.');
    }
}

function initializeButtonHandlers() {
    // Navigation buttons
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (pageNum > 1) {
                pageNum--;
                renderPage(pageNum);
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (pageNum < pdfDoc?.numPages) {
                pageNum++;
                renderPage(pageNum);
            }
        });
    }

    // Zoom buttons
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomScale *= 1.2;
            renderPage(pageNum);
        });
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomScale *= 0.8;
            renderPage(pageNum);
        });
    }
} 
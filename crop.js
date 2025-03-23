// Initialize variables
let pdfDoc = null;
let pageNum = 1;
let zoomScale = 1.0;
let fabricCanvas = null;
let cropRect = null;
let pdfPages = [];
let currentPage = null;
let cropOverlay = null;

// Initialize the canvas when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing canvas...');
    fabricCanvas = new fabric.Canvas('pdf-canvas', {
        width: 800,
        height: 1000,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true
    });

    // Initialize file upload handlers
    initializeFileHandlers();
    
    // Initialize button handlers
    initializeButtonHandlers();
});

// File handling functions
function initializeFileHandlers() {
    const uploadBtn = document.getElementById('upload-btn');
    const pdfUpload = document.getElementById('pdf-upload');
    const uploadSection = document.getElementById('upload-section');

    uploadBtn.addEventListener('click', () => pdfUpload.click());
    pdfUpload.addEventListener('change', handleFileSelect);

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

// PDF loading and rendering
async function loadPDF(data) {
    try {
        pdfDoc = await pdfjsLib.getDocument(data).promise;
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('pdf-container').style.display = 'block';
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        renderPage(pageNum);
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

async function renderPage(num) {
    try {
        currentPage = await pdfDoc.getPage(num);
        const viewport = currentPage.getViewport({ scale: zoomScale });
        
        // Set canvas dimensions
        fabricCanvas.setWidth(viewport.width);
        fabricCanvas.setHeight(viewport.height);
        
        // Clear existing content
        fabricCanvas.clear();
        
        // Create a temporary canvas for PDF rendering
        const pdfCanvas = document.createElement('canvas');
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        const pdfContext = pdfCanvas.getContext('2d', { willReadFrequently: true });
        
        // Render PDF page to temporary canvas
        await currentPage.render({
            canvasContext: pdfContext,
            viewport: viewport
        }).promise;
        
        // Convert the PDF page to a Fabric.js image
        fabric.Image.fromURL(pdfCanvas.toDataURL('image/jpeg', 1.0), function(img) {
            img.set({
                left: 0,
                top: 0,
                selectable: false,
                evented: false,
                scaleX: 1,
                scaleY: 1
            });
            fabricCanvas.add(img);
            fabricCanvas.sendToBack(img);
            
            // Create or update crop rectangle
            if (!cropRect) {
                initializeCropRect(viewport);
            } else {
                updateCropRect(viewport);
            }
            
            // Update page number display
            document.getElementById('page-num').textContent = num;
            
            fabricCanvas.renderAll();
        });
    } catch (error) {
        console.error('Error rendering page:', error);
        alert('Error rendering page. Please try again.');
    }
}

// Initialize crop rectangle
function initializeCropRect(viewport) {
    // Create semi-transparent overlay
    cropOverlay = new fabric.Rect({
        left: 0,
        top: 0,
        width: viewport.width,
        height: viewport.height,
        fill: 'rgba(0, 0, 0, 0.5)',
        selectable: false,
        evented: false
    });
    fabricCanvas.add(cropOverlay);

    // Create crop rectangle
    cropRect = new fabric.Rect({
        left: viewport.width * 0.1,
        top: viewport.height * 0.1,
        width: viewport.width * 0.8,
        height: viewport.height * 0.8,
        fill: 'transparent',
        stroke: '#2196F3',
        strokeWidth: 2,
        strokeUniform: true,
        hasRotatingPoint: false,
        transparentCorners: false,
        cornerColor: '#2196F3',
        cornerSize: 10,
        cornerStyle: 'circle',
        lockRotation: true
    });
    
    fabricCanvas.add(cropRect);
    fabricCanvas.setActiveObject(cropRect);

    // Update overlay on crop rectangle movement/resize
    cropRect.on('moving', updateOverlay);
    cropRect.on('scaling', updateOverlay);
    updateOverlay();
}

// Update crop rectangle on page change or zoom
function updateCropRect(viewport) {
    cropRect.set({
        left: viewport.width * 0.1,
        top: viewport.height * 0.1,
        width: viewport.width * 0.8,
        height: viewport.height * 0.8
    });

    cropOverlay.set({
        width: viewport.width,
        height: viewport.height
    });

    updateOverlay();
}

// Update overlay to show cropped area
function updateOverlay() {
    if (!cropRect || !cropOverlay) return;

    const rect = cropRect.getBoundingRect();
    const path = [
        'M 0 0',
        'H ' + fabricCanvas.width,
        'V ' + fabricCanvas.height,
        'H 0 Z',
        'M ' + rect.left + ' ' + rect.top,
        'H ' + (rect.left + rect.width),
        'V ' + (rect.top + rect.height),
        'H ' + rect.left + ' Z'
    ].join(' ');

    if (cropOverlay.path) {
        cropOverlay.set('path', path);
    } else {
        fabricCanvas.remove(cropOverlay);
        cropOverlay = new fabric.Path(path, {
            fill: 'rgba(0, 0, 0, 0.5)',
            selectable: false,
            evented: false
        });
        fabricCanvas.add(cropOverlay);
        fabricCanvas.sendToBack(cropOverlay);
    }

    fabricCanvas.renderAll();
}

// Button handlers
function initializeButtonHandlers() {
    // Navigation buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (pageNum > 1) {
            pageNum--;
            renderPage(pageNum);
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        if (pageNum < pdfDoc.numPages) {
            pageNum++;
            renderPage(pageNum);
        }
    });

    // Zoom buttons
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        zoomScale *= 1.2;
        renderPage(pageNum);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        zoomScale *= 0.8;
        renderPage(pageNum);
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        if (cropRect) {
            const viewport = currentPage.getViewport({ scale: zoomScale });
            cropRect.set({
                left: viewport.width * 0.1,
                top: viewport.height * 0.1,
                width: viewport.width * 0.8,
                height: viewport.height * 0.8
            });
            fabricCanvas.renderAll();
        }
    });

    // Apply crop button
    document.getElementById('apply-crop-btn').addEventListener('click', applyCrop);

    // Download button
    document.getElementById('download-btn').addEventListener('click', downloadCroppedPDF);
}

// Apply crop to PDF
async function applyCrop() {
    if (!cropRect || !currentPage) return;

    try {
        const viewport = currentPage.getViewport({ scale: 1.0 }); // Use scale 1.0 for PDF coordinates
        const rect = cropRect.getBoundingRect();
        
        // Convert coordinates from screen space to PDF space
        const cropBox = {
            x: (rect.left / fabricCanvas.width) * viewport.width,
            y: (rect.top / fabricCanvas.height) * viewport.height,
            width: (rect.width / fabricCanvas.width) * viewport.width,
            height: (rect.height / fabricCanvas.height) * viewport.height
        };

        // Store the cropped page data
        pdfPages[pageNum - 1] = {
            page: currentPage,
            cropBox: cropBox
        };

        alert('Crop applied! You can now download the cropped PDF.');
    } catch (error) {
        console.error('Error applying crop:', error);
        alert('Error applying crop. Please try again.');
    }
}

// Download cropped PDF
async function downloadCroppedPDF() {
    if (!pdfDoc || pdfPages.length === 0) return;

    try {
        // Create a new jsPDF instance with PDF dimensions
        const firstPage = pdfPages[0];
        if (!firstPage) return;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: firstPage.cropBox.width > firstPage.cropBox.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [firstPage.cropBox.width, firstPage.cropBox.height]
        });

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const pageData = pdfPages[i - 1];
            if (!pageData) continue;

            const page = pageData.page;
            const cropBox = pageData.cropBox;

            // Create a canvas for the cropped page
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            // Set canvas dimensions to crop box size
            canvas.width = cropBox.width;
            canvas.height = cropBox.height;

            // Get viewport for the crop box size
            const viewport = page.getViewport({
                scale: 1,
                offsetX: -cropBox.x,
                offsetY: -cropBox.y,
                width: cropBox.width,
                height: cropBox.height
            });

            // Render the cropped area
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            // Add the cropped page to the PDF
            if (i > 1) {
                pdf.addPage([cropBox.width, cropBox.height]);
            }

            // Add the image with proper dimensions
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', 0, 0, cropBox.width, cropBox.height);
        }

        // Download the PDF
        pdf.save('cropped.pdf');
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error creating PDF. Please try again.');
    }
} 
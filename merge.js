// Initialize variables
let pdfFiles = [];
let pdfDocs = [];

// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFileHandlers();
    initializeButtonHandlers();
});

// File handling functions
function initializeFileHandlers() {
    const uploadBtn = document.getElementById('upload-btn');
    const pdfUpload = document.getElementById('pdf-upload');
    const uploadSection = document.getElementById('upload-section');
    const pdfList = document.getElementById('pdf-list');

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
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) {
            handleFiles(files);
        }
    });
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    if (files.length > 0) {
        handleFiles(files);
    }
}

async function handleFiles(files) {
    try {
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            pdfFiles.push({
                name: file.name,
                size: formatFileSize(file.size),
                pages: pdfDoc.numPages,
                data: arrayBuffer
            });
            
            pdfDocs.push(pdfDoc);
        }
        
        updatePDFList();
        document.getElementById('pdf-list').style.display = 'block';
        document.getElementById('merge-btn').disabled = pdfFiles.length < 2;
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('Error loading PDF. Please try again.');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updatePDFList() {
    const pdfItems = document.getElementById('pdf-items');
    pdfItems.innerHTML = '';

    pdfFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'pdf-item';
        item.innerHTML = `
            <div class="pdf-info">
                <i class="fas fa-file-pdf"></i>
                <div class="pdf-details">
                    <span class="pdf-name">${file.name}</span>
                    <span class="pdf-meta">${file.size} • ${file.pages} pages</span>
                </div>
            </div>
            <div class="pdf-actions">
                <button class="move-up" ${index === 0 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-up"></i>
                </button>
                <button class="move-down" ${index === pdfFiles.length - 1 ? 'disabled' : ''}>
                    <i class="fas fa-arrow-down"></i>
                </button>
                <button class="remove-pdf">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add event listeners for buttons
        item.querySelector('.move-up').addEventListener('click', () => movePDF(index, -1));
        item.querySelector('.move-down').addEventListener('click', () => movePDF(index, 1));
        item.querySelector('.remove-pdf').addEventListener('click', () => removePDF(index));

        pdfItems.appendChild(item);
    });
}

function movePDF(index, direction) {
    if ((direction === -1 && index > 0) || (direction === 1 && index < pdfFiles.length - 1)) {
        const newIndex = index + direction;
        [pdfFiles[index], pdfFiles[newIndex]] = [pdfFiles[newIndex], pdfFiles[index]];
        [pdfDocs[index], pdfDocs[newIndex]] = [pdfDocs[newIndex], pdfDocs[index]];
        updatePDFList();
    }
}

function removePDF(index) {
    pdfFiles.splice(index, 1);
    pdfDocs.splice(index, 1);
    updatePDFList();
    document.getElementById('merge-btn').disabled = pdfFiles.length < 2;
    if (pdfFiles.length === 0) {
        document.getElementById('pdf-list').style.display = 'none';
    }
}

function initializeButtonHandlers() {
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');

    mergeBtn.addEventListener('click', mergePDFs);
    clearBtn.addEventListener('click', clearAll);
}

function clearAll() {
    pdfFiles = [];
    pdfDocs = [];
    document.getElementById('pdf-list').style.display = 'none';
    document.getElementById('merge-btn').disabled = true;
    updatePDFList();
}

async function mergePDFs() {
    if (pdfFiles.length < 2) {
        alert('Please select at least 2 PDF files to merge.');
        return;
    }

    try {
        const mergeBtn = document.getElementById('merge-btn');
        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Merging...';

        // Create a new jsPDF instance with the first PDF's dimensions
        const firstPage = await pdfDocs[0].getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [viewport.width, viewport.height]
        });

        let isFirstPage = true;

        // Process each PDF
        for (let i = 0; i < pdfDocs.length; i++) {
            const pdfDoc = pdfDocs[i];
            
            // Process each page of the current PDF
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                // Get the page
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1 });

                // Create canvas and render the page
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d', { alpha: false });
                
                // Set canvas dimensions to match PDF page
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Set white background
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, canvas.width, canvas.height);

                // Render PDF page
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    background: 'white'
                }).promise;

                // Add new page with correct dimensions if not first page
                if (!isFirstPage) {
                    pdf.addPage([viewport.width, viewport.height]);
                }

                // Add the page to the PDF with correct dimensions
                try {
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    pdf.addImage(imgData, 'JPEG', 0, 0, viewport.width, viewport.height, '', 'FAST');
                    isFirstPage = false;
                } catch (e) {
                    console.error('Error adding page:', e);
                    throw e;
                }
            }
        }

        // Save the merged PDF with compression disabled for better quality
        pdf.save('merged.pdf', { compress: false });

        // Reset button state
        mergeBtn.disabled = false;
        mergeBtn.innerHTML = '<i class="fas fa-object-group"></i> Merge PDFs';

        // Clear the files after successful merge
        clearAll();
    } catch (error) {
        console.error('Error merging PDFs:', error);
        alert('Error merging PDFs. Please try again.');
        
        // Reset button state
        const mergeBtn = document.getElementById('merge-btn');
        mergeBtn.disabled = false;
        mergeBtn.innerHTML = '<i class="fas fa-object-group"></i> Merge PDFs';
    }
} 
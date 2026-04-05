/**
 * Compresses an image file using HTML5 Canvas.
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options.
 * @param {number} options.maxWidth - Max width of the resulting image.
 * @param {number} options.maxHeight - Max height of the resulting image.
 * @param {number} options.quality - Image quality (0 to 1).
 * @returns {Promise<File>} - A promise that resolves to the compressed File.
 */
export const compressImage = (file, options = { maxWidth: 1200, maxHeight: 1200, quality: 0.7 }) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > options.maxWidth) {
            height *= options.maxWidth / width;
            width = options.maxWidth;
          }
        } else {
          if (height > options.maxHeight) {
            width *= options.maxHeight / height;
            height = options.maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', options.quality);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

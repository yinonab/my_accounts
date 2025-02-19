import { Injectable } from '@angular/core';
import { CLOUDINARY_CONFIG } from '../../app/config';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly cloudName = CLOUDINARY_CONFIG.CLOUD_NAME;
  private readonly uploadPreset = CLOUDINARY_CONFIG.UPLOAD_PRESET;

  constructor() { }

  // פונקציה להעלאת קובץ (תמונה או וידאו) עם תמיכה בלוגים מפורטים
  uploadImage(file: File): Observable<string> {
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';
    const uploadUrl = CLOUDINARY_CONFIG.getUploadUrl(fileType); // ✅ שימוש בפונקציה החדשה
    const startTime = Date.now(); // שמירת זמן התחלה

    console.log(`📂 [UPLOAD START] ${fileType.toUpperCase()} - ${file.name}`);
    console.log(`📏 File size: ${file.size} bytes`);
    console.log(`📝 MIME type: ${file.type}`);
    console.log(`🚀 Uploading to: ${uploadUrl}`);
    console.log(`⏳ Upload started at: ${new Date(startTime).toISOString()}`);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return from(
      fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors', // ✅ תמיכה ב-CORS
      })
        .then((response) => {
          console.log(`🔄 [UPLOAD IN PROGRESS] Server responded with status: ${response.status}`);
          if (!response.ok) {
            console.error(`❌ [UPLOAD ERROR] ${fileType.toUpperCase()} upload failed: ${response.status} - ${response.statusText}`);
            throw new Error(`${fileType} upload failed: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000; // חישוב משך העלאה

          if (result.secure_url) {
            console.log(`✅ [UPLOAD SUCCESS] ${fileType.toUpperCase()} uploaded successfully!`);
            console.log(`🔗 URL: ${result.secure_url}`);
            console.log(`⏳ Upload duration: ${duration} seconds`);
            console.log(`📦 Full response:`, result);
            return result.secure_url;
          } else {
            console.error(`⚠️ [UPLOAD WARNING] Response missing 'secure_url':`, result);
            throw new Error('Upload response did not include a secure_url.');
          }
        })
        .catch((error) => {
          console.error(`🚨 [UPLOAD FAILURE] ${fileType.toUpperCase()} upload encountered an error: ${error.message}`);
          return Promise.reject(error);
        })
    );
  }
}

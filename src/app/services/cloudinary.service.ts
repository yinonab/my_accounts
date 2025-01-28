import { Injectable } from '@angular/core';
import { CLOUDINARY_CONFIG } from '../../app/config';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CloudinaryService {
  private readonly uploadUrl = CLOUDINARY_CONFIG.UPLOAD_URL;

  constructor() { }

  // פונקציה להעלאת תמונה שמחזירה Observable
  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);

    return from(
      fetch(this.uploadUrl, {
        method: 'POST',
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }
          return response.json();
        })
        .then((result) => result.secure_url)
    );
  }
}
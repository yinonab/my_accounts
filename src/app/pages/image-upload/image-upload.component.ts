import { Component, EventEmitter, Output } from '@angular/core';
import axios from 'axios';
import { CloudinaryService } from '../../services/cloudinary.service';


@Component({
  selector: 'image-upload',
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss'
})
export class ImageUploadComponent {
  @Output() imageUploaded = new EventEmitter<string>(); // אירוע שמחזיר את ה-URL של התמונה
  @Output() uploadError = new EventEmitter<string>(); // אירוע שמחזיר שגיאה
  selectedFile: File | null = null;
  uploadedImageUrl: string | null = null;
  isLoading = false;

  constructor(private cloudinaryService: CloudinaryService) { }

  // פונקציה שנקראת כאשר המשתמש בוחר קובץ
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  // פונקציה שנקראת בעת שליחת הטופס
  onUpload(): void {
    if (!this.selectedFile) return;

    this.isLoading = true; // התחלת טעינה

    this.cloudinaryService.uploadImage(this.selectedFile).subscribe({
      next: (imageUrl) => {
        console.log('Uploaded image URL:', imageUrl);

        // פלט ה-URL החוצה
        this.imageUploaded.emit(imageUrl);
        this.isLoading = false; // סיום טעינה
      },
      error: (err) => {
        console.error('Error uploading the image:', err);
        this.uploadError.emit('Failed to upload the image'); // פלט שגיאה
        this.isLoading = false; // סיום טעינה
      },
    });
  }
}
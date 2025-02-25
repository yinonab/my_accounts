import { Component, EventEmitter, Output } from '@angular/core';
import axios from 'axios';
import { CloudinaryService } from '../../services/cloudinary.service';
import { LoaderService } from '../../services/loaderService/loader.service';


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

  constructor(private cloudinaryService: CloudinaryService, private loaderService: LoaderService) { }

  // פונקציה שנקראת כאשר המשתמש בוחר קובץ
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      this.uploadImage(selectedFile);
    }
  }

  // פונקציה שנקראת בעת שליחת הטופס
  private uploadImage(file: File): void {
    this.isLoading = true; // התחלת טעינה
    this.loaderService.show();

    this.cloudinaryService.uploadImage(file).subscribe({
      next: (imageUrl) => {
        console.log('Uploaded image URL:', imageUrl);
        this.imageUploaded.emit(imageUrl);
        this.isLoading = false; // סיום טעינה
        this.loaderService.hide();
      },
      error: (err) => {
        console.error('Error uploading the image:', err);
        this.uploadError.emit('Failed to upload the image'); // פלט שגיאה
        this.isLoading = false; // סיום טעינה
        this.loaderService.hide();
      },
    });
  }
}
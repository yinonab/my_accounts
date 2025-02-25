// video-upload.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CloudinaryService } from '../../services/cloudinary.service';
import { LoaderService } from '../../services/loaderService/loader.service';

@Component({
  selector: 'video-upload',
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.scss']
})
export class VideoUploadComponent {
  @Output() videoUploaded = new EventEmitter<string>(); // אירוע שמחזיר את ה-URL של הווידאו
  @Output() uploadError = new EventEmitter<string>();   // אירוע שמחזיר שגיאה
  selectedFile: File | null = null;
  uploadedVideoUrl: string | null = null;
  isLoading = false;

  constructor(private cloudinaryService: CloudinaryService, private loaderService: LoaderService) { }

  // בעת בחירת קובץ
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const selectedFile = input.files[0];
      this.uploadVideo(selectedFile);
    }
  }

  private uploadVideo(file: File): void {
    this.isLoading = true;
    this.loaderService.show();

    // קריאה לשירות CloudinaryService עם uploadVideo 
    // (או שאפשר להשתמש באותה פונקציה uploadImage אם היא תומכת בקבצי וידאו)
    this.cloudinaryService.uploadImage(file) // או uploadVideo
      .subscribe({
        next: (videoUrl) => {
          console.log('Uploaded video URL:', videoUrl);
          this.videoUploaded.emit(videoUrl);
          this.isLoading = false;
          this.loaderService.hide();
        },
        error: (err) => {
          console.error('Error uploading the video:', err);
          this.uploadError.emit('Failed to upload the video');
          this.isLoading = false;
          this.loaderService.hide();
        },
      });
  }
}

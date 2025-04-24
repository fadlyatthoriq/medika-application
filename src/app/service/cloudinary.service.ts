import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private cloudName = 'dtqpto227'; // ← Ganti sesuai akunmu
  private uploadPreset = 'profile-picture-users'; // ← Sesuai preset kamu

  constructor() {}

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        formData
      );

      if (response.status === 200) {
        return response.data.secure_url;
      } else {
        throw new Error('Upload failed with status: ' + response.status);
      }
    } catch (error: any) {
      console.error('Error uploading image:', error?.response?.data || error.message);
      throw new Error('Upload failed. Please try again later.');
    }
  }
}

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError, tap, catchError, map } from 'rxjs';
import { User } from '../models/user.model.ts';
import { storageService } from './async-storage.service'; // Replace with your async storage service

export function getAuthToken(): string | null {
  const cookies = document.cookie.split('; ');
  const loginTokenCookie = cookies.find(cookie => cookie.startsWith('loginToken='));
  return loginTokenCookie ? loginTokenCookie.split('=')[1] : null;
}


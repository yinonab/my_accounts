import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, throwError, tap, catchError, map } from 'rxjs';
import { User } from '../models/user.model.ts';
import { storageService } from './async-storage.service'; // Replace with your async storage service
export function getAuthToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('loginToken='))
    ?.split('=')[1];
}

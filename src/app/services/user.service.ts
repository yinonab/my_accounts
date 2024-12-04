import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor() { }

  getUser() {
    return {
      name: "Ochoa Hyde",
      coins: 100,
      moves:[]
      }
  }
}

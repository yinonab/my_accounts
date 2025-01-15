export interface User {
  username: string; // Fix from `name` to `username`
  password: string; // Change type to `string` instead of `number`
  email: string;
  createdAt: Date;
  img: string; // Fix from `imgUrl` to `img`
  _id: string;
  isAdmin?: boolean;
}

export interface Contact {
    name: string;
    lastName?: string;
    email: string;
    img?: string;
    phone: string;
    _id: string;
    birthday: string;
    owner: string;
    facebookToken?: string; // New property
    imageSize?: string;  // חדש
    imageShape?: string;
    additionalInfo?: string; // חדש
}


export interface ContactFilter {
    name: string
}
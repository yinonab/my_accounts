export interface Contact {
    name: string;
    email: string;
    phone: string;
    _id: string;
    birthday: string;
    facebookToken?: string; // New property
}


export interface ContactFilter {
    name: string
}
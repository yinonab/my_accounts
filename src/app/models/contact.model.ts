export interface Contact {
    name: string;
    lastName?: string;
    email: string;
    phone: string;
    _id: string;
    birthday: string;
    owner: string;
    facebookToken?: string; // New property
}


export interface ContactFilter {
    name: string
}
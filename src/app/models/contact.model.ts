export interface Contact {
    _id?: string;
    name: string;
    owner: string;
    fields: { label: string; type: string; value: string }[];
    facebookToken?: string;
}



export interface ContactFilter {
    name: string
}
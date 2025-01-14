import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, from, tap, retry, catchError, take } from 'rxjs';
import { Contact, ContactFilter } from '../models/contact.model';
import { storageService } from './async-storage.service';
import { HttpErrorResponse } from '@angular/common/http';
const ENTITY = 'contact'

@Injectable({
    providedIn: 'root'
})
export class ContactService {

    private _contacts$ = new BehaviorSubject<Contact[]>([])
    public contacts$ = this._contacts$.asObservable()

    private _filterBy$ = new BehaviorSubject<ContactFilter>({ name: '' });
    public filterBy$ = this._filterBy$.asObservable()

    constructor() {
        // Handling Demo Data, fetching from storage || saving to storage 
        // const contacts = JSON.parse(localStorage.getItem(ENTITY) || 'null')
        // if (!contacts || contacts.length === 0) {
        //     localStorage.setItem(ENTITY, JSON.stringify(this._createContacts()))
        // }
        this._loadContactsFromDB();
    }
    private _loadContactsFromDB(): void {
        from(storageService.query<Contact>(ENTITY))
            .pipe(
                tap(contacts => {
                    // Update BehaviorSubject with contacts loaded from the DB
                    this._contacts$.next(this._sort(contacts));
                }),
                catchError(this._handleError)
            )
            .subscribe();
    }

    public loadContacts() {
        return from(storageService.query<Contact>(ENTITY))
            .pipe(
                tap(contacts => {
                    const filterBy = this._filterBy$.value;
                    contacts = contacts.map(contact => ({
                        ...contact,
                        lastName: contact.lastName || '',
                        birthday: contact.birthday || '',
                    }));
                    if (filterBy && filterBy.name) {
                        contacts = this._filter(contacts, filterBy.name)
                    }
                    contacts = contacts.filter(contact => contact.name.toLowerCase().includes(filterBy.name.toLowerCase()))
                    this._contacts$.next(this._sort(contacts))
                }),
                retry(1),
                catchError(this._handleError)
            )
    }


    public deleteContact(id: string) {
        return from(storageService.remove(ENTITY, id))
            .pipe(
                tap(() => {
                    let contacts = this._contacts$.value
                    contacts = contacts.filter(contact => contact._id !== id)
                    this._contacts$.next(contacts)
                }),
                retry(1),
                catchError(this._handleError)
            )
    }

    public saveContact(contact: Contact) {
        return contact._id ? this._updateContact(contact) : this._addContact(contact)
    }

    public setFilterBy(filterBy: ContactFilter) {
        this._filterBy$.next(filterBy)
        this.loadContacts().pipe(take(1)).subscribe()
    }

    public getEmptyContact(): Partial<Contact> {
        return {
            name: '',
            lastName: '',
            email: '',
            phone: ''
        }
    }

    public getById(contactId: string): Observable<Contact> {
        return from(storageService.get<Contact>(ENTITY, contactId))
            .pipe(
                retry(1),
                catchError(this._handleError)
            )
    }

    private _updateContact(contact: Contact) {
        console.log('Updating contact:', contact); // Debug log
        return from(storageService.put<Contact>('contact/edit', contact))
            .pipe(
                tap(updatedContact => {
                    const contacts = this._contacts$.value;
                    this._contacts$.next([
                        ...contacts.map(c => (c._id === updatedContact._id ? updatedContact : c))
                    ]);
                }),
                retry(1),
                catchError(this._handleError)
            );
    }


    private _addContact(contact: Contact) {
        return from(storageService.post(ENTITY, contact))
            .pipe(
                tap(newContact => {
                    const contacts = this._contacts$.value
                    this._contacts$.next([...contacts, newContact])
                }),
                retry(1),
                catchError(this._handleError)
            )
    }

    private _sort(contacts: Contact[]): Contact[] {
        return contacts.sort((a, b) => {
            if (a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase()) {
                return -1;
            }
            if (a.name.toLocaleLowerCase() > b.name.toLocaleLowerCase()) {
                return 1;
            }
            return 0;
        })
    }

    private _filter(contacts: Contact[], term: string) {
        term = term.toLocaleLowerCase()
        return contacts.filter(contact => {
            return contact.name.toLocaleLowerCase().includes(term) ||
                contact.phone.toLocaleLowerCase().includes(term) ||
                contact.email.toLocaleLowerCase().includes(term)
        })
    }

    private _createContacts() {
        const facebookToken = "EAAIUDS5ZCyWoBOy0VhAuRgq8SQ2OUHkhP9ZAxCqXk2PRoclUni48ayN8v5Rt7hzQd9dm8HTZARv03zL7QurEDZA7Ra9lrfQJwxXfsZAFLA04n5KOqxZBsUYJ3q8N39rYI44srl8vOO1t5DEQaq8s3VnoG2i8WqUbjOwu1s78ZAvfntedTP79ZCQDr7TP3MIsPCjQMhVJfeEt0FOsAOK7wwB0CJgFcZCc2iLBNRZCukrGeZCzmlZCxf37YgYjalWfLWwWbNhik0kY8OAZD";

        const contacts = [
            {
                "_id": "5a56640269f443a5d64b32ca",
                "name": "Ochoa Hyde",
                "email": "ochoahyde@renovize.com",
                "phone": "+1 (968) 593-3824",
                "birthday": "1980-03-15",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664025f6ae9aa24a99fde",
                "name": "Hallie Mclean",
                "email": "halliemclean@renovize.com",
                "phone": "+1 (948) 464-2888",
                "birthday": "1992-07-22",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640252d6acddd183d319",
                "name": "Parsons Norris",
                "email": "parsonsnorris@renovize.com",
                "phone": "+1 (958) 502-3495",
                "birthday": "1985-11-12",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402ed1cf349f0b47b4d",
                "name": "Rachel Lowe",
                "email": "rachellowe@renovize.com",
                "phone": "+1 (911) 475-2312",
                "birthday": "1990-06-25",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402abce24c6bfe4699d",
                "name": "Dominique Soto",
                "email": "dominiquesoto@renovize.com",
                "phone": "+1 (807) 551-3258",
                "birthday": "1987-08-14",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402a6499c1d4da9220a",
                "name": "Shana Pope",
                "email": "shanapope@renovize.com",
                "phone": "+1 (970) 527-3082",
                "birthday": "1995-01-03",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402f90ae30e97f990db",
                "name": "Faulkner Flores",
                "email": "faulknerflores@renovize.com",
                "phone": "+1 (952) 501-2678",
                "birthday": "1982-04-19",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664027bae84ef280ffbdf",
                "name": "Holder Bean",
                "email": "holderbean@renovize.com",
                "phone": "+1 (989) 503-2663",
                "birthday": "1989-02-08",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402e3b846c5f6aec652",
                "name": "Rosanne Shelton",
                "email": "rosanneshelton@renovize.com",
                "phone": "+1 (968) 454-3851",
                "birthday": "1993-10-30",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640272c7dcdf59c3d411",
                "name": "Pamela Nolan",
                "email": "pamelanolan@renovize.com",
                "phone": "+1 (986) 545-2166",
                "birthday": "1984-09-12",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664029a8dd82a6178b15f",
                "name": "Roy Cantu",
                "email": "roycantu@renovize.com",
                "phone": "+1 (929) 571-2295",
                "birthday": "1991-12-18",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664028c096d08eeb13a8a",
                "name": "Ollie Christian",
                "email": "olliechristian@renovize.com",
                "phone": "+1 (977) 419-3550",
                "birthday": "1983-05-04",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664026c53582bb9ebe9d1",
                "name": "Nguyen Walls",
                "email": "nguyenwalls@renovize.com",
                "phone": "+1 (963) 471-3181",
                "birthday": "1990-07-20",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640298ab77236845b82b",
                "name": "Glenna Santana",
                "email": "glennasantana@renovize.com",
                "phone": "+1 (860) 467-2376",
                "birthday": "1986-01-15",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640208fba3e8ecb97305",
                "name": "Malone Clark",
                "email": "maloneclark@renovize.com",
                "phone": "+1 (818) 565-2557",
                "birthday": "1988-03-11",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a566402abb3146207bc4ec5",
                "name": "Floyd Rutledge",
                "email": "floydrutledge@renovize.com",
                "phone": "+1 (807) 597-3629",
                "birthday": "1981-11-07",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640298500fead8cb1ee5",
                "name": "Grace James",
                "email": "gracejames@renovize.com",
                "phone": "+1 (959) 525-2529",
                "birthday": "1994-02-17",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a56640243427b8f8445231e",
                "name": "Tanner Gates",
                "email": "tannergates@renovize.com",
                "phone": "+1 (978) 591-2291",
                "birthday": "1982-06-30",
                "facebookToken": facebookToken
            },
            {
                "_id": "5a5664025c3abdad6f5e098c",
                "name": "Lilly Conner",
                "email": "lillyconner@renovize.com",
                "phone": "+1 (842) 587-3812",
                "birthday": "1985-08-25",
                "facebookToken": facebookToken
            }
        ];
        return contacts;
    }


    private _handleError(err: HttpErrorResponse) {
        console.log('err:', err)
        return throwError(() => err)
    }
}

function _getRandomId(length = 8): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            characters.length));
    }
    return result;
}

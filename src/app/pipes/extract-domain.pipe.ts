import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'extractDomain'
})
export class ExtractDomainPipe implements PipeTransform {
    transform(value: string): string {
        if (!value) return '';

        // ביטוי רגולרי לחילוץ שם הדומיין בין www. ל- .co
        const urlRegex = /(https?:\/\/)?(www\.)?([^\/.]+)\.co/;
        const match = value.match(urlRegex);

        if (match) {
            const domain = match[3]; // מחלץ את שם הדומיין בלבד
            return `<a href="${value}" target="_blank" rel="noopener noreferrer">${domain}</a>`;
        }

        return value; // במקרה שאין התאמה, מחזירים את המחרוזת המקורית
    }
}

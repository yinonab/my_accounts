import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'linkify'
})
export class LinkifyPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;

    // Regex לזיהוי והמרת לינקים לקליקביליים
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return value.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { parseCountries } from '../shared/country';
import type { Country } from '../shared/country.model';
import { contentGet } from './content-request';

@Injectable({ providedIn: 'root' })
export class CountryContentApi {
  private readonly http = inject(HttpClient);

  /** The published countries, sorted by `sortOrder`, with only the attributes the app uses. */
  list(): Observable<Country[]> {
    return contentGet(this.http, 'countries', {
      sort: 'sortOrder:asc',
      'fields[0]': 'code',
      'fields[1]': 'name',
      'fields[2]': 'currencyCode',
      'fields[3]': 'locale',
      'fields[4]': 'sortOrder',
      'pagination[pageSize]': '100',
    }).pipe(map(parseCountries));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { parseTerms } from '../shared/terms';
import type { Terms } from '../shared/terms.model';
import { contentGet } from './content-request';

const FIELDS = ['title', 'body', 'publishedAt'];

@Injectable({ providedIn: 'root' })
export class TermsApi {
  private readonly http = inject(HttpClient);

  /** One request per call: the most recent published terms of the country, or `null` (spec 7.2). */
  load(countryCode: string): Observable<Terms | null> {
    const params: Record<string, string> = {
      'filters[country][code][$eq]': countryCode,
      'sort[0]': 'publishedAt:desc',
      'pagination[pageSize]': '10',
    };
    FIELDS.forEach((name, i) => (params[`fields[${i}]`] = name));
    return contentGet(this.http, 'terms', params).pipe(map(parseTerms));
  }
}

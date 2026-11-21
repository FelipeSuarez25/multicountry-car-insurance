import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { parseFieldConfigs } from '../shared/field-config';
import type { FieldConfig } from '../shared/field-config.model';
import { contentGet } from './content-request';

@Injectable({ providedIn: 'root' })
export class FormFieldApi {
  private readonly http = inject(HttpClient);

  /** One request per country, filtered by the published country code (ADR-0001). */
  list(countryCode: string): Observable<FieldConfig[]> {
    return contentGet(this.http, 'form-fields', {
      'filters[country][code][$eq]': countryCode,
      'populate[options]': 'true',
      'populate[rules]': 'true',
      sort: 'sortOrder:asc',
      'pagination[pageSize]': '100',
    }).pipe(map(parseFieldConfigs));
  }
}

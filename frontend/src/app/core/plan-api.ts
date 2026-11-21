import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { parsePlans } from '../shared/plan';
import type { Plan } from '../shared/plan.model';
import { contentGet } from './content-request';

const FIELDS = ['key', 'name', 'shortDescription', 'basePrice', 'sortOrder', 'isRecommended', 'isActive'];

@Injectable({ providedIn: 'root' })
export class PlanApi {
  private readonly http = inject(HttpClient);

  /** One request per country: published, active plans, only the attributes the page uses (spec 7.2). */
  list(countryCode: string): Observable<Plan[]> {
    const params: Record<string, string> = {
      'filters[country][code][$eq]': countryCode,
      'filters[isActive][$eq]': 'true',
      'populate[coverages][fields][0]': 'label',
      'populate[benefits][fields][0]': 'label',
      'sort[0]': 'sortOrder:asc',
      'sort[1]': 'key:asc',
      'pagination[pageSize]': '100',
    };
    FIELDS.forEach((name, i) => (params[`fields[${i}]`] = name));
    return contentGet(this.http, 'plans', params).pipe(map(parsePlans));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpRequest, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class PhpService {
  url: string = "http://localhost/public_html/";
  //url: string = "https://bloggersguild.cf/";
  constructor(private http: HttpClient) { }

  query(url: string, params: any): Observable<Object> {
    return this.http.get(this.url + url, { params: params });
  }
  post(url: string, params: any): Observable<Object> {
    let body = new HttpParams;
    for (const key of Object.keys(params)) {
      body = body.append(key, params[key]);
    }
    return this.http.post(this.url + url, body, {
      headers: new HttpHeaders({ "Content-Type": "application/x-www-form-urlencoded" })
    });
  }
  upload(url: string, formData: any): Observable<Object> {
    let fd = new FormData;
    for (const key of Object.keys(formData)) {
      fd.append(key, formData[key]);
    }
    let params = new HttpParams();
    const req = new HttpRequest('POST', this.url + url, fd, { params: params, reportProgress: true });
    return this.http.request(req);
    //return this.http.post(this.url + url, fd, { reportProgress: true,observe:'events' });
  }
}
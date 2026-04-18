import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { TopHeaderComponent } from './components/top-header/top-header';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, TopHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(public auth: AuthService) {}
}

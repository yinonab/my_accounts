import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ContactIndexComponent } from './pages/contact-index/contact-index.component';
import { ContactDetailsComponent } from './pages/contact-details/contact-details.component';
import { contactResolver } from './resolvers/contact.resolver';
import { ChartsComponent } from './pages/charts/charts.component';
import { ContactEditComponent } from './pages/contact-edit/contact-edit.component';
import { LoginSignupComponent } from './cmps/login-sign-up/login-sign-up.component';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'contact',
    component: ContactIndexComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'edit', // Create new contact
        component: ContactEditComponent,
        canActivate: [authGuard],
      },
      {
        path: 'edit/:id', // Edit existing contact
        component: ContactEditComponent,
        resolve: { contact: contactResolver },
        canActivate: [authGuard],
      }
    ]
  },
  {
    path: 'contact/:id',
    component: ContactDetailsComponent,
    outlet: 'modal', // Define this as a modal outlet
    resolve: { contact: contactResolver },
    canActivate: [authGuard]
  },
  {
    path: 'chart',
    component: ChartsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'login', // Route for Login
    component: LoginSignupComponent
  },
  {
    path: 'signup', // Route for Signup
    component: LoginSignupComponent
  },
  {
    path: '',
    component: HomePageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}


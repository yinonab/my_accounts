import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ContactIndexComponent } from './pages/contact-index/contact-index.component';
import { ContactDetailsComponent } from './pages/contact-details/contact-details.component';
import { contactResolver } from './resolvers/contact.resolver';
//import { ChartsComponent } from './pages/charts/charts.component';
import { ContactEditComponent } from './pages/contact-edit/contact-edit.component';
import { LoginSignupComponent } from './cmps/login-sign-up/login-sign-up.component';
import { authGuard } from './guards/auth.guard';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { UserListComponent } from './cmps/user/user-list/user-list.component';
import { UserIndexComponent } from './cmps/user/user-index/user-index.component';
import { UserDetailsComponent } from './cmps/user/user-details/user-details.component';
import { userResolver } from './resolvers/user.resolver';

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
  // {
  //   path: 'chart',
  //   component: ChartsComponent,
  //   canActivate: [authGuard],
  // },
  {
    path: 'login', // Route for Login
    component: LoginSignupComponent
  },
  {
    path: 'signup', // Route for Signup
    component: LoginSignupComponent
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent
  },
  {
    path: 'users',
    component: UserIndexComponent,  // ✅ עמוד רשימת המשתמשים כחלק מהאפליקציה הראשית
    canActivate: [authGuard]
  },
  {
    path: 'user/:id',
    component: UserDetailsComponent,
    outlet: 'modal', // הגדרת הנתיב כמודל
    resolve: { user: userResolver }, // שימוש ברזולבר
    canActivate: [authGuard]
  },
  {
    path: '',
    component: HomePageComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: false })],
  exports: [RouterModule]
})
export class AppRoutingModule { }


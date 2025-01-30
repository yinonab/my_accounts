import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app-root/app.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { ContactIndexComponent } from './pages/contact-index/contact-index.component';
import { ContactDetailsComponent } from './pages/contact-details/contact-details.component';
import { ContactListComponent } from './cmps/contact/contact-list/contact-list.component';
import { ContactPreviewComponent } from './cmps/contact/contact-preview/contact-preview.component';
import { HeaderComponent } from './cmps/app-header/app-header.component';
import { ChartsComponent } from './pages/charts/charts.component';
import { ContactFilterComponent } from './cmps/contact/contact-filter/contact-filter.component';
import { ContactEditComponent } from './pages/contact-edit/contact-edit.component';
import { NgChartsModule } from 'ng2-charts';
import { ModalComponent } from './shared/modal/modal.component';
import { LoaderComponent } from './loader/loader.component';
import { LoginSignupComponent } from './cmps/login-sign-up/login-sign-up.component';
import { EmailValidatorDirective } from './directives/email-validator.directive';
import { MsgComponent } from './cmps/msg/msg.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EvStopDirective } from './directives/ev-stop.directive';
import { EmailTakenValidatorDirective } from './directives/EmailTakenValidatorDirective';
import { PasswordValidatorDirective } from './directives/PasswordValidatorDirective';
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { ClickOutsideCaptureDirective } from './directives/click-outside-capture-directive.directive';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { ImageUploadComponent } from './pages/image-upload/image-upload.component';
import { UserIndexComponent } from './cmps/user/user-index/user-index.component';
import { UserListComponent } from './cmps/user/user-list/user-list.component';
import { UserPreviewComponent } from './cmps/user/user-preview/user-preview.component';
import { UserDetailsComponent } from './cmps/user/user-details/user-details.component';
import { UserFilterComponent } from './cmps/user/user-filter/user-filter.component';
import { FullNameValidatorDirective } from './directives/full-name-validator.directive';



@NgModule({
  declarations: [
    AppComponent,
    HomePageComponent,
    ContactIndexComponent,
    ContactDetailsComponent,
    ContactListComponent,
    ContactPreviewComponent,
    HeaderComponent,
    ChartsComponent,
    ContactFilterComponent,
    ContactEditComponent,
    ModalComponent,
    LoaderComponent,
    LoginSignupComponent,
    EmailValidatorDirective,
    MsgComponent,
    EvStopDirective,
    EmailTakenValidatorDirective,
    PasswordValidatorDirective,
    ClickOutsideDirective,
    PasswordValidatorDirective,
    ClickOutsideCaptureDirective,
    PrivacyPolicyComponent,
    ImageUploadComponent,
    UserIndexComponent,
    UserListComponent,
    UserPreviewComponent,
    UserDetailsComponent,
    UserFilterComponent,
    FullNameValidatorDirective


  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgChartsModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

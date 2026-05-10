import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  isLoading = false;
  private roleSub!: Subscription;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['student', Validators.required],
      // Conditional fields initialized without validators
      major: [''],
      studentBatch: [''],
      department: [''],
      facultyRank: ['']
    });

    // Run once to set initial validation state based on default 'student' value
    this.updateRoleValidators('student');

    // Listen for role changes to dynamically update validation requirements
    this.roleSub = this.registerForm.get('role')!.valueChanges.subscribe(role => {
      this.updateRoleValidators(role);
    });
  }

  ngOnDestroy() {
    if (this.roleSub) {
      this.roleSub.unsubscribe();
    }
  }

  private updateRoleValidators(role: string) {
    const studentControls = ['major', 'studentBatch'];
    const facultyControls = ['department', 'facultyRank'];

    if (role === 'student') {
      studentControls.forEach(ctrl => this.registerForm.get(ctrl)?.setValidators([Validators.required]));
      facultyControls.forEach(ctrl => {
        this.registerForm.get(ctrl)?.clearValidators();
        this.registerForm.get(ctrl)?.reset();
      });
    } else if (role === 'faculty') {
      facultyControls.forEach(ctrl => this.registerForm.get(ctrl)?.setValidators([Validators.required]));
      studentControls.forEach(ctrl => {
        this.registerForm.get(ctrl)?.clearValidators();
        this.registerForm.get(ctrl)?.reset();
      });
    }

    // Trigger re-evaluation of the form's validity state
    studentControls.concat(facultyControls).forEach(ctrl => {
      this.registerForm.get(ctrl)?.updateValueAndValidity();
    });
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    
    try {
      await this.authService.register(this.registerForm.value).toPromise();
      this.registerForm.reset();
      this.showToast('Registration successful! Please log in.', 'success');
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (error: any) {
      this.showToast(error?.error?.message || 'Registration failed. Please try again.', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  async showToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
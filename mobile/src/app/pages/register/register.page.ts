import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup;
  passwordStrength = 0;
  passwordStrengthLabel = 'Weak';
  passwordStrengthColor = '#FF3B30';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authService: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['student', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      // Dynamic Fields Conditional Setup
      major: [''],
      batch: [''],
      department: [''],
      rank: ['']
    }, { validators: this.passwordMatchValidator });

    // Handle shifting validation criteria depending on checked profile role status
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      this.updateConditionalValidators(role);
    });

    // Run first initialization alignment
    this.updateConditionalValidators('student');

    // Monitor password entry engine for tracking metric meters
    this.registerForm.get('password')?.valueChanges.subscribe(pass => {
      this.checkPasswordStrength(pass);
    });
  }

  passwordMatchValidator(g: FormGroup) {
    const pass = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  updateConditionalValidators(role: 'student' | 'faculty') {
    const studentFields = ['major', 'batch'];
    const facultyFields = ['department', 'rank'];

    if (role === 'student') {
      studentFields.forEach(f => this.registerForm.get(f)?.setValidators([Validators.required]));
      facultyFields.forEach(f => {
        this.registerForm.get(f)?.clearValidators();
        this.registerForm.get(f)?.setValue('');
      });
    } else {
      facultyFields.forEach(f => this.registerForm.get(f)?.setValidators([Validators.required]));
      studentFields.forEach(f => {
        this.registerForm.get(f)?.clearValidators();
        this.registerForm.get(f)?.setValue('');
      });
    }
    studentFields.concat(facultyFields).forEach(f => this.registerForm.get(f)?.updateValueAndValidity({ emitEvent: false }));
  }

  checkPasswordStrength(pass: string) {
    if (!pass) {
      this.passwordStrength = 0;
      this.passwordStrengthLabel = 'Empty';
      return;
    }
    let score = 0;
    if (pass.length >= 6) score += 30;
    if (pass.length >= 10) score += 20;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;

    this.passwordStrength = score;
    if (score < 50) {
      this.passwordStrengthLabel = 'Weak';
      this.passwordStrengthColor = '#FF3B30';
    } else if (score < 80) {
      this.passwordStrengthLabel = 'Medium';
      this.passwordStrengthColor = '#FFCC00';
    } else {
      this.passwordStrengthLabel = 'Strong';
      this.passwordStrengthColor = '#34C759';
    }
  }

  setRole(selectedRole: 'student' | 'faculty') {
    this.registerForm.get('role')?.setValue(selectedRole);
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creating account...',
      spinner: 'crescent',
      mode: 'ios'
    });
    await loading.present();

    this.api.post<{ access_token: string, message: string, userId: string }>('/auth/register', this.registerForm.value).subscribe({
      next: (res) => {
        loading.dismiss();
        // Task 5: Auto login after registration success block
        this.authService.setToken(res.access_token);
        this.navCtrl.navigateRoot('/tabs/jobs', { animated: true, animationDirection: 'forward' });
      },
      error: async (err) => {
        loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: err.error?.message || 'Registration failed. Try changing registration email context parameters.',
          duration: 3500,
          color: 'danger',
          position: 'bottom',
          mode: 'ios'
        });
        toast.present();
      }
    });
  }

  goBack() { this.navCtrl.back(); }
}
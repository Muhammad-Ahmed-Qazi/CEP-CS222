import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage implements OnInit {
  @ViewChildren('otpInput') otpInputs!: QueryList<any>;

  currentStep: 1 | 2 | 3 = 1;
  emailForm!: FormGroup;
  otpForm!: FormGroup;
  passwordForm!: FormGroup;

  devModeOtp: string | null = null;
  passwordStrength = 0;
  passwordStrengthColor = '#FF3B30';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  ngOnInit() {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      digits: this.fb.array(Array(6).fill('').map(() => new FormControl('', [Validators.required, Validators.pattern('^[0-9]$')])))
    });

    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.passwordForm.get('password')?.valueChanges.subscribe(v => this.checkStrength(v));
  }

  get otpDigitsArray() {
    return this.otpForm.get('digits') as FormArray;
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onOtpInput(event: any, index: number) {
    const val = event.target.value;
    // Auto advance layout focus pipeline structure implementation
    if (val && index < 5) {
      const inputs = this.otpInputs.toArray();
      inputs[index + 1].setFocus();
    }
  }

  onOtpKeyUp(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.otpDigitsArray.at(index).value && index > 0) {
      const inputs = this.otpInputs.toArray();
      inputs[index - 1].setFocus();
    }
  }

  checkStrength(pass: string) {
    if (!pass) { this.passwordStrength = 0; return; }
    let score = 20;
    if (pass.length >= 8) score += 30;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    this.passwordStrength = score;
    this.passwordStrengthColor = score < 50 ? '#FF3B30' : score < 80 ? '#FFCC00' : '#34C759';
  }

  async sendVerificationCode() {
    if (this.emailForm.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Sending code...', mode: 'ios' });
    await loading.present();

    this.api.post<{ message: string, otp: string }>('/auth/forgot-password', { email: this.emailForm.value.email }).subscribe({
      next: (res) => {
        loading.dismiss();
        this.devModeOtp = res.otp; // Capture reference token payload parameter array string
        this.currentStep = 2;
      },
      error: async (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Error processing email address request.', 'danger');
      }
    });
  }

  verifyVerificationCode() {
    if (this.otpForm.invalid) {
      this.showToast('Please enter full 6 digits verification sequence structure.', 'warning');
      return;
    }
    // Proceed step sequence shifting layout natively
    this.currentStep = 3;
  }

  async resetUserPassword() {
    if (this.passwordForm.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Resetting password...', mode: 'ios' });
    await loading.present();

    const payload = {
      email: this.emailForm.value.email,
      otp: this.otpForm.value.digits.join(''),
      newPassword: this.passwordForm.value.password
    };

    this.api.post('/auth/reset-password', payload).subscribe({
      next: async () => {
        loading.dismiss();
        this.showToast('Password updated successfully! Redirecting...', 'success');
        setTimeout(() => {
          this.navCtrl.navigateRoot('/login', { animated: true, animationDirection: 'back' });
        }, 2000);
      },
      error: async (err) => {
        loading.dismiss();
        this.showToast(err.error?.message || 'Token payload timeout or mismatch crash.', 'danger');
      }
    });
  }

  async showToast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, color, duration: 2500, mode: 'ios' });
    t.present();
  }

  goBack() {
    if (this.currentStep > 1) {
      this.currentStep = (this.currentStep - 1) as any;
    } else {
      this.navCtrl.back();
    }
  }
}
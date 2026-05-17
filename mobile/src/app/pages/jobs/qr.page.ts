import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button></ion-back-button></ion-buttons>
        <ion-title>Scan to Collect</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <div class="qr-card glass-card ion-padding" *ngIf="qrData">
        <h3>Kiosk: {{ qrData.locationName }}</h3>
        <h1 class="cyan-text">BIN {{ qrData.binId }}</h1>
        
        <!-- Generated QR Graphic -->
        <div class="canvas-wrapper">
          <canvas #qrCanvas></canvas>
        </div>
        
        <!-- 💡 Fallback Text Verification Token -->
        <div class="token-container" *ngIf="qrData.qrToken">
          <span class="token-label">Collection Code</span>
          <div class="token-string">{{ qrData.qrToken }}</div>
        </div>
        
        <p class="instructions">Hold this code in front of the kiosk scanner to unlock your bin and collect your documents.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .qr-card { 
      margin-top: 40px; 
    } 
    .cyan-text { 
      color: var(--ion-color-primary); 
      font-size: 32px; 
      font-weight: 900;
    } 
    .canvas-wrapper { 
      background: #fff; 
      padding: 16px; 
      border-radius: 12px; 
      display: inline-block; 
      margin: 20px 0 10px 0;
    }
    /* 💡 Stylized container wrapping the token string */
    .token-container {
      background: rgba(var(--ion-color-step-100-rgb, 240, 240, 240), 0.15);
      border: 1px dashed rgba(var(--ion-color-primary-rgb, 0, 0, 0), 0.3);
      border-radius: 8px;
      padding: 10px;
      margin: 15px auto;
      max-width: 280px;
    }
    .token-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--ion-color-step-600, #666);
      margin-bottom: 4px;
    }
    .token-string {
      font-family: 'Courier New', Courier, monospace;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      color: var(--ion-color-dark, #000);
    }
    .instructions {
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.4;
    }
  `],
  standalone: false
})
export class QrPage implements OnInit {
  @ViewChild('qrCanvas', { static: false }) canvas!: ElementRef;
  qrData: any;

  constructor(private api: ApiService, private route: ActivatedRoute) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.api.get(`/jobs/${id}/qr`).subscribe(res => {
      this.qrData = res;
      setTimeout(() => this.renderQR(), 100); // Wait for view to init
    });
  }

  renderQR() {
    if (this.canvas && this.qrData?.qrToken) {
      QRCode.toCanvas(this.canvas.nativeElement, this.qrData.qrToken, { width: 250, margin: 2 });
    }
  }
}
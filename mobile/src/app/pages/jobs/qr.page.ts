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
        
        <div class="canvas-wrapper">
          <canvas #qrCanvas></canvas>
        </div>
        
        <p class="instructions">Hold this code in front of the kiosk scanner to unlock your bin and collect your documents.</p>
      </div>
    </ion-content>
  `,
  styles: [`.qr-card { margin-top: 40px; } .cyan-text { color: var(--ion-color-primary); font-size: 32px; font-weight: 900;} .canvas-wrapper { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin: 20px 0;}`],
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
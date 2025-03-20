import { NgIf } from "@angular/common";
import {
  Component,
  ViewChild,
  ElementRef,
  OnInit,
  inject,
  computed,
  signal,
  effect,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  Orientation,
  OrientationMode,
  OrientationService,
} from "./services/orientation.service";
import { ToggleSwitchComponent } from "./toggle-switch/toggle-switch.component";
// import { FFmpeg } from '@ffmpeg/ffmpeg';
// import { fetchFile, toBlobURL } from '@ffmpeg/util';
// https://github.com/ffmpegwasm/ffmpeg.wasm/blob/main/apps/angular-app/package.json
@Component({
  selector: "app-root",
  imports: [RouterOutlet, NgIf, ToggleSwitchComponent],
  providers: [OrientationService],
  template: `
    <div class="container">
      <h2 class="text-3xl text-gray-800 mb-6">Mobile MediaRecorder</h2>
      <button
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        (click)="enterFullscreen()"
      >
        Record Video
      </button>

      <div class="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Options</h2>
        <app-toggle-switch
          [options]="['Auto', 'Toggle']"
          [optionLabels]="['Automatic Mode', 'Toggle Mode']"
          [value]="selectedMode()"
          (valueChange)="onModeChange($event)"
        >
        </app-toggle-switch>

        <app-toggle-switch
          [disabled]="!isToggleMode()"
          [options]="['Portrait', 'Landscape']"
          [optionLabels]="['Portrait', 'Landscape']"
          [value]="selectedOrientation()"
          (valueChange)="onOrientationChange($event)"
        >
        </app-toggle-switch>

        <p clsas="pt-2">Orientation: {{ service.orientation() }}</p>
      </div>

      <div
        *ngIf="showFullscreen"
        class="fullscreen-container"
        #fullscreenContainer
      >
        <video #videoElement autoplay></video>
        <button (click)="exitFullscreen()">{{ "Stop Recording" }}</button>
      </div>
    </div>
    <router-outlet />
  `,
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements OnInit {
  title = "Mobile MediaRecorder";
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  isRecording = false;
  private videoBitsPerSecond = 2_500_000;

  showFullscreen = false;
  private stream: MediaStream | null = null;

  readonly service = inject(OrientationService);

  selectedMode = computed(() =>
    this.service.mode() === OrientationMode.Toggle ? "Toggle" : "Auto"
  );
  selectedOrientation = computed(() =>
    this.service.orientation() === Orientation.Landscape
      ? "Landscape"
      : "Portrait"
  );
  isToggleMode = computed(() => this.service.mode() === OrientationMode.Toggle);

  // ffmpeg = new FFmpeg();
  @ViewChild("fullscreenContainer") fullscreenContainer!: ElementRef;

  constructor() {}
  async ngOnInit() {
    // console.log("FFmpeg loading!");
    //  try {
    //   const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';
    //   this.ffmpeg.on('log', ({ message }) => {
    //       this.message = message;
    //       console.log(message);
    //   });
    //   await this.ffmpeg.load({
    //     coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    //     wasmURL: await toBlobURL(
    //       `${baseURL}/ffmpeg-core.wasm`,
    //       'application/wasm',
    //     ),
    //     workerURL: await toBlobURL(
    //       `${baseURL}/ffmpeg-core.worker.js`,
    //       'text/javascript',
    //     ),
    //   });
    //    console.log("FFmpeg loaded successfully");
    //  } catch (err) {
    //    console.error("Error loading FFmpeg:", err);
    //  }
    // this.handleOrientationChange(); // Initial check
  }

  ngOnDestroy() {}

  onModeChange(newMode: string) {
    return this.service.setMode(
      newMode === "Toggle" ? OrientationMode.Toggle : OrientationMode.Auto
    );
  }

  onOrientationChange(newOrientation: string) {
    this.service.setOrientation(
      newOrientation === "Portrait"
        ? Orientation.Portrait
        : Orientation.Landscape
    );

    if (this.isRecording) {
      this.stopRecording();
    }

    this.logDimensions();
  }

  enterFullscreen() {
    this.showFullscreen = true;
    setTimeout(() => {
      if (this.fullscreenContainer.nativeElement.requestFullscreen) {
        this.fullscreenContainer.nativeElement.requestFullscreen();
        this.startRecording();
      }
    }, 500);
  }

  exitFullscreen() {
    this.stopRecording();
    this.isRecording = false;

    if (document.exitFullscreen) {
      document.exitFullscreen();
      this.showFullscreen = false;
    }
  }

  logDimensions() {
    const d = this.getVideoOptions();
    console.log(
      "IsLandscape: " +
        this.service.isLandscape() +
        " Width: " +
        d.width.ideal +
        " Height: " +
        d.height.ideal +
        " Ar: " +
        d.aspectRatio
    );
  }

  getVideoOptions() {
    const width = { ideal: 1920, min: 640, max: 1920 };
    const height = { ideal: 1080, min: 480, max: 1080 };
    const aspectRatio = width.ideal / height.ideal;
    // environment is for back camera and user is for front camera
    const facingMode = "environment";
    return {
      width: this.service.isLandscape() ? height : width,
      height: this.service.isLandscape() ? width : height,
      aspectRatio,
      facingMode,
    };
  }

  async startRecording() {
    this.isRecording = true;
    this.recordedChunks = [];

    this.logDimensions();

    let opt: any;
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      opt = { mimeType: "video/webm; codecs=vp9" };
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
      opt = { mimeType: "video/webm; codecs=vp8" };
    } else {
      // ...
    }

    console.log(opt);

    const videoOptions = this.getVideoOptions();
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: videoOptions.width.ideal,
          max: videoOptions.width.max,
          min: videoOptions.width.min,
        },
        height: {
          ideal: videoOptions.height.ideal,
          max: videoOptions.height.max,
          min: videoOptions.height.min,
        },
        aspectRatio: { ideal: videoOptions.aspectRatio },
        facingMode: { ideal: videoOptions.facingMode },
      },
      audio: true,
    });

    const videoTracks = this.stream.getVideoTracks();
    if (videoTracks.length > 0) {
      const settings = videoTracks[0].getSettings();
      console.log(
        `Actual video resolution: ${settings.width}x${settings.height}`
      );

      const capabilities = videoTracks[0].getCapabilities();
      console.log(
        "Supported resolutions:",
        capabilities.width,
        capabilities.height
      );
    }

    const options = {
      mimeType: opt.mimeType,
      videoBitsPerSecond: this.videoBitsPerSecond,
    };

    const videoElement = document.querySelector("video");
    if (videoElement) {
      videoElement.srcObject = this.stream;
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    this.mediaRecorder.onstop = this.saveRecording.bind(this);
    this.mediaRecorder.start();
    this.isRecording = true;
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;

    const videoElement = document.querySelector("video");
    if (videoElement && videoElement.srcObject) {
      const stream = videoElement.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoElement.srcObject = null;
    }
  }

  uniqueId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async saveRecording() {
    const blob = new Blob(this.recordedChunks);
    // const data = await this.rotateVideoLandscape(blob);
    // const rotatedBlob = new Blob([data.buffer], { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `video${this.uniqueId()}.webm`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    this.resetRecorder();
  }

  // async rotateVideoLandscape(blob: Blob) {
  //   console.log("1")
  //   this.ffmpeg.writeFile('input.webm', await fetchFile(blob));
  //   console.log("2")

  //   // await this.ffmpeg.exec(['-i', 'input.webm', '-vf', 'transpose=1', 'output.webm']);
  //   await this.ffmpeg.exec(['-i', 'input.webm', 'output.webm']);
  //   console.log("3")

  //   const fileData = await this.ffmpeg.readFile('output.webm');
  //   console.log("4")

  //   return new Uint8Array(fileData as ArrayBuffer);
  // }

  private resetRecorder() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

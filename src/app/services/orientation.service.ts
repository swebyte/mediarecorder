import { computed, Injectable, OnDestroy, signal } from "@angular/core";

export enum Orientation {
  Landscape = "landscape",
  Portrait = "portrait",
}

export enum OrientationMode {
  Auto,
  Toggle,
}

@Injectable()
export class OrientationService implements OnDestroy {
  private _orientation = signal<Orientation>(Orientation.Landscape);
  orientation = this._orientation.asReadonly();
  private _mode = signal<OrientationMode>(OrientationMode.Auto);
  mode = this._mode.asReadonly();
  private eventListener: any;
  private alpha = 0;
  private beta = 0;
  private gamma = 0;

  isLandscape = computed(() => this.orientation() === Orientation.Landscape);

  constructor() {
    this.eventListener = window.addEventListener("deviceorientation", (event) =>
      this.onDeviceOrientation(event)
    );

    setInterval(() => {
      if (this._mode() !== OrientationMode.Auto) return;

      const orientationStr =
        this.orientation() === Orientation.Landscape ? "landscape" : "portrait";
      console.log(
        "z: " +
          this.alpha +
          " x: " +
          this.beta +
          " y: " +
          this.gamma +
          "iL: " +
          orientationStr
      );
    }, 1000);
  }

  private onDeviceOrientation(event: DeviceOrientationEvent) {
    if (this._mode() !== OrientationMode.Auto) return;

    this.alpha = Math.abs(Math.round(event.alpha ?? 0)); // Rotation around the z-axis
    this.beta = Math.abs(Math.round(event.beta ?? 0)); // Rotation around the x-axis
    this.gamma = Math.abs(Math.round(event.gamma ?? 0)); // Rotation around the y-axis

    if (this.gamma > 45 && (this.beta < 30 || this.beta > 150)) {
      this._orientation.set(Orientation.Landscape);
    } else if (this.beta > 45 && this.beta < 135) {
      this._orientation.set(Orientation.Portrait);
    }
  }

  setOrientation(orientation: Orientation) {
    if (this._mode() === OrientationMode.Toggle) {
      this._orientation.set(orientation);
    }
  }

  setMode(mode: OrientationMode) {
    this._mode.set(mode);
  }

  ngOnDestroy(): void {
    window.removeEventListener("deviceorientation", this.eventListener);
  }
}

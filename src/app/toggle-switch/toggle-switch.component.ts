import { Component, input, output, signal } from "@angular/core";

@Component({
  selector: "app-toggle-switch",
  template: `
    <div>
      @for(option of options(); track option; let index = $index){
      <label>
        <input
          [disabled]="disabled()"
          type="radio"
          [name]="uniqueName"
          [checked]="value() === option"
          (change)="setChecked(option)"
        />
        {{ optionLabels()[index] }}
      </label>
      }
    </div>
  `,
  styleUrls: ["./toggle-switch.component.scss"],
})
export class ToggleSwitchComponent {
  options = input.required<any[]>();
  optionLabels = input.required<string[]>();
  value = input.required<any>();
  valueChange = output<any>();
  disabled = input<boolean>(false);

  uniqueName = `toggle-switch-${Math.random().toString(36).substr(2, 9)}`;

  setChecked(selectedValue: any) {
    this.valueChange.emit(selectedValue);
  }
}
